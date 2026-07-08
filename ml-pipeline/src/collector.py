import pandas as pd
import numpy as np

def generate_historical_data(n_matches=1000):
    """
    Generates realistic historical data for model training.
    Includes features like team strength, form, xG, and injury indexes.
    Also simulates corners and cards.
    """
    np.random.seed(42)
    
    # Team names in Brasileirão
    teams = [
        "Flamengo", "Palmeiras", "São Paulo", "Corinthians", 
        "Botafogo", "Fluminense", "Atlético Mineiro", "Grêmio",
        "Internacional", "Cruzeiro", "Athletico Paranaense", "Bahia",
        "Fortaleza", "Vasco da Gama", "Cuiabá", "Criciúma",
        "Juventude", "Vitória", "Atlético Goianiense", "Bragantino"
    ]
    
    # Assign latent strengths (0 to 1) to simulate realistic results
    team_strengths = {team: np.random.uniform(0.4, 0.9) for team in teams}
    # Keep Flamengo, Palmeiras, São Paulo strong
    team_strengths["Flamengo"] = 0.90
    team_strengths["Palmeiras"] = 0.88
    team_strengths["São Paulo"] = 0.80
    team_strengths["Botafogo"] = 0.82
    
    data = []
    for i in range(n_matches):
        home = np.random.choice(teams)
        away = np.random.choice([t for t in teams if t != home])
        
        h_strength = team_strengths[home]
        a_strength = team_strengths[away]
        
        # Generate match features
        home_form = np.clip(h_strength + np.random.normal(0, 0.1), 0, 1)
        away_form = np.clip(a_strength + np.random.normal(0, 0.1), 0, 1)
        
        h2h_home_wins = np.random.choice([0, 1, 2, 3, 4, 5], p=[0.1, 0.2, 0.3, 0.2, 0.1, 0.1])
        
        # Injury index: 1.0 means fully fit, lower means key injuries
        home_injury_index = np.clip(1.0 - np.random.exponential(0.08), 0.5, 1.0)
        away_injury_index = np.clip(1.0 - np.random.exponential(0.08), 0.5, 1.0)
        
        # Rest days
        rest_days_diff = np.random.choice([-3, -2, -1, 0, 1, 2, 3])
        
        # Expected goals (xG) averages
        xg_home_avg = np.clip(1.2 * h_strength + np.random.normal(0.2, 0.2), 0.5, 3.0)
        xg_away_avg = np.clip(1.0 * a_strength + np.random.normal(-0.1, 0.2), 0.3, 2.5)
        
        # Calculate lambda for goals (Poisson distributions)
        lam_home = np.exp(0.2 + 0.6 * home_form - 0.4 * (1.0 - home_injury_index) + 0.1 * rest_days_diff + 0.2 * xg_home_avg)
        lam_away = np.exp(0.0 + 0.6 * away_form - 0.4 * (1.0 - away_injury_index) - 0.1 * rest_days_diff + 0.2 * xg_away_avg)
        
        # Ensure positive
        lam_home = max(0.1, lam_home)
        lam_away = max(0.1, lam_away)
        
        home_goals = np.random.poisson(lam_home)
        away_goals = np.random.poisson(lam_away)
        
        # Simulate corners (Poisson based on form and offensive xG averages)
        lam_home_corners = 4.8 + 1.2 * home_form + 0.3 * xg_home_avg
        lam_away_corners = 4.2 + 1.0 * away_form + 0.2 * xg_away_avg
        home_corners = np.random.poisson(lam_home_corners)
        away_corners = np.random.poisson(lam_away_corners)
        
        # Simulate cards (Poisson based on defensive weakness and rest days)
        # More tired teams (negative rest days diff for home) or lower form teams make more cards
        lam_home_cards = 2.4 - 0.5 * home_form - 0.1 * rest_days_diff
        lam_away_cards = 2.6 - 0.5 * away_form + 0.1 * rest_days_diff
        home_cards = np.random.poisson(max(0.1, lam_home_cards))
        away_cards = np.random.poisson(max(0.1, lam_away_cards))
        
        # Target variables
        # 1. Outcome: 0 = Home Win, 1 = Draw, 2 = Away Win
        if home_goals > away_goals:
            outcome = 0
        elif home_goals == away_goals:
            outcome = 1
        else:
            outcome = 2
            
        # 2. BTTS (Both Teams To Score): 0 = No, 1 = Yes
        btts = 1 if (home_goals > 0 and away_goals > 0) else 0
        
        # 3. Over 2.5 Goals: 0 = No, 1 = Yes
        over25 = 1 if (home_goals + away_goals > 2.5) else 0
        
        # 4. Over 0.5 Goals: 0 = No, 1 = Yes
        over05 = 1 if (home_goals + away_goals > 0.5) else 0
        
        # 5. Under 3.5 Goals: 0 = No, 1 = Yes
        under35 = 1 if (home_goals + away_goals < 3.5) else 0
        
        # 6. Over 9.5 Corners: 0 = No, 1 = Yes
        over95corners = 1 if (home_corners + away_corners > 9.5) else 0
        
        # 7. Over 4.5 Cards: 0 = No, 1 = Yes
        over45cards = 1 if (home_cards + away_cards > 4.5) else 0
        
        data.append({
            "match_id": i,
            "home_team": home,
            "away_team": away,
            "home_form": home_form,
            "away_form": away_form,
            "h2h_home_wins": h2h_home_wins,
            "home_injury_index": home_injury_index,
            "away_injury_index": away_injury_index,
            "rest_days_diff": rest_days_diff,
            "xg_home_avg": xg_home_avg,
            "xg_away_avg": xg_away_avg,
            "home_goals": home_goals,
            "away_goals": away_goals,
            "home_corners": home_corners,
            "away_corners": away_corners,
            "home_cards": home_cards,
            "away_cards": away_cards,
            "outcome": outcome,
            "btts": btts,
            "over25": over25,
            "over05": over05,
            "under35": under35,
            "over95corners": over95corners,
            "over45cards": over45cards
        })
        
    return pd.DataFrame(data)

if __name__ == "__main__":
    df = generate_historical_data(5)
    print("Sample generated data:")
    print(df.head())
