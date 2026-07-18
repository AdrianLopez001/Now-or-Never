import os
import pickle
import numpy as np
import pandas as pd
import shap
import json
import requests
from html.parser import HTMLParser

class DDGParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.snippets = []
        self.in_snippet = False
        self.current_snippet = []
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        # DuckDuckGo HTML snippets have class 'result__snippet'
        if tag == "a" and attrs_dict.get("class") == "result__snippet":
            self.in_snippet = True
            
    def handle_endtag(self, tag):
        if tag == "a" and self.in_snippet:
            self.in_snippet = False
            self.snippets.append("".join(self.current_snippet).strip())
            self.current_snippet = []
            
    def handle_data(self, data):
        if self.in_snippet:
            self.current_snippet.append(data)

class ShapExplainer:
    def __init__(self, artifacts_path="ml-pipeline/data/model_artifacts.pkl"):
        with open(artifacts_path, "rb") as f:
            self.artifacts = pickle.load(f)
            
        # Random Forest Base models
        self.model_outcome = self.artifacts["model_outcome"]
        self.model_btts = self.artifacts["model_btts"]
        self.model_over25 = self.artifacts["model_over25"]
        self.model_over05 = self.artifacts["model_over05"]
        self.model_under35 = self.artifacts["model_under35"]
        self.model_corners = self.artifacts["model_corners"]
        self.model_cards = self.artifacts["model_cards"]
        
        # Logistic Regression Base models
        self.model_outcome_lr = self.artifacts["model_outcome_lr"]
        self.model_btts_lr = self.artifacts["model_btts_lr"]
        self.model_over25_lr = self.artifacts["model_over25_lr"]
        self.model_over05_lr = self.artifacts["model_over05_lr"]
        self.model_under35_lr = self.artifacts["model_under35_lr"]
        self.model_corners_lr = self.artifacts["model_corners_lr"]
        self.model_cards_lr = self.artifacts["model_cards_lr"]
        
        # Gradient Boosting Base models
        self.model_outcome_gb = self.artifacts["model_outcome_gb"]
        self.model_btts_gb = self.artifacts["model_btts_gb"]
        self.model_over25_gb = self.artifacts["model_over25_gb"]
        self.model_over05_gb = self.artifacts["model_over05_gb"]
        self.model_under35_gb = self.artifacts["model_under35_gb"]
        self.model_corners_gb = self.artifacts["model_corners_gb"]
        self.model_cards_gb = self.artifacts["model_cards_gb"]
        
        self.features = self.artifacts["features"]
        
        # Initialize Tree SHAP explainers (based on the primary Random Forest models)
        self.explainer_outcome = shap.TreeExplainer(self.model_outcome)
        self.explainer_btts = shap.TreeExplainer(self.model_btts)
        self.explainer_over25 = shap.TreeExplainer(self.model_over25)
        self.explainer_over05 = shap.TreeExplainer(self.model_over05)
        self.explainer_under35 = shap.TreeExplainer(self.model_under35)
        self.explainer_corners = shap.TreeExplainer(self.model_corners)
        self.explainer_cards = shap.TreeExplainer(self.model_cards)

    def _extract_shap_vector(self, shap_output, class_index):
        """
        Safely extracts a 1D vector (length: n_features) from SHAP outputs of trees/random forests.
        """
        if isinstance(shap_output, list):
            arr = shap_output[class_index]
            if len(arr.shape) == 2:
                return arr[0]
            return arr
        elif isinstance(shap_output, np.ndarray):
            if len(shap_output.shape) == 3:
                return shap_output[0, :, class_index]
            elif len(shap_output.shape) == 2:
                return shap_output[0]
            return shap_output
        return shap_output

    def _search_web_news_free(self, query):
        """
        Performs a free, independent web search query using DuckDuckGo HTML interface.
        Requires zero API keys.
        """
        url = "https://html.duckduckgo.com/html/"
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        }
        payload = {"q": query}
        try:
            print(f"Executing independent free web search for: '{query}'...")
            r = requests.post(url, headers=headers, data=payload, timeout=8)
            if r.status_code == 200:
                parser = DDGParser()
                parser.feed(r.text)
                snippets = [s for s in parser.snippets if s]
                if snippets:
                    # Clean and compile top snippets
                    filtered_snippets = []
                    for s in snippets[:3]:
                        # Limit snippet length
                        clean_s = s.replace("\n", " ").strip()
                        if len(clean_s) > 10:
                            filtered_snippets.append(clean_s)
                    if filtered_snippets:
                        return " | ".join(filtered_snippets)
        except Exception as e:
            print(f"Independent DDG web search failed: {e}")
        return None

    def _generate_claude_explanations(self, home_team, away_team, feature_dict, prob_outcome, prob_btts, prob_over25, web_news=None, competition="Copa do Mundo"):
        """
        Calls Anthropic Claude API to generate professional sports analysis in Portuguese.
        """
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return None
            
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        prompt = f"""
Você é um analista de apostas esportivas e especialista em futebol.
Estamos analisando a partida da {competition}: {home_team} vs {away_team}.

Dados Preditivos da nossa IA:
- Vitória do {home_team}: {prob_outcome[0]*100:.1f}%
- Empate: {prob_outcome[1]*100:.1f}%
- Vitória do {away_team}: {prob_outcome[2]*100:.1f}%
- Ambos Marcam (BTTS Sim): {prob_btts*100:.1f}%
- Mais de 2.5 Gols (Over 2.5): {prob_over25*100:.1f}%

Métricas de Desempenho e Variáveis:
- Média de gols esperados (xG) do {home_team}: {feature_dict['xg_home_avg']:.1f}
- Média de gols esperados (xG) do {away_team}: {feature_dict['xg_away_avg']:.1f}
- Índice de desfalques do {home_team} (1.0 = completo, 0.7 = crítico): {feature_dict['home_injury_index']:.2f}
- Índice de desfalques do {away_team}: {feature_dict['away_injury_index']:.2f}
- Diferença de dias de descanso: {feature_dict['rest_days_diff']} dias
"""
        if web_news:
            prompt += f"\nNotícias recentes da web sobre desfalques/bastidores:\n{web_news}\n"
            
        prompt += """
Por favor, gere uma análise profissional em português estruturada EXATAMENTE como um JSON com as seguintes chaves (não inclua marcações markdown antes/depois do JSON, retorne apenas o objeto JSON puro):
{
  "outcome_summary": "Análise sobre o resultado da partida, favoritos e os fatores principais da nossa IA (forma, desfalques ou descanso). Use negrito para destacar os pontos chaves.",
  "btts_summary": "Análise detalhada sobre o mercado de Ambos Marcam baseado no xG de ambos os times.",
  "goals_summary": "Análise sobre o mercado de Over/Under 2.5 gols com base nas características ofensivas/defensivas."
}
"""
        body = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 1200,
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }
        try:
            print(f"Invoking Claude API for {home_team} vs {away_team} live analysis...")
            r = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=body, timeout=12)
            if r.status_code == 200:
                res_data = r.json()
                content_text = res_data["content"][0]["text"]
                clean_json = content_text.strip()
                if clean_json.startswith("```json"):
                    clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                elif clean_json.startswith("```"):
                    clean_json = clean_json.split("```")[1].split("```")[0].strip()
                return json.loads(clean_json)
        except Exception as e:
            print(f"Claude API request failed: {e}")
        return None

    def explain_match(self, feature_dict, home_team="Mandante", away_team="Visitante", competition="Copa do Mundo"):
        """
        Calculates SHAP values and cross-references probabilities across three models (RF, LR, GB).
        Returns averaged consensus probabilities, SHAP values, and verification stats.
        """
        df_row = pd.DataFrame([feature_dict])[self.features]
        
        # 1. Individual predictions for outcome (Home, Draw, Away)
        prob_out_rf = self.model_outcome.predict_proba(df_row)[0]
        prob_out_lr = self.model_outcome_lr.predict_proba(df_row)[0]
        prob_out_gb = self.model_outcome_gb.predict_proba(df_row)[0]
        
        # 2. Individual predictions for binary markets
        p_btts_rf = self.model_btts.predict_proba(df_row)[0][1]
        p_btts_lr = self.model_btts_lr.predict_proba(df_row)[0][1]
        p_btts_gb = self.model_btts_gb.predict_proba(df_row)[0][1]
        
        p_over25_rf = self.model_over25.predict_proba(df_row)[0][1]
        p_over25_lr = self.model_over25_lr.predict_proba(df_row)[0][1]
        p_over25_gb = self.model_over25_gb.predict_proba(df_row)[0][1]
        
        p_over05_rf = self.model_over05.predict_proba(df_row)[0][1]
        p_over05_lr = self.model_over05_lr.predict_proba(df_row)[0][1]
        p_over05_gb = self.model_over05_gb.predict_proba(df_row)[0][1]
        
        p_under35_rf = self.model_under35.predict_proba(df_row)[0][1]
        p_under35_lr = self.model_under35_lr.predict_proba(df_row)[0][1]
        p_under35_gb = self.model_under35_gb.predict_proba(df_row)[0][1]
        
        p_corners_rf = self.model_corners.predict_proba(df_row)[0][1]
        p_corners_lr = self.model_corners_lr.predict_proba(df_row)[0][1]
        p_corners_gb = self.model_corners_gb.predict_proba(df_row)[0][1]
        
        p_cards_rf = self.model_cards.predict_proba(df_row)[0][1]
        p_cards_lr = self.model_cards_lr.predict_proba(df_row)[0][1]
        p_cards_gb = self.model_cards_gb.predict_proba(df_row)[0][1]
        
        # 3. Consensus calculations (Averages)
        prob_outcome = (prob_out_rf + prob_out_lr + prob_out_gb) / 3.0
        prob_btts = (p_btts_rf + p_btts_lr + p_btts_gb) / 3.0
        prob_over25 = (p_over25_rf + p_over25_lr + p_over25_gb) / 3.0
        prob_over05 = (p_over05_rf + p_over05_lr + p_over05_gb) / 3.0
        prob_under35 = (p_under35_rf + p_under35_lr + p_under35_gb) / 3.0
        prob_corners = (p_corners_rf + p_corners_lr + p_corners_gb) / 3.0
        prob_cards = (p_cards_rf + p_cards_lr + p_cards_gb) / 3.0
        
        # Calculate standard deviation to measure consensus strength
        std_outcome = np.std([prob_out_rf, prob_out_lr, prob_out_gb], axis=0)
        mean_std = float(np.mean(std_outcome))
        
        if mean_std < 0.06:
            confidence = "ALTA"
        elif mean_std < 0.13:
            confidence = "MODERADA"
        else:
            confidence = "BAIXA"
            
        # 4. Tree SHAP values from primary RandomForest
        shap_out = self.explainer_outcome.shap_values(df_row)
        shap_btts_vals = self.explainer_btts.shap_values(df_row)
        shap_over25_vals = self.explainer_over25.shap_values(df_row)
        
        shap_out_home = self._extract_shap_vector(shap_out, 0)
        shap_out_draw = self._extract_shap_vector(shap_out, 1)
        shap_out_away = self._extract_shap_vector(shap_out, 2)
        
        shap_btts = self._extract_shap_vector(shap_btts_vals, 1)
        shap_over25 = self._extract_shap_vector(shap_over25_vals, 1)
        
        shap_home_dict = {f: float(val) for f, val in zip(self.features, shap_out_home)}
        shap_btts_dict = {f: float(val) for f, val in zip(self.features, shap_btts)}
        shap_over_dict = {f: float(val) for f, val in zip(self.features, shap_over25)}
        
        # 5. Fetch free web news (always run DDG crawler)
        query = f"{home_team} vs {away_team} {competition} football squad injuries news"
        web_news = self._search_web_news_free(query)

        # 6. Generate explanations (Claude if key available, fallback to local template with search integrations)
        explanations = None
        if os.environ.get("ANTHROPIC_API_KEY"):
            explanations = self._generate_claude_explanations(home_team, away_team, feature_dict, prob_outcome, prob_btts, prob_over25, web_news, competition=competition)
            
        if not explanations:
            explanations = self._generate_text_explanations(feature_dict, shap_home_dict, shap_btts_dict, shap_over_dict, prob_outcome, prob_btts, prob_over25, web_news)
        
        if prob_corners > 0.55:
            explanations["corners_summary"] = f"Tendência de OVER 9.5 escanteios ({prob_corners*100:.1f}%). Ambos os times utilizam jogadas de linha de fundo com frequência."
        else:
            explanations["corners_summary"] = f"Espera-se menos de 9.5 escanteios ({100-prob_corners*100:.1f}%). Estilo de jogo mais centralizado e menos finalizações de longa distância."

        if prob_cards > 0.55:
            explanations["cards_summary"] = f"Previsão de partida faltosa e tensa, com probabilidade de mais de 4.5 cartões em {prob_cards*100:.1f}%."
        else:
            explanations["cards_summary"] = f"Expectativa de jogo limpo e disciplinado, com menos de 4.5 cartões ({100-prob_cards*100:.1f}%)."

        # Append consensus statistics
        explanations["consensus"] = {
            "confidence": confidence,
            "mean_deviation": mean_std,
            "models": {
                "rf": {
                    "home": float(prob_out_rf[0]),
                    "draw": float(prob_out_rf[1]),
                    "away": float(prob_out_rf[2]),
                    "btts_yes": float(p_btts_rf),
                    "over25": float(p_over25_rf),
                    "over05": float(p_over05_rf),
                    "under35": float(p_under35_rf),
                    "corners": float(p_corners_rf),
                    "cards": float(p_cards_rf)
                },
                "lr": {
                    "home": float(prob_out_lr[0]),
                    "draw": float(prob_out_lr[1]),
                    "away": float(prob_out_lr[2]),
                    "btts_yes": float(p_btts_lr),
                    "over25": float(p_over25_lr),
                    "over05": float(p_over05_lr),
                    "under35": float(p_under35_lr),
                    "corners": float(p_corners_lr),
                    "cards": float(p_cards_lr)
                },
                "gb": {
                    "home": float(prob_out_gb[0]),
                    "draw": float(prob_out_gb[1]),
                    "away": float(prob_out_gb[2]),
                    "btts_yes": float(p_btts_gb),
                    "over25": float(p_over25_gb),
                    "over05": float(p_over05_gb),
                    "under35": float(p_under35_gb),
                    "corners": float(p_corners_gb),
                    "cards": float(p_cards_gb)
                }
            }
        }

        return {
            "probabilities": {
                "home": float(prob_outcome[0]),
                "draw": float(prob_outcome[1]),
                "away": float(prob_outcome[2]),
                "btts_yes": float(prob_btts),
                "btts_no": float(1.0 - prob_btts),
                "over25": float(prob_over25),
                "under25": float(1.0 - prob_over25),
                "over05": float(prob_over05),
                "under35": float(prob_under35),
                "over95corners": float(prob_corners),
                "over45cards": float(prob_cards)
            },
            "shap": {
                "home_win": shap_home_dict,
                "btts_yes": shap_btts_dict,
                "over25": shap_over_dict
            },
            "explanations": explanations
        }

    def _generate_text_explanations(self, features, shap_home, shap_btts, shap_over, probs, p_btts, p_over, web_news=None):
        sorted_home_factors = sorted(shap_home.items(), key=lambda x: abs(x[1]), reverse=True)
        
        translations = {
            "home_form": "Forma recente do Mandante",
            "away_form": "Forma recente do Visitante",
            "h2h_home_wins": "Histórico confronto direto",
            "home_injury_index": "Desfalques do Mandante",
            "away_injury_index": "Desfalques do Visitante",
            "rest_days_diff": "Diferença de descanso",
            "xg_home_avg": "Média de gols esperados (xG) do Mandante",
            "xg_away_avg": "Média de gols esperados (xG) do Visitante"
        }
        
        primary_feature, primary_val = sorted_home_factors[0]
        primary_name = translations.get(primary_feature, primary_feature)
        
        if primary_val > 0.05:
            outcome_text = f"A alta probabilidade de vitória do mandante é impulsionada principalmente por: **{primary_name}** (+{primary_val*100:.1f}% de impacto)."
        elif primary_val < -0.05:
            outcome_text = f"A probabilidade de vitória do mandante sofreu um impacto negativo devido a: **{primary_name}** ({primary_val*100:.1f}% de impacto)."
        else:
            outcome_text = "Esta partida apresenta um equilíbrio tático elevado, sem nenhum fator estatístico isolado sobressaindo de forma decisiva."
            
        injury_comment = ""
        if features["home_injury_index"] < 0.9:
            injury_comment = " O mandante entra pressionado por desfalques de titulares importantes."
        elif features["away_injury_index"] < 0.9:
            injury_comment = " O visitante possui baixas médicas cruciais, o que diminui sua intensidade defensiva."

        # Merge DuckDuckGo web results if available
        news_bulletin = ""
        if web_news:
            news_bulletin = f"<br/><br/>📰 **Boletim de Notícias da Web (DDG)**: {web_news}"

        if p_btts > 0.55:
            btts_text = f"Mercado AMBOS MARCAM com tendência positiva ({p_btts*100:.1f}%). Os ataques de ambas as equipes operam com altos índices de xG (Mandante: {features['xg_home_avg']:.1f}, Visitante: {features['xg_away_avg']:.1f})."
        else:
            btts_text = f"Tendência de ambas marcam reduzida ({p_btts*100:.1f}%). Espera-se um jogo mais estudado, com forte postura defensiva ou baixa produção ofensiva de um dos lados."

        if p_over > 0.55:
            goals_text = f"Previsão de OVER 2.5 gols favorável ({p_over*100:.1f}%). A combinação de desgaste físico (dias de descanso: {features['rest_days_diff']}) e eficiência ofensiva suporta um placar elástico."
        else:
            goals_text = f"Expectativa de UNDER 2.5 gols ({100 - p_over*100:.1f}%). O histórico recente aponta partidas truncadas e com pouca criação de perigo na grande área."

        return {
            "outcome_summary": outcome_text + injury_comment + news_bulletin,
            "btts_summary": btts_text,
            "goals_summary": goals_text
        }

if __name__ == "__main__":
    try:
        explainer = ShapExplainer()
        sample_features = {
            "home_form": 0.8,
            "away_form": 0.5,
            "h2h_home_wins": 3,
            "home_injury_index": 0.95,
            "away_injury_index": 0.70,
            "rest_days_diff": 2,
            "xg_home_avg": 2.1,
            "xg_away_avg": 1.1
        }
        res = explainer.explain_match(sample_features)
        print(json.dumps(res, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Could not run test: {e}")
