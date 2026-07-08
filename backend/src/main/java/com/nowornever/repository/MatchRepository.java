package com.nowornever.repository;

import com.nowornever.model.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MatchRepository extends JpaRepository<Match, UUID> {
    Optional<Match> findByApiFootballId(Long apiFootballId);
    List<Match> findByStatus(String status);
    List<Match> findBySeason(Integer season);
    List<Match> findByStatusAndSeasonOrderByMatchDateAsc(String status, Integer season);
}
