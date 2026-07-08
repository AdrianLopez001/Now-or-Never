package com.nowornever.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "predictions")
public class MatchPrediction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "match_id", nullable = false, unique = true)
    private Match match;

    // Outcome Probabilities (Home Win / Draw / Away Win)
    @Column(name = "prob_home_win")
    private Double probHomeWin;

    @Column(name = "prob_draw")
    private Double probDraw;

    @Column(name = "prob_away_win")
    private Double probAwayWin;

    // BTTS Probabilities (Yes / No)
    @Column(name = "prob_btts_yes")
    private Double probBttsYes;

    @Column(name = "prob_btts_no")
    private Double probBttsNo;

    // Over/Under 2.5 Goals
    @Column(name = "prob_over_25")
    private Double probOver25;

    @Column(name = "prob_under_25")
    private Double probUnder25;

    // Over 0.5 and Under 3.5 Goals
    @Column(name = "prob_over_05")
    private Double probOver05;

    @Column(name = "prob_under_35")
    private Double probUnder35;

    // Double Chance Probabilities
    @Column(name = "prob_double_chance_1x")
    private Double probDoubleChance1X;

    @Column(name = "prob_double_chance_12")
    private Double probDoubleChance12;

    @Column(name = "prob_double_chance_x2")
    private Double probDoubleChanceX2;

    // Corners (Over 9.5) and Cards (Over 4.5)
    @Column(name = "prob_over_95_corners")
    private Double probOver95Corners;

    @Column(name = "prob_over_45_cards")
    private Double probOver45Cards;

    // Performance metrics
    @Column(name = "brier_score_outcome")
    private Double brierScoreOutcome;

    @Column(name = "brier_score_btts")
    private Double brierScoreBtts;

    @Column(name = "brier_score_over_25")
    private Double brierScoreOver25;

    @Column(name = "brier_score_over_05")
    private Double brierScoreOver05;

    @Column(name = "brier_score_under_35")
    private Double brierScoreUnder35;

    @Column(name = "brier_score_corners")
    private Double brierScoreCorners;

    @Column(name = "brier_score_cards")
    private Double brierScoreCards;

    // SHAP values stored as JSON
    @Column(name = "shap_values_json", columnDefinition = "TEXT")
    private String shapValuesJson;

    // Natural Language Explanation
    @Column(name = "explanations_json", columnDefinition = "TEXT")
    private String explanationsJson;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void prePersist() {
        this.updatedAt = LocalDateTime.now();
    }

    public MatchPrediction() {}

    public MatchPrediction(Match match, Double probHomeWin, Double probDraw, Double probAwayWin, Double probBttsYes, Double probBttsNo, 
                           Double probOver25, Double probUnder25, Double probOver05, Double probUnder35, 
                           Double probDoubleChance1X, Double probDoubleChance12, Double probDoubleChanceX2, 
                           Double probOver95Corners, Double probOver45Cards, Double brierScoreOutcome, Double brierScoreBtts, 
                           Double brierScoreOver25, Double brierScoreOver05, Double brierScoreUnder35, 
                           Double brierScoreCorners, Double brierScoreCards, String shapValuesJson, String explanationsJson) {
        this.match = match;
        this.probHomeWin = probHomeWin;
        this.probDraw = probDraw;
        this.probAwayWin = probAwayWin;
        this.probBttsYes = probBttsYes;
        this.probBttsNo = probBttsNo;
        this.probOver25 = probOver25;
        this.probUnder25 = probUnder25;
        this.probOver05 = probOver05;
        this.probUnder35 = probUnder35;
        this.probDoubleChance1X = probDoubleChance1X;
        this.probDoubleChance12 = probDoubleChance12;
        this.probDoubleChanceX2 = probDoubleChanceX2;
        this.probOver95Corners = probOver95Corners;
        this.probOver45Cards = probOver45Cards;
        this.brierScoreOutcome = brierScoreOutcome;
        this.brierScoreBtts = brierScoreBtts;
        this.brierScoreOver25 = brierScoreOver25;
        this.brierScoreOver05 = brierScoreOver05;
        this.brierScoreUnder35 = brierScoreUnder35;
        this.brierScoreCorners = brierScoreCorners;
        this.brierScoreCards = brierScoreCards;
        this.shapValuesJson = shapValuesJson;
        this.explanationsJson = explanationsJson;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Match getMatch() { return match; }
    public void setMatch(Match match) { this.match = match; }

    public Double getProbHomeWin() { return probHomeWin; }
    public void setProbHomeWin(Double probHomeWin) { this.probHomeWin = probHomeWin; }

    public Double getProbDraw() { return probDraw; }
    public void setProbDraw(Double probDraw) { this.probDraw = probDraw; }

    public Double getProbAwayWin() { return probAwayWin; }
    public void setProbAwayWin(Double probAwayWin) { this.probAwayWin = probAwayWin; }

    public Double getProbBttsYes() { return probBttsYes; }
    public void setProbBttsYes(Double probBttsYes) { this.probBttsYes = probBttsYes; }

    public Double getProbBttsNo() { return probBttsNo; }
    public void setProbBttsNo(Double probBttsNo) { this.probBttsNo = probBttsNo; }

    public Double getProbOver25() { return probOver25; }
    public void setProbOver25(Double probOver25) { this.probOver25 = probOver25; }

    public Double getProbUnder25() { return probUnder25; }
    public void setProbUnder25(Double probUnder25) { this.probUnder25 = probUnder25; }

    public Double getProbOver05() { return probOver05; }
    public void setProbOver05(Double probOver05) { this.probOver05 = probOver05; }

    public Double getProbUnder35() { return probUnder35; }
    public void setProbUnder35(Double probUnder35) { this.probUnder35 = probUnder35; }

    public Double getProbDoubleChance1X() { return probDoubleChance1X; }
    public void setProbDoubleChance1X(Double probDoubleChance1X) { this.probDoubleChance1X = probDoubleChance1X; }

    public Double getProbDoubleChance12() { return probDoubleChance12; }
    public void setProbDoubleChance12(Double probDoubleChance12) { this.probDoubleChance12 = probDoubleChance12; }

    public Double getProbDoubleChanceX2() { return probDoubleChanceX2; }
    public void setProbDoubleChanceX2(Double probDoubleChanceX2) { this.probDoubleChanceX2 = probDoubleChanceX2; }

    public Double getProbOver95Corners() { return probOver95Corners; }
    public void setProbOver95Corners(Double probOver95Corners) { this.probOver95Corners = probOver95Corners; }

    public Double getProbOver45Cards() { return probOver45Cards; }
    public void setProbOver45Cards(Double probOver45Cards) { this.probOver45Cards = probOver45Cards; }

    public Double getBrierScoreOutcome() { return brierScoreOutcome; }
    public void setBrierScoreOutcome(Double brierScoreOutcome) { this.brierScoreOutcome = brierScoreOutcome; }

    public Double getBrierScoreBtts() { return brierScoreBtts; }
    public void setBrierScoreBtts(Double brierScoreBtts) { this.brierScoreBtts = brierScoreBtts; }

    public Double getBrierScoreOver25() { return brierScoreOver25; }
    public void setBrierScoreOver25(Double brierScoreOver25) { this.brierScoreOver25 = brierScoreOver25; }

    public Double getBrierScoreOver05() { return brierScoreOver05; }
    public void setBrierScoreOver05(Double brierScoreOver05) { this.brierScoreOver05 = brierScoreOver05; }

    public Double getBrierScoreUnder35() { return brierScoreUnder35; }
    public void setBrierScoreUnder35(Double brierScoreUnder35) { this.brierScoreUnder35 = brierScoreUnder35; }

    public Double getBrierScoreCorners() { return brierScoreCorners; }
    public void setBrierScoreCorners(Double brierScoreCorners) { this.brierScoreCorners = brierScoreCorners; }

    public Double getBrierScoreCards() { return brierScoreCards; }
    public void setBrierScoreCards(Double brierScoreCards) { this.brierScoreCards = brierScoreCards; }

    public String getShapValuesJson() { return shapValuesJson; }
    public void setShapValuesJson(String shapValuesJson) { this.shapValuesJson = shapValuesJson; }

    public String getExplanationsJson() { return explanationsJson; }
    public void setExplanationsJson(String explanationsJson) { this.explanationsJson = explanationsJson; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    // Builder helper
    public static MatchPredictionBuilder builder() {
        return new MatchPredictionBuilder();
    }

    public static class MatchPredictionBuilder {
        private Match match;
        private Double probHomeWin;
        private Double probDraw;
        private Double probAwayWin;
        private Double probBttsYes;
        private Double probBttsNo;
        private Double probOver25;
        private Double probUnder25;
        private Double probOver05;
        private Double probUnder35;
        private Double probDoubleChance1X;
        private Double probDoubleChance12;
        private Double probDoubleChanceX2;
        private Double probOver95Corners;
        private Double probOver45Cards;
        private Double brierScoreOutcome;
        private Double brierScoreBtts;
        private Double brierScoreOver25;
        private Double brierScoreOver05;
        private Double brierScoreUnder35;
        private Double brierScoreCorners;
        private Double brierScoreCards;
        private String shapValuesJson;
        private String explanationsJson;

        public MatchPredictionBuilder match(Match match) { this.match = match; return this; }
        public MatchPredictionBuilder probHomeWin(Double probHomeWin) { this.probHomeWin = probHomeWin; return this; }
        public MatchPredictionBuilder probDraw(Double probDraw) { this.probDraw = probDraw; return this; }
        public MatchPredictionBuilder probAwayWin(Double probAwayWin) { this.probAwayWin = probAwayWin; return this; }
        public MatchPredictionBuilder probBttsYes(Double probBttsYes) { this.probBttsYes = probBttsYes; return this; }
        public MatchPredictionBuilder probBttsNo(Double probBttsNo) { this.probBttsNo = probBttsNo; return this; }
        public MatchPredictionBuilder probOver25(Double probOver25) { this.probOver25 = probOver25; return this; }
        public MatchPredictionBuilder probUnder25(Double probUnder25) { this.probUnder25 = probUnder25; return this; }
        public MatchPredictionBuilder probOver05(Double probOver05) { this.probOver05 = probOver05; return this; }
        public MatchPredictionBuilder probUnder35(Double probUnder35) { this.probUnder35 = probUnder35; return this; }
        public MatchPredictionBuilder probDoubleChance1X(Double probDoubleChance1X) { this.probDoubleChance1X = probDoubleChance1X; return this; }
        public MatchPredictionBuilder probDoubleChance12(Double probDoubleChance12) { this.probDoubleChance12 = probDoubleChance12; return this; }
        public MatchPredictionBuilder probDoubleChanceX2(Double probDoubleChanceX2) { this.probDoubleChanceX2 = probDoubleChanceX2; return this; }
        public MatchPredictionBuilder probOver95Corners(Double probOver95Corners) { this.probOver95Corners = probOver95Corners; return this; }
        public MatchPredictionBuilder probOver45Cards(Double probOver45Cards) { this.probOver45Cards = probOver45Cards; return this; }
        public MatchPredictionBuilder brierScoreOutcome(Double brierScoreOutcome) { this.brierScoreOutcome = brierScoreOutcome; return this; }
        public MatchPredictionBuilder brierScoreBtts(Double brierScoreBtts) { this.brierScoreBtts = brierScoreBtts; return this; }
        public MatchPredictionBuilder brierScoreOver25(Double brierScoreOver25) { this.brierScoreOver25 = brierScoreOver25; return this; }
        public MatchPredictionBuilder brierScoreOver05(Double brierScoreOver05) { this.brierScoreOver05 = brierScoreOver05; return this; }
        public MatchPredictionBuilder brierScoreUnder35(Double brierScoreUnder35) { this.brierScoreUnder35 = brierScoreUnder35; return this; }
        public MatchPredictionBuilder brierScoreCorners(Double brierScoreCorners) { this.brierScoreCorners = brierScoreCorners; return this; }
        public MatchPredictionBuilder brierScoreCards(Double brierScoreCards) { this.brierScoreCards = brierScoreCards; return this; }
        public MatchPredictionBuilder shapValuesJson(String shapValuesJson) { this.shapValuesJson = shapValuesJson; return this; }
        public MatchPredictionBuilder explanationsJson(String explanationsJson) { this.explanationsJson = explanationsJson; return this; }

        public MatchPrediction build() {
            return new MatchPrediction(match, probHomeWin, probDraw, probAwayWin, probBttsYes, probBttsNo, 
                                      probOver25, probUnder25, probOver05, probUnder35, 
                                      probDoubleChance1X, probDoubleChance12, probDoubleChanceX2, 
                                      probOver95Corners, probOver45Cards, brierScoreOutcome, brierScoreBtts, 
                                      brierScoreOver25, brierScoreOver05, brierScoreUnder35, 
                                      brierScoreCorners, brierScoreCards, shapValuesJson, explanationsJson);
        }
    }
}
