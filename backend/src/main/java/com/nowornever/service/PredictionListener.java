package com.nowornever.service;

import com.nowornever.dto.PredictionMessageDto;
import com.nowornever.model.Match;
import com.nowornever.model.MatchPrediction;
import com.nowornever.repository.MatchPredictionRepository;
import com.nowornever.repository.MatchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@ConditionalOnProperty(name = "app.rabbitmq.enabled", havingValue = "true")
public class PredictionListener {

    private static final Logger log = LoggerFactory.getLogger(PredictionListener.class);

    private final MatchRepository matchRepository;
    private final MatchPredictionRepository predictionRepository;

    public PredictionListener(MatchRepository matchRepository, MatchPredictionRepository predictionRepository) {
        this.matchRepository = matchRepository;
        this.predictionRepository = predictionRepository;
    }

    @RabbitListener(queues = "${app.rabbitmq.predictions-queue}")
    @Transactional
    public void receivePrediction(PredictionMessageDto dto) {
        log.info("Received prediction update for match API Football ID: {}", dto.getMatchApiFootballId());

        Optional<Match> matchOpt = matchRepository.findByApiFootballId(dto.getMatchApiFootballId());
        if (matchOpt.isEmpty()) {
            log.warn("Match with API Football ID {} not found in database. Prediction will be ignored.", dto.getMatchApiFootballId());
            return;
        }

        Match match = matchOpt.get();
        Optional<MatchPrediction> predictionOpt = predictionRepository.findByMatchId(match.getId());
        
        MatchPrediction prediction = predictionOpt.orElseGet(() -> {
            MatchPrediction newPred = new MatchPrediction();
            newPred.setMatch(match);
            return newPred;
        });

        prediction.setProbHomeWin(dto.getProbHomeWin());
        prediction.setProbDraw(dto.getProbDraw());
        prediction.setProbAwayWin(dto.getProbAwayWin());
        prediction.setProbBttsYes(dto.getProbBttsYes());
        prediction.setProbBttsNo(dto.getProbBttsNo());
        prediction.setProbOver25(dto.getProbOver25());
        prediction.setProbUnder25(dto.getProbUnder25());
        
        // Expanded markets
        prediction.setProbOver05(dto.getProbOver05());
        prediction.setProbUnder35(dto.getProbUnder35());
        prediction.setProbDoubleChance1X(dto.getProbDoubleChance1X());
        prediction.setProbDoubleChance12(dto.getProbDoubleChance12());
        prediction.setProbDoubleChanceX2(dto.getProbDoubleChanceX2());
        prediction.setProbOver95Corners(dto.getProbOver95Corners());
        prediction.setProbOver45Cards(dto.getProbOver45Cards());

        // Performance metrics
        prediction.setBrierScoreOutcome(dto.getBrierScoreOutcome());
        prediction.setBrierScoreBtts(dto.getBrierScoreBtts());
        prediction.setBrierScoreOver25(dto.getBrierScoreOver25());
        prediction.setBrierScoreOver05(dto.getBrierScoreOver05());
        prediction.setBrierScoreUnder35(dto.getBrierScoreUnder35());
        prediction.setBrierScoreCorners(dto.getBrierScoreCorners());
        prediction.setBrierScoreCards(dto.getBrierScoreCards());
        
        prediction.setShapValuesJson(dto.getShapValuesJson());
        prediction.setExplanationsJson(dto.getExplanationsJson());

        predictionRepository.save(prediction);
        log.info("Saved prediction for match ID: {}", match.getId());
    }
}
