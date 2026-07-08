package com.nowornever.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "matches")
public class Match {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "home_team_id", nullable = false)
    private Team homeTeam;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "away_team_id", nullable = false)
    private Team awayTeam;

    @Column(name = "match_date", nullable = false)
    private LocalDateTime matchDate;

    @Column(nullable = false)
    private String status; // SCHEDULED, LIVE, FINISHED

    @Column(name = "score_home")
    private Integer scoreHome;

    @Column(name = "score_away")
    private Integer scoreAway;

    @Column(name = "match_round")
    private String matchRound; // e.g., "Rodada 1"

    @Column(nullable = false)
    private Integer season;

    @Column(name = "api_football_id", unique = true)
    private Long apiFootballId;

    public Match() {}

    public Match(Team homeTeam, Team awayTeam, LocalDateTime matchDate, String status, Integer scoreHome, Integer scoreAway, String matchRound, Integer season, Long apiFootballId) {
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.matchDate = matchDate;
        this.status = status;
        this.scoreHome = scoreHome;
        this.scoreAway = scoreAway;
        this.matchRound = matchRound;
        this.season = season;
        this.apiFootballId = apiFootballId;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Team getHomeTeam() { return homeTeam; }
    public void setHomeTeam(Team homeTeam) { this.homeTeam = homeTeam; }

    public Team getAwayTeam() { return awayTeam; }
    public void setAwayTeam(Team awayTeam) { this.awayTeam = awayTeam; }

    public LocalDateTime getMatchDate() { return matchDate; }
    public void setMatchDate(LocalDateTime matchDate) { this.matchDate = matchDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getScoreHome() { return scoreHome; }
    public void setScoreHome(Integer scoreHome) { this.scoreHome = scoreHome; }

    public Integer getScoreAway() { return scoreAway; }
    public void setScoreAway(Integer scoreAway) { this.scoreAway = scoreAway; }

    public String getMatchRound() { return matchRound; }
    public void setMatchRound(String matchRound) { this.matchRound = matchRound; }

    public Integer getSeason() { return season; }
    public void setSeason(Integer season) { this.season = season; }

    public Long getApiFootballId() { return apiFootballId; }
    public void setApiFootballId(Long apiFootballId) { this.apiFootballId = apiFootballId; }

    // Builder helper
    public static MatchBuilder builder() {
        return new MatchBuilder();
    }

    public static class MatchBuilder {
        private Team homeTeam;
        private Team awayTeam;
        private LocalDateTime matchDate;
        private String status;
        private Integer scoreHome;
        private Integer scoreAway;
        private String matchRound;
        private Integer season;
        private Long apiFootballId;

        public MatchBuilder homeTeam(Team homeTeam) { this.homeTeam = homeTeam; return this; }
        public MatchBuilder awayTeam(Team awayTeam) { this.awayTeam = awayTeam; return this; }
        public MatchBuilder matchDate(LocalDateTime matchDate) { this.matchDate = matchDate; return this; }
        public MatchBuilder status(String status) { this.status = status; return this; }
        public MatchBuilder scoreHome(Integer scoreHome) { this.scoreHome = scoreHome; return this; }
        public MatchBuilder scoreAway(Integer scoreAway) { this.scoreAway = scoreAway; return this; }
        public MatchBuilder matchRound(String matchRound) { this.matchRound = matchRound; return this; }
        public MatchBuilder season(Integer season) { this.season = season; return this; }
        public MatchBuilder apiFootballId(Long apiFootballId) { this.apiFootballId = apiFootballId; return this; }

        public Match build() {
            return new Match(homeTeam, awayTeam, matchDate, status, scoreHome, scoreAway, matchRound, season, apiFootballId);
        }
    }
}
