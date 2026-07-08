package com.nowornever.controller;

import com.nowornever.model.MatchPrediction;
import com.nowornever.repository.MatchPredictionRepository;
import com.nowornever.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PredictionControllerTest {

    @Mock
    private MatchPredictionRepository predictionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PredictionController predictionController;

    @Test
    void shouldReturnPredictionWhenMatchExists() {
        // Arrange
        UUID matchId = UUID.randomUUID();
        MatchPrediction mockPrediction = new MatchPrediction();
        
        when(predictionRepository.findByMatchId(matchId)).thenReturn(Optional.of(mockPrediction));

        // Act
        ResponseEntity<?> response = predictionController.getPredictionByMatchId(matchId, null);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(mockPrediction, response.getBody());
        
        verify(predictionRepository, times(1)).findByMatchId(matchId);
    }

    @Test
    void shouldReturnNotFoundWhenMatchDoesNotExist() {
        // Arrange
        UUID matchId = UUID.randomUUID();
        when(predictionRepository.findByMatchId(matchId)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<?> response = predictionController.getPredictionByMatchId(matchId, null);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(predictionRepository, times(1)).findByMatchId(matchId);
    }
}
