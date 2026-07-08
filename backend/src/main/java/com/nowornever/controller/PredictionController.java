package com.nowornever.controller;

import com.nowornever.model.MatchPrediction;
import com.nowornever.model.User;
import com.nowornever.repository.MatchPredictionRepository;
import com.nowornever.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/predictions")
@CrossOrigin(origins = "*")
public class PredictionController {

    private final MatchPredictionRepository predictionRepository;
    private final UserRepository userRepository;

    public PredictionController(MatchPredictionRepository predictionRepository, UserRepository userRepository) {
        this.predictionRepository = predictionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/match/{matchId}")
    public ResponseEntity<?> getPredictionByMatchId(
            @PathVariable UUID matchId,
            @RequestParam(required = false) UUID userId) {
        
        Optional<MatchPrediction> predictionOpt = predictionRepository.findByMatchId(matchId);
        if (predictionOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        MatchPrediction prediction = predictionOpt.get();

        // Full access personal bypass: return predictions unmasked directly
        return ResponseEntity.ok(prediction);
    }
}
