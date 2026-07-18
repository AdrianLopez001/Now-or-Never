import os
import sys
import json
import random
import requests
import argparse
from datetime import datetime, timedelta
from football_data_collector import (
    fetch_matches as fetch_football_data_matches,
    fetch_standings,
    build_team_form_from_standings,
    RATE_LIMIT_DELAY,
)

# Janela de coleta: apenas partidas nos próximos N dias recebem predições.
# Isso evita que o ShapExplainer processe centenas de jogos de rodadas futuras.
# Aumente conforme necessário (ex: 14 para duas semanas).
MAX_DAYS_AHEAD = 10



def fetch_espn_matches(competition: str = "fifa.world"):
    """
    Fallback: Queries the public ESPN scoreboard for a given competition.
    Used when football-data.org is unavailable.
    """
    today = datetime.now()
    end_date = today + timedelta(days=30)
    dates_str = f"{today.strftime('%Y%m%d')}-{end_date.strftime('%Y%m%d')}"
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/{competition}/scoreboard?dates={dates_str}"

    try:
        print(f"[Fallback ESPN] Buscando partidas de '{competition}'...")
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            print(f"ESPN API falhou com status {response.status_code}")
            return []

        data = response.json()
        events = data.get("events", [])

        parsed_matches = []
        for e in events:
            comp = e["competitions"][0]

            home_comp = None
            away_comp = None
            for competitor in comp["competitors"]:
                if competitor["homeAway"] == "home":
                    home_comp = competitor
                else:
                    away_comp = competitor

            if not home_comp or not away_comp:
                continue

            home_team = home_comp["team"]
            away_team = away_comp["team"]

            home_name = home_team.get("displayName", "")
            away_name = away_team.get("displayName", "")

            placeholder_kws = ["winner", "loser", "tbd", "to be decided", "quarterfinal",
                                "semifinal", "vencedor", "perdedor", "definir"]
            if any(kw in home_name.lower() or kw in away_name.lower() for kw in placeholder_kws):
                print(f"[ESPN] Ignorando placeholder: {home_name} vs {away_name}")
                continue

            raw_status = e["status"]["type"]["state"]
            if raw_status == "pre":
                status = "SCHEDULED"
            elif raw_status == "in":
                status = "LIVE"
            else:
                print(f"[ESPN] Excluindo partida finalizada: {home_name} vs {away_name}")
                continue

            home_score = None
            away_score = None
            if status == "LIVE":
                try:
                    home_score = int(home_comp["score"])
                    away_score = int(away_comp["score"])
                except Exception:
                    pass

            raw_date = e["date"]
            standard_date = raw_date
            for date_format in ["%Y-%m-%dT%H:%MZ", "%Y-%m-%dT%H:%M:%SZ"]:
                try:
                    dt = datetime.strptime(raw_date, date_format)
                    standard_date = dt.strftime("%Y-%m-%dT%H:%M:00Z")
                    break
                except Exception:
                    pass

            match_data = {
                "id": int(e["id"]),
                "home": home_team["displayName"],
                "home_logo": home_team.get("logo", "https://flagcdn.com/w160/un.png"),
                "away": away_team["displayName"],
                "away_logo": away_team.get("logo", "https://flagcdn.com/w160/un.png"),
                "date": standard_date,
                "status": status,
                "round": "Série A" if competition == "bra.1" else "Série B" if competition == "bra.2" else "Copa do Mundo",
                "competition": "BSA" if competition == "bra.1" else "BSB" if competition == "bra.2" else "WC",
            }
            if home_score is not None:
                match_data["home_score"] = home_score
                match_data["away_score"] = away_score

            parsed_matches.append(match_data)

        return parsed_matches
    except Exception as ex:
        print(f"[ESPN] Erro: {ex}")
        return []


def fetch_espn_standings(espn_competition: str) -> dict:
    """
    Queries the public ESPN standings API and builds team stats
    in the same format as build_team_form_from_standings.
    """
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_competition}/standings"
    try:
        print(f"[ESPN Standings] Buscando classificação de '{espn_competition}'...")
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            print(f"ESPN Standings API falhou com status {r.status_code}")
            return {}

        data = r.json()
        entries = data.get("children", [{}])[0].get("standings", {}).get("entries", [])
        
        team_stats = {}
        for entry in entries:
            team = entry.get("team", {})
            tid = int(team.get("id", 0))
            if not tid:
                continue
            
            # Map stats list to a dictionary for easy access
            stats_list = entry.get("stats", [])
            stats_map = {s["name"]: s.get("value", 0) for s in stats_list if "name" in s}
            
            played = int(stats_map.get("gamesPlayed", 0))
            won = int(stats_map.get("wins", 0))
            drawn = int(stats_map.get("ties", 0))
            lost = int(stats_map.get("losses", 0))
            gf = int(stats_map.get("pointsFor", 0))
            ga = int(stats_map.get("pointsAgainst", 0))
            pts = int(stats_map.get("points", 0))
            
            # form: win rate normalizada (0.0 → 1.0)
            form = (won + 0.5 * drawn) / max(played, 1)
            # xG proxy: média de gols marcados
            xg_avg = gf / max(played, 1)
            
            team_stats[tid] = {
                "name":   team.get("displayName", ""),
                "crest":  team.get("logo", ""),
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
        
        print(f"  → {len(team_stats)} times carregados da classificação ESPN")
        return team_stats
    except Exception as ex:
        print(f"[ESPN Standings] Erro ao carregar classificação: {ex}")
        return {}


def adjust_probabilities_live(pre_probs, home_score, away_score, status):
    p_init = {
        "home": pre_probs["home"],
        "draw": pre_probs["draw"],
        "away": pre_probs["away"],
        "btts_yes": pre_probs["btts_yes"],
        "btts_no": 1.0 - pre_probs["btts_yes"],
        "over25": pre_probs["over25"],
        "under25": 1.0 - pre_probs["over25"],
        "over05": pre_probs["over05"],
        "under35": pre_probs["under35"],
        "corners": pre_probs["corners"],
        "cards": pre_probs["cards"]
    }

    if status == "SCHEDULED" or home_score is None or away_score is None:
        return p_init

    h = home_score
    a = away_score
    diff = h - a

    p_h = pre_probs["home"]
    p_d = pre_probs["draw"]
    p_a = pre_probs["away"]

    if diff == 0:
        p_d_new = min(0.95, p_d + 0.15)
        remaining = 1.0 - p_d_new
        ratio = p_h / (p_h + p_a) if (p_h + p_a) > 0 else 0.5
        p_h_new = remaining * ratio
        p_a_new = remaining * (1.0 - ratio)
    elif diff > 0:
        if diff == 1:
            p_h_new = p_h + 0.55 * (1.0 - p_h)
        elif diff == 2:
            p_h_new = p_h + 0.85 * (1.0 - p_h)
        else:
            p_h_new = 0.99

        p_h_new = max(p_h, min(0.999, p_h_new))
        remaining = 1.0 - p_h_new
        ratio = p_d / (p_d + p_a) if (p_d + p_a) > 0 else 0.5
        p_d_new = remaining * ratio
        p_a_new = remaining * (1.0 - ratio)
    else:
        abs_diff = abs(diff)
        if abs_diff == 1:
            p_a_new = p_a + 0.55 * (1.0 - p_a)
        elif abs_diff == 2:
            p_a_new = p_a + 0.85 * (1.0 - p_a)
        else:
            p_a_new = 0.99

        p_a_new = max(p_a, min(0.999, p_a_new))
        remaining = 1.0 - p_a_new
        ratio = p_d / (p_d + p_h) if (p_d + p_h) > 0 else 0.5
        p_d_new = remaining * ratio
        p_h_new = remaining * (1.0 - ratio)

    total = p_h_new + p_d_new + p_a_new
    p_h_new /= total
    p_d_new /= total
    p_a_new /= total

    if h > 0 and a > 0:
        btts_yes = 0.999
        btts_no = 0.001
    else:
        btts_yes = pre_probs["btts_yes"]
        btts_no = 1.0 - btts_yes

    total_goals = h + a
    if total_goals >= 3:
        over25 = 0.999
        under25 = 0.001
    elif total_goals == 2:
        over25 = 0.85
        under25 = 0.15
    elif total_goals == 1:
        over25 = 0.55
        under25 = 0.45
    else:
        over25 = pre_probs["over25"]
        under25 = 1.0 - over25

    if total_goals >= 1:
        over05 = 0.999
    else:
        over05 = pre_probs["over05"]

    if total_goals >= 4:
        under35 = 0.001
    elif total_goals == 3:
        under35 = 0.35
    elif total_goals == 2:
        under35 = 0.70
    elif total_goals == 1:
        under35 = 0.88
    else:
        under35 = pre_probs["under35"]

    return {
        "home": p_h_new,
        "draw": p_d_new,
        "away": p_a_new,
        "btts_yes": btts_yes,
        "btts_no": btts_no,
        "over25": over25,
        "under25": under25,
        "over05": over05,
        "under35": under35,
        "corners": pre_probs["corners"],
        "cards": pre_probs["cards"]
    }


def build_features_from_standings(home_name: str, away_name: str,
                                   match_id: int,
                                   team_stats: dict) -> dict:
    """
    Constrói features para o ShapExplainer usando dados reais da classificação.
    Fallback para valores pseudo-aleatórios quando o time não está na tabela.
    """
    random.seed(match_id)

    def get_stats(name: str, is_home: bool) -> dict:
        # Tenta encontrar o time pelo nome (busca parcial, case-insensitive)
        for tid, stats in team_stats.items():
            if name.lower() in stats["name"].lower() or stats["name"].lower() in name.lower():
                return stats
        # Fallback aleatório com seed estável
        base_form = 0.6 if is_home else 0.5
        return {
            "form":   max(0.2, min(0.9, base_form + random.normalvariate(0, 0.15))),
            "xg_avg": max(0.5, min(3.0, 1.5 + random.normalvariate(0, 0.4))),
        }

    home_stats = get_stats(home_name, is_home=True)
    away_stats = get_stats(away_name, is_home=False)

    home_form  = home_stats["form"]
    away_form  = away_stats["form"]
    xg_home    = home_stats["xg_avg"]
    xg_away    = away_stats["xg_avg"]

    # Features extras com seed estável para reprodutibilidade
    h2h        = random.choice([0, 1, 2, 3])
    home_injury = max(0.7, min(1.0, 1.0 - random.uniform(0.0, 0.08)))
    away_injury = max(0.7, min(1.0, 1.0 - random.uniform(0.0, 0.12)))
    rest_diff   = random.choice([-2, -1, 0, 1, 2])

    return {
        "home_form":          home_form,
        "away_form":          away_form,
        "h2h_home_wins":      h2h,
        "home_injury_index":  home_injury,
        "away_injury_index":  away_injury,
        "rest_days_diff":     rest_diff,
        "xg_home_avg":        xg_home,
        "xg_away_avg":        xg_away,
    }


def main():
    parser = argparse.ArgumentParser(description="Black King — Real-Time Collector")
    parser.add_argument("--competition", "-c", default="BSA",
                        help="Código da competição football-data.org (padrão: BSA)")
    parser.add_argument("--fallback-espn", action="store_true",
                        help="Usa ESPN como fonte (ignora football-data.org)")
    parser.add_argument("--espn-competition", default="fifa.world",
                        help="ESPN league slug (e.g. bra.1, bra.2, fifa.world)")
    parser.add_argument("--days-ahead", type=int, default=MAX_DAYS_AHEAD,
                        help=f"Janela de dias para predições (padrão: {MAX_DAYS_AHEAD})")
    args = parser.parse_args()

    competition = args.competition
    cutoff_date = datetime.utcnow() + timedelta(days=args.days_ahead)

    # ── 1. Buscar partidas ────────────────────────────────────────────────────
    matches = []

    if not args.fallback_espn:
        print(f"Coletando partidas via football-data.org [{competition}]...")
        matches = fetch_football_data_matches(competition=competition)

    if not matches:
        # Fallback para ESPN
        print(f"Buscando partidas via ESPN [{args.espn_competition}]...")
        matches = fetch_espn_matches(args.espn_competition)

    # Filtrar apenas partidas ativas (SCHEDULED ou LIVE) dentro da janela de datas
    def in_window(m: dict) -> bool:
        if m["status"] == "LIVE":
            return True  # partidas ao vivo sempre incluídas
        try:
            match_dt = datetime.strptime(m["date"], "%Y-%m-%dT%H:%M:00Z")
            return match_dt <= cutoff_date
        except Exception:
            return True  # em caso de dúvida, inclui

    active_matches = [m for m in matches
                      if m["status"] in ("SCHEDULED", "LIVE") and in_window(m)]

    total_active = len([m for m in matches if m["status"] in ("SCHEDULED", "LIVE")])
    print(f"\nTotal de partidas ativas: {total_active}")
    print(f"Partidas na janela de {args.days_ahead} dias: {len(active_matches)}")

    target_path = "../backend/src/main/resources/predictions.json"

    if not active_matches:
        print(f"Nenhuma partida nos próximos {args.days_ahead} dias para esta competição. Mantendo predições existentes.")
        return

    # ── 2. Buscar classificação para features reais ───────────────────────────
    team_stats = {}
    if not args.fallback_espn:
        print(f"\nBuscando classificação de {competition} para features reais...")
        standings_data = fetch_standings(competition)
        team_stats = build_team_form_from_standings(standings_data)
        print(f"  → {len(team_stats)} times carregados da classificação")
    else:
        team_stats = fetch_espn_standings(args.espn_competition)

    # ── 3. Gerar predições ────────────────────────────────────────────────────
    from explain import ShapExplainer  # import tardio (evita carga sem necessidade)
    explainer = ShapExplainer()
    predictions = []

    for m in active_matches:
        print(f"\nGerando predição: {m['home']} vs {m['away']} [{m['status']}]")

        features = build_features_from_standings(
            home_name=m["home"],
            away_name=m["away"],
            match_id=m["id"],
            team_stats=team_stats,
        )

        explanation = explainer.explain_match(features, home_team=m["home"], away_team=m["away"], competition=m["round"])
        probs = explanation["probabilities"]

        pre_probs = {
            "home":    probs["home"],
            "draw":    probs["draw"],
            "away":    probs["away"],
            "btts_yes": probs["btts_yes"],
            "over25":   probs["over25"],
            "over05":   probs["over05"],
            "under35":  probs["under35"],
            "corners":  probs["over95corners"],
            "cards":    probs["over45cards"],
        }

        h_score = m.get("home_score")
        a_score = m.get("away_score")

        p = adjust_probabilities_live(pre_probs, h_score, a_score, m["status"])

        prob_dc_1x = p["home"] + p["draw"]
        prob_dc_12 = p["home"] + p["away"]
        prob_dc_x2 = p["draw"] + p["away"]

        payload = {
            "matchApiFootballId": m["id"],
            "homeTeamName":       m["home"],
            "homeTeamLogo":       m["home_logo"],
            "awayTeamName":       m["away"],
            "awayTeamLogo":       m["away_logo"],
            "matchStatus":        m["status"],
            "matchDate":          m["date"],
            "matchRound":         m["round"],
            "homeScore":          h_score,
            "awayScore":          a_score,

            # Predições
            "probHomeWin":        p["home"],
            "probDraw":           p["draw"],
            "probAwayWin":        p["away"],
            "probBttsYes":        p["btts_yes"],
            "probBttsNo":         p["btts_no"],
            "probOver25":         p["over25"],
            "probUnder25":        p["under25"],
            "probOver05":         p["over05"],
            "probUnder35":        p["under35"],
            "probDoubleChance1X": prob_dc_1x,
            "probDoubleChance12": prob_dc_12,
            "probDoubleChanceX2": prob_dc_x2,
            "probOver95Corners":  p["corners"],
            "probOver45Cards":    p["cards"],

            "brierScoreOutcome":  None,
            "brierScoreBtts":     None,
            "brierScoreOver25":   None,
            "brierScoreOver05":   None,
            "brierScoreUnder35":  None,
            "brierScoreCorners":  None,
            "brierScoreCards":    None,

            "shapValuesJson":     json.dumps({"home_win": explanation["shap"]}),
            "explanationsJson":   json.dumps(explanation["explanations"]),
        }
        predictions.append(payload)

    # Mescla as predições novas com as existentes para evitar sobrescrever outras ligas
    existing = []
    import os
    if os.path.exists(target_path):
        try:
            with open(target_path, "r") as f:
                existing = json.load(f)
        except Exception as ex:
            print(f"Aviso ao ler predições existentes: {ex}")

    # Sobrescreve as que têm o mesmo ID de partida, mantém as outras
    new_ids = {p["matchApiFootballId"] for p in predictions}
    merged = [p for p in existing if p["matchApiFootballId"] not in new_ids] + predictions

    # Filtra partidas passadas (mais antigas que ontem) para manter apenas as ativas/futuras
    now_utc = datetime.utcnow()
    filtered_merged = []
    for p in merged:
        try:
            match_dt = datetime.strptime(p["matchDate"], "%Y-%m-%dT%H:%M:%SZ")
        except Exception:
            try:
                match_dt = datetime.strptime(p["matchDate"], "%Y-%m-%dT%H:%M:00Z")
            except Exception:
                match_dt = None
        
        if match_dt and match_dt < now_utc - timedelta(days=1) and p["matchStatus"] != "LIVE":
            # Descarta partidas antigas concluídas
            continue
        filtered_merged.append(p)

    with open(target_path, "w") as f:
        json.dump(filtered_merged, f, indent=2, ensure_ascii=False)

    print(f"\n✅ {len(predictions)} predições mescladas no total de {len(filtered_merged)} escritas em: {target_path}")


if __name__ == "__main__":
    main()
