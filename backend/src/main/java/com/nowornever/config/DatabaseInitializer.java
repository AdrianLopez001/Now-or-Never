package com.nowornever.config;

import com.nowornever.model.Match;
import com.nowornever.model.Team;
import com.nowornever.model.User;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nowornever.dto.PredictionMessageDto;
import com.nowornever.model.MatchPrediction;
import com.nowornever.repository.MatchPredictionRepository;
import com.nowornever.repository.MatchRepository;
import com.nowornever.repository.TeamRepository;
import com.nowornever.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DatabaseInitializer.class);

    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;
    private final UserRepository userRepository;
    private final MatchPredictionRepository matchPredictionRepository;

    public DatabaseInitializer(TeamRepository teamRepository, MatchRepository matchRepository, UserRepository userRepository, MatchPredictionRepository matchPredictionRepository) {
        this.teamRepository = teamRepository;
        this.matchRepository = matchRepository;
        this.userRepository = userRepository;
        this.matchPredictionRepository = matchPredictionRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Enforcing clean start for World Cup 2026 matches...");
        matchPredictionRepository.deleteAll();
        matchRepository.deleteAll();
        teamRepository.deleteAll();
        userRepository.deleteAll();

        // Seed a default personal profile
        User adminUser = User.builder()
                .name("Acesso Pessoal")
                .email("admin@nowornever.com")
                .subscriptionType("PREMIUM")
                .activeSubscription(true)
                .build();
        userRepository.save(adminUser);

        seedPredictions();
    }

    private void seedPredictions() {
        if (matchPredictionRepository.count() > 0) {
            return;
        }
        reloadPredictions();
    }

    public void reloadPredictions() {
        log.info("Loading pre-calculated predictions from json...");
        try {
            ObjectMapper mapper = new ObjectMapper();
            File file = new File("/Users/Adrian/Desktop/estudos/black king/backend/src/main/resources/predictions.json");
            InputStream is = getClass().getResourceAsStream("/predictions.json");

            List<PredictionMessageDto> predictions = null;
            if (file.exists()) {
                predictions = mapper.readValue(file, new TypeReference<List<PredictionMessageDto>>() {});
            } else if (is != null) {
                predictions = mapper.readValue(is, new TypeReference<List<PredictionMessageDto>>() {});
            }

            if (predictions != null) {
                // Prune completed/deleted matches from local database to save space
                List<Long> activeApiFootballIds = predictions.stream()
                        .map(PredictionMessageDto::getMatchApiFootballId)
                        .collect(Collectors.toList());

                List<Match> allDbMatches = matchRepository.findAll();
                for (Match m : allDbMatches) {
                    if (!activeApiFootballIds.contains(m.getApiFootballId())) {
                        log.info("Pruning finished match to save data: {} vs {}", m.getHomeTeam().getName(), m.getAwayTeam().getName());
                        matchPredictionRepository.findByMatchId(m.getId())
                                .ifPresent(matchPredictionRepository::delete);
                        matchRepository.delete(m);
                    }
                }

                for (PredictionMessageDto dto : predictions) {
                    Optional<Match> matchOpt = matchRepository.findByApiFootballId(dto.getMatchApiFootballId());
                    Match match;
                    if (matchOpt.isPresent()) {
                        match = matchOpt.get();
                        if (dto.getHomeScore() != null) match.setScoreHome(dto.getHomeScore());
                        if (dto.getAwayScore() != null) match.setScoreAway(dto.getAwayScore());
                        if (dto.getMatchStatus() != null) match.setStatus(dto.getMatchStatus());
                        matchRepository.save(match);
                    } else {
                        // Dynamically create teams
                        Team homeTeam = teamRepository.findByApiFootballId(dto.getMatchApiFootballId() * 10 + 1)
                            .orElseGet(() -> {
                                Team t = new Team();
                                t.setName(dto.getHomeTeamName() != null ? dto.getHomeTeamName() : "Home Team " + dto.getMatchApiFootballId());
                                t.setLogoUrl(dto.getHomeTeamLogo() != null ? dto.getHomeTeamLogo() : "https://crests.thesportsdb.com/w/200/generic.png");
                                t.setApiFootballId(dto.getMatchApiFootballId() * 10 + 1);
                                return teamRepository.save(t);
                            });

                        Team awayTeam = teamRepository.findByApiFootballId(dto.getMatchApiFootballId() * 10 + 2)
                            .orElseGet(() -> {
                                Team t = new Team();
                                t.setName(dto.getAwayTeamName() != null ? dto.getAwayTeamName() : "Away Team " + dto.getMatchApiFootballId());
                                t.setLogoUrl(dto.getAwayTeamLogo() != null ? dto.getAwayTeamLogo() : "https://crests.thesportsdb.com/w/200/generic.png");
                                t.setApiFootballId(dto.getMatchApiFootballId() * 10 + 2);
                                return teamRepository.save(t);
                            });

                        // Dynamically create match
                        match = new Match();
                        match.setApiFootballId(dto.getMatchApiFootballId());
                        match.setHomeTeam(homeTeam);
                        match.setAwayTeam(awayTeam);
                        match.setMatchRound(dto.getMatchRound() != null ? dto.getMatchRound() : "Rodada");
                        match.setSeason(2026);
                        
                        String statusStr = dto.getMatchStatus() != null ? dto.getMatchStatus() : "SCHEDULED";
                        match.setStatus(statusStr);
                        
                        if (dto.getHomeScore() != null) match.setScoreHome(dto.getHomeScore());
                        if (dto.getAwayScore() != null) match.setScoreAway(dto.getAwayScore());
                        
                        try {
                            String dateStr = dto.getMatchDate() != null ? dto.getMatchDate() : "2026-07-07T12:00:00Z";
                            match.setMatchDate(java.time.Instant.parse(dateStr).atZone(java.time.ZoneId.systemDefault()).toLocalDateTime());
                        } catch (Exception ex) {
                            match.setMatchDate(java.time.LocalDateTime.now());
                        }
                        
                        match = matchRepository.save(match);
                    }
                    
                    // Clean up any existing prediction for this match to avoid Unique constraint checks
                    matchPredictionRepository.findByMatchId(match.getId()).ifPresent(matchPredictionRepository::delete);

                    MatchPrediction pred = MatchPrediction.builder()
                            .match(match)
                            .probHomeWin(dto.getProbHomeWin())
                            .probDraw(dto.getProbDraw())
                            .probAwayWin(dto.getProbAwayWin())
                            .probBttsYes(dto.getProbBttsYes())
                            .probBttsNo(dto.getProbBttsNo())
                            .probOver25(dto.getProbOver25())
                            .probUnder25(dto.getProbUnder25())
                            .probOver05(dto.getProbOver05())
                            .probUnder35(dto.getProbUnder35())
                            .probDoubleChance1X(dto.getProbDoubleChance1X())
                            .probDoubleChance12(dto.getProbDoubleChance12())
                            .probDoubleChanceX2(dto.getProbDoubleChanceX2())
                            .probOver95Corners(dto.getProbOver95Corners())
                            .probOver45Cards(dto.getProbOver45Cards())
                            .brierScoreOutcome(dto.getBrierScoreOutcome())
                            .brierScoreBtts(dto.getBrierScoreBtts())
                            .brierScoreOver25(dto.getBrierScoreOver25())
                            .brierScoreOver05(dto.getBrierScoreOver05())
                            .brierScoreUnder35(dto.getBrierScoreUnder35())
                            .brierScoreCorners(dto.getBrierScoreCorners())
                            .brierScoreCards(dto.getBrierScoreCards())
                            .shapValuesJson(dto.getShapValuesJson())
                            .explanationsJson(dto.getExplanationsJson())
                            .build();
                    matchPredictionRepository.save(pred);
                    log.info("Loaded prediction for match ID: {}", match.getId());
                }
            } else {
                log.warn("No predictions.json found. Creating simple default predictions as fallback.");
                createDefaultPredictions();
            }
        } catch (Exception e) {
            log.error("Failed to load predictions.json: {}", e.getMessage(), e);
            createDefaultPredictions();
        }
    }

    private void createDefaultPredictions() {
        log.info("Creating default predictions as fallback...");
        List<Match> matches = matchRepository.findAll();
        for (Match match : matches) {
            // Seed predictions based on names for consistency
            double factor = Math.abs(match.getHomeTeam().getName().hashCode() % 10) / 10.0;
            double homeProb = 0.3 + 0.5 * factor;
            double drawProb = 0.2 + 0.1 * factor;
            double awayProb = 1.0 - homeProb - drawProb;
            
            MatchPrediction pred = MatchPrediction.builder()
                    .match(match)
                    .probHomeWin(homeProb)
                    .probDraw(drawProb)
                    .probAwayWin(awayProb)
                    .probBttsYes(0.4 + 0.2 * factor)
                    .probBttsNo(0.6 - 0.2 * factor)
                    .probOver25(0.3 + 0.4 * factor)
                    .probUnder25(0.7 - 0.4 * factor)
                    .probOver05(0.7 + 0.2 * factor)
                    .probUnder35(0.6 - 0.2 * factor)
                    .probDoubleChance1X(homeProb + drawProb)
                    .probDoubleChance12(homeProb + awayProb)
                    .probDoubleChanceX2(drawProb + awayProb)
                    .probOver95Corners(0.45 + 0.1 * factor)
                    .probOver45Cards(0.35 + 0.15 * factor)
                    .shapValuesJson("{\"home_win\":{\"home_form\":0.05,\"away_form\":-0.02,\"xg_home_avg\":0.08,\"xg_away_avg\":-0.03}}")
                    .explanationsJson("{\"outcome_summary\":\"O mandante entra como favorito devido ao seu sólido volume de gols esperados (xG) nos confrontos mais recentes.\",\"btts_summary\":\"Espera-se uma partida equilibrada onde ambos os times buscam o ataque.\",\"goals_summary\":\"Tendência moderada de over 2.5 gols.\"}")
                    .build();
            matchPredictionRepository.save(pred);
        }
    }
}
