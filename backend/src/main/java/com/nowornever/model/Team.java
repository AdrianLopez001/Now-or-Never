package com.nowornever.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "teams")
public class Team {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "api_football_id", unique = true)
    private Long apiFootballId;

    public Team() {}

    public Team(String name, String logoUrl, Long apiFootballId) {
        this.name = name;
        this.logoUrl = logoUrl;
        this.apiFootballId = apiFootballId;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLogoUrl() {
        return logoUrl;
    }

    public void setLogoUrl(String logoUrl) {
        this.logoUrl = logoUrl;
    }

    public Long getApiFootballId() {
        return apiFootballId;
    }

    public void setApiFootballId(Long apiFootballId) {
        this.apiFootballId = apiFootballId;
    }

    // Builder pattern helper
    public static TeamBuilder builder() {
        return new TeamBuilder();
    }

    public static class TeamBuilder {
        private String name;
        private String logoUrl;
        private Long apiFootballId;

        public TeamBuilder name(String name) {
            this.name = name;
            return this;
        }

        public TeamBuilder logoUrl(String logoUrl) {
            this.logoUrl = logoUrl;
            return this;
        }

        public TeamBuilder apiFootballId(Long apiFootballId) {
            this.apiFootballId = apiFootballId;
            return this;
        }

        public Team build() {
            return new Team(name, logoUrl, apiFootballId);
        }
    }
}
