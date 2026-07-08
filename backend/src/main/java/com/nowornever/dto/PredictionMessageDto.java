package com.nowornever.dto;

public class PredictionMessageDto {
    private Long matchApiFootballId;
    
    // Metadata for dynamic creation of teams and matches
    private String homeTeamName;
    private String homeTeamLogo;
    private String awayTeamName;
    private String awayTeamLogo;
    private String matchStatus;
    private String matchDate;
    private String matchRound;
    private Integer homeScore;
    private Integer awayScore;
    
    // Probabilities
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
    
    // Brier Performance Scores
    private Double brierScoreOutcome;
    private Double brierScoreBtts;
    private Double brierScoreOver25;
    private Double brierScoreOver05;
    private Double brierScoreUnder35;
    private Double brierScoreCorners;
    private Double brierScoreCards;
    
    // SHAP explanation values (JSON text)
    private String shapValuesJson;
    
    // Custom explanation (JSON text or natural language text)
    private String explanationsJson;

    public PredictionMessageDto() {}

    public Long getMatchApiFootballId() { return matchApiFootballId; }
    public void setMatchApiFootballId(Long matchApiFootballId) { this.matchApiFootballId = matchApiFootballId; }

    public String getHomeTeamName() { return homeTeamName; }
    public void setHomeTeamName(String homeTeamName) { this.homeTeamName = homeTeamName; }

    public String getHomeTeamLogo() { return homeTeamLogo; }
    public void setHomeTeamLogo(String homeTeamLogo) { this.homeTeamLogo = homeTeamLogo; }

    public String getAwayTeamName() { return awayTeamName; }
    public void setAwayTeamName(String awayTeamName) { this.awayTeamName = awayTeamName; }

    public String getAwayTeamLogo() { return awayTeamLogo; }
    public void setAwayTeamLogo(String awayTeamLogo) { this.awayTeamLogo = awayTeamLogo; }

    public String getMatchStatus() { return matchStatus; }
    public void setMatchStatus(String matchStatus) { this.matchStatus = matchStatus; }

    public String getMatchDate() { return matchDate; }
    public void setMatchDate(String matchDate) { this.matchDate = matchDate; }

    public String getMatchRound() { return matchRound; }
    public void setMatchRound(String matchRound) { this.matchRound = matchRound; }

    public Integer getHomeScore() { return homeScore; }
    public void setHomeScore(Integer homeScore) { this.homeScore = homeScore; }

    public Integer getAwayScore() { return awayScore; }
    public void setAwayScore(Integer awayScore) { this.awayScore = awayScore; }

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
}
