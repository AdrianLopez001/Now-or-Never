"""
football_data_collector.py
--------------------------
Coletor oficial de partidas usando a API football-data.org v4.

Limites do plano Tier One (Free):
  - 10 requisições por minuto
  - 13 competições disponíveis
  - Dados históricos: até 10 temporadas por liga

Competições disponíveis:
  BSA  - Campeonato Brasileiro Série A
  PL   - Premier League
  BL1  - Bundesliga
  SA   - Serie A (Itália)
  PD   - La Liga
  FL1  - Ligue 1
  PPL  - Primeira Liga (Portugal)
  DED  - Eredivisie
  ELC  - Championship (Inglaterra)
  CL   - UEFA Champions League
  CLI  - Copa Libertadores
  WC   - Copa do Mundo
  EC   - Eurocopa
"""

import os
import sys
import time
import json
import requests
from datetime import datetime, timedelta

# ── Configuração ────────────────────────────────────────────────────────────────
API_KEY = os.environ.get("FOOTBALL_DATA_API_KEY", "")
BASE_URL = "https://api.football-data.org/v4"
HEADERS  = {"X-Auth-Token": API_KEY}

# Plano Free: 10 req/min → 1 req a cada 6 segundos (margem de segurança)
RATE_LIMIT_DELAY = 6.5  # segundos entre requisições

_last_request_time = 0.0


def _get(path: str, params: dict = None) -> dict:
    """Realiza GET com rate limiting automático."""
    global _last_request_time
    elapsed = time.monotonic() - _last_request_time
    if elapsed < RATE_LIMIT_DELAY:
        sleep_time = RATE_LIMIT_DELAY - elapsed
        print(f"  [RateLimit] Aguardando {sleep_time:.1f}s...")
        time.sleep(sleep_time)

    url = f"{BASE_URL}{path}"
    response = requests.get(url, headers=HEADERS, params=params, timeout=15)
    _last_request_time = time.monotonic()

    remaining = response.headers.get("x-requests-available-minute", "?")
    reset_in  = response.headers.get("X-RequestCounter-Reset", "?")
    print(f"  [API] GET {path} → {response.status_code} | "
          f"req restantes/min: {remaining} | reset em: {reset_in}s")

    if response.status_code == 429:
        print("  [RateLimit] Limite atingido! Aguardando 60s...")
        time.sleep(60)
        return _get(path, params)

    response.raise_for_status()
    return response.json()


def fetch_matches(competition: str = "BSA",
                  include_finished: bool = False) -> list[dict]:
    """
    Busca partidas ativas (SCHEDULED/TIMED + opcionalmente IN_PLAY/PAUSED)
    de uma competição.

    Retorna lista de dicionários no formato padrão do sistema Black King:
        {
            "id": int,
            "home": str, "home_logo": str,
            "away": str, "away_logo": str,
            "date": str (ISO-8601),
            "status": "SCHEDULED" | "LIVE",
            "round": str,
            "home_score": int | None,
            "away_score": int | None,
        }
    """
    print(f"\nBuscando partidas de '{competition}' na football-data.org...")

    try:
        data = _get(f"/competitions/{competition}/matches")
    except requests.HTTPError as e:
        print(f"Erro ao buscar partidas: {e}")
        return []

    matches = data.get("matches", [])
    comp_name = data.get("competition", {}).get("name", competition)

    parsed = []
    now = datetime.utcnow()

    for m in matches:
        raw_status = m.get("status", "")

        # Mapeamento de status football-data → sistema interno
        if raw_status in ("SCHEDULED", "TIMED"):
            status = "SCHEDULED"
        elif raw_status in ("IN_PLAY", "PAUSED", "HALFTIME"):
            status = "LIVE"
        elif raw_status == "FINISHED":
            if not include_finished:
                continue
            status = "FINISHED"
        else:
            # CANCELLED, POSTPONED, SUSPENDED → ignorar
            continue

        home_team = m.get("homeTeam", {})
        away_team = m.get("awayTeam", {})

        home_name = home_team.get("name") or home_team.get("shortName") or "Home"
        away_name = away_team.get("name") or away_team.get("shortName") or "Away"

        # Logos: football-data usa campo "crest"
        home_logo = home_team.get("crest") or "https://crests.football-data.org/generic.png"
        away_logo = away_team.get("crest") or "https://crests.football-data.org/generic.png"

        # Scores
        score    = m.get("score", {})
        ft       = score.get("fullTime", {})
        home_score = ft.get("home")
        away_score = ft.get("away")

        # Se ao vivo e o score não está no fullTime, pode estar no halfTime
        if status == "LIVE" and home_score is None:
            ht = score.get("halfTime", {})
            home_score = ht.get("home")
            away_score = ht.get("away")

        # Data da partida
        utc_date = m.get("utcDate", "")
        for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%MZ"):
            try:
                dt = datetime.strptime(utc_date, fmt)
                utc_date = dt.strftime("%Y-%m-%dT%H:%M:00Z")
                break
            except Exception:
                pass

        # Rodada
        matchday = m.get("matchday")
        stage    = m.get("stage", "")
        if matchday:
            round_label = f"Rodada {matchday}"
        elif stage:
            round_label = stage.replace("_", " ").title()
        else:
            round_label = comp_name

        entry = {
            "id":        m["id"],
            "home":      home_name,
            "home_logo": home_logo,
            "away":      away_name,
            "away_logo": away_logo,
            "date":      utc_date,
            "status":    status,
            "round":     round_label,
            "competition": competition,
        }
        if home_score is not None:
            entry["home_score"] = home_score
            entry["away_score"] = away_score

        parsed.append(entry)

    active   = [x for x in parsed if x["status"] in ("SCHEDULED", "LIVE")]
    finished = [x for x in parsed if x["status"] == "FINISHED"]
    print(f"  → {len(active)} ativas | {len(finished)} finalizadas (incluídas: {include_finished})")
    return parsed


def fetch_historical_matches(competition: str = "BSA",
                              seasons: list[int] = None) -> list[dict]:
    """
    Busca partidas históricas FINISHED para enriquecer o dataset de treino.
    Útil para substituir dados simulados por dados reais no collector.py.

    ATENÇÃO: cada temporada = 1 requisição. Com 10 req/min e plano Free,
    use com cuidado. Padrão: temporada atual e a anterior.
    """
    if seasons is None:
        current_year = datetime.now().year
        seasons = [current_year, current_year - 1]

    all_matches = []
    for season in seasons:
        print(f"\nBuscando histórico {competition}/{season}...")
        try:
            data = _get(f"/competitions/{competition}/matches",
                        params={"season": season, "status": "FINISHED"})
            matches = data.get("matches", [])
            print(f"  → {len(matches)} partidas finalizadas em {season}")
            all_matches.extend(matches)
        except requests.HTTPError as e:
            print(f"  Erro ao buscar temporada {season}: {e}")

    return all_matches


def fetch_standings(competition: str = "BSA") -> dict:
    """
    Busca a tabela de classificação atual de uma competição.
    Útil para calcular form e pontos dos times.
    """
    print(f"\nBuscando classificação de '{competition}'...")
    try:
        return _get(f"/competitions/{competition}/standings")
    except requests.HTTPError as e:
        print(f"  Erro ao buscar classificação: {e}")
        return {}


def fetch_team_matches(team_id: int, limit: int = 10) -> list[dict]:
    """
    Busca os últimos N jogos de um time específico (para calcular form).
    """
    print(f"\nBuscando últimos {limit} jogos do time {team_id}...")
    try:
        data = _get(f"/teams/{team_id}/matches",
                    params={"status": "FINISHED", "limit": limit})
        return data.get("matches", [])
    except requests.HTTPError as e:
        print(f"  Erro: {e}")
        return []


def build_team_form_from_standings(standings_data: dict) -> dict[int, dict]:
    """
    Extrai form (forma recente) e força dos times a partir da tabela de classificação.
    Retorna dict: team_id → {"form": float(0-1), "points": int, "played": int, ...}
    """
    team_stats = {}
    standings = standings_data.get("standings", [])

    for group in standings:
        if group.get("type") != "TOTAL":
            continue
        for entry in group.get("table", []):
            team = entry.get("team", {})
            tid  = team.get("id")
            if not tid:
                continue

            played = entry.get("playedGames", 0)
            won    = entry.get("won", 0)
            drawn  = entry.get("draw", 0)
            lost   = entry.get("lost", 0)
            gf     = entry.get("goalsFor", 0)
            ga     = entry.get("goalsAgainst", 0)
            pts    = entry.get("points", 0)

            # form: win rate normalizada (0.0 → 1.0)
            form = (won + 0.5 * drawn) / max(played, 1)
            # xG proxy: média de gols marcados
            xg_avg = gf / max(played, 1)

            team_stats[tid] = {
                "name":   team.get("name", ""),
                "crest":  team.get("crest", ""),
                "form":   round(min(form, 1.0), 4),
                "points": pts,
                "played": played,
                "won":    won,
                "drawn":  drawn,
                "lost":   lost,
                "gf":     gf,
                "ga":     ga,
                "xg_avg": round(min(xg_avg, 3.0), 4),
                "xg_against_avg": round(min(ga / max(played, 1), 3.0), 4),
            }

    return team_stats


def enrich_matches_with_form(matches: list[dict],
                              team_stats: dict[int, dict]) -> list[dict]:
    """
    Adiciona features de form real nos matches (para o ShapExplainer).
    Complementa os valores aleatórios do real_time_collector com dados reais
    quando disponíveis.
    """
    enriched = []
    for m in matches:
        # Tenta encontrar team IDs para cruzar com standings
        # Os matches do fetch_matches() não têm team_id diretamente —
        # mas os da API bruta (via fetch_historical_matches) têm.
        enriched.append(m)
    return enriched


def get_competitions() -> list[dict]:
    """Lista todas as competições disponíveis para a chave atual."""
    print("\nListando competições disponíveis...")
    try:
        data = _get("/competitions")
        comps = data.get("competitions", [])
        print(f"  → {len(comps)} competições:")
        for c in comps:
            print(f"     [{c['code']:>4}] {c['name']} ({c.get('area', {}).get('name', '')})")
        return comps
    except requests.HTTPError as e:
        print(f"  Erro: {e}")
        return []


# ── CLI standalone ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Football Data Collector")
    parser.add_argument("--competition", "-c", default="BSA",
                        help="Código da competição (padrão: BSA)")
    parser.add_argument("--list-competitions", action="store_true",
                        help="Lista competições disponíveis e sai")
    parser.add_argument("--include-finished", action="store_true",
                        help="Inclui partidas finalizadas no output")
    parser.add_argument("--standings", action="store_true",
                        help="Exibe classificação atual da competição")
    args = parser.parse_args()

    if args.list_competitions:
        get_competitions()
        sys.exit(0)

    matches = fetch_matches(
        competition=args.competition,
        include_finished=args.include_finished
    )

    print(f"\n{'─'*60}")
    print(f"Partidas encontradas: {len(matches)}")
    for m in matches[:5]:
        print(f"  [{m['status']:>9}] {m['home']} vs {m['away']} | {m['date'][:10]} | {m['round']}")
    if len(matches) > 5:
        print(f"  ... e mais {len(matches) - 5} partidas")

    if args.standings:
        standings = fetch_standings(args.competition)
        team_stats = build_team_form_from_standings(standings)
        print(f"\nClassificação ({args.competition}) — {len(team_stats)} times:")
        for tid, stats in list(team_stats.items())[:5]:
            print(f"  {stats['name']:30} pts={stats['points']:3} "
                  f"form={stats['form']:.2f} xG={stats['xg_avg']:.2f}")
