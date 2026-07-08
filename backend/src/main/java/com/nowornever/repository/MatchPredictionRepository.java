package com.nowornever.repository;

import com.nowornever.model.MatchPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchPredictionRepository extends JpaRepository<MatchPrediction, UUID> {
    Optional<MatchPrediction> findByMatchId(UUID matchId);
}
