package com.nowornever.controller;

import com.nowornever.config.DatabaseInitializer;
import com.nowornever.model.Match;
import com.nowornever.repository.MatchRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/matches")
@CrossOrigin(origins = "*")
public class MatchController {

    private static final Logger log = LoggerFactory.getLogger(MatchController.class);

    private final MatchRepository matchRepository;
    private final DatabaseInitializer databaseInitializer;

    @Value("${app.football-data.competition:BSA}")
    private String defaultCompetition;

    public MatchController(MatchRepository matchRepository, DatabaseInitializer databaseInitializer) {
        this.matchRepository = matchRepository;
        this.databaseInitializer = databaseInitializer;
    }

    @GetMapping
    public List<Match> getAllMatches() {
        return matchRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Match> getMatchById(@PathVariable UUID id) {
        return matchRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Match createMatch(@RequestBody Match match) {
        return matchRepository.save(match);
    }

    /**
     * Executa o coletor Python (football-data.org → ESPN fallback) e recarrega predições.
     *
     * @param competition Código da competição (opcional). Ex: BSA, PL, CL.
     *                    Se omitido, usa o valor de app.football-data.competition (padrão: BSA).
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshMatches(
            @RequestParam(value = "competition", required = false) String competition) {

        String comp = (competition != null && !competition.isBlank()) ? competition : defaultCompetition;
        log.info("Iniciando refresh de partidas — competição: {}", comp);

        try {
            String projectRoot = System.getenv().getOrDefault("PROJECT_ROOT", System.getProperty("user.dir"));
            java.io.File rootDir = new java.io.File(projectRoot);
            if (rootDir.getName().equals("backend")) {
                rootDir = rootDir.getParentFile();
            }

            String pythonPath = System.getenv().getOrDefault("PYTHON_PATH", 
                new java.io.File(rootDir, "ml-pipeline/venv/bin/python3").exists() ?
                new java.io.File(rootDir, "ml-pipeline/venv/bin/python3").getAbsolutePath() : "python3");

            String scriptPath = new java.io.File(rootDir, "ml-pipeline/src/real_time_collector.py").getAbsolutePath();
            java.io.File pipelineDir = new java.io.File(rootDir, "ml-pipeline");

            ProcessBuilder pb = new ProcessBuilder(
                    pythonPath, scriptPath, "--competition", comp
            );
            pb.directory(pipelineDir);
            pb.redirectErrorStream(true);

            Process process = pb.start();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    log.info("[Python Collector] {}", line);
                }
            }

            int exitCode = process.waitFor();
            log.info("Python collector finalizado com exit code: {}", exitCode);

            if (exitCode == 0) {
                databaseInitializer.reloadPredictions();
                return ResponseEntity.ok(matchRepository.findAll());
            } else {
                return ResponseEntity.internalServerError()
                        .body("Python collector falhou com exit code: " + exitCode);
            }
        } catch (Exception e) {
            log.error("Falha ao executar o coletor: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body("Erro interno no processo de refresh: " + e.getMessage());
        }
    }
}

