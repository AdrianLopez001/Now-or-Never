package com.nowornever.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "subscription_type", nullable = false)
    private String subscriptionType; // "FREE", "PREMIUM"

    @Column(name = "active_subscription", nullable = false)
    private Boolean activeSubscription;

    public User() {}

    public User(String name, String email, String subscriptionType, Boolean activeSubscription) {
        this.name = name;
        this.email = email;
        this.subscriptionType = subscriptionType;
        this.activeSubscription = activeSubscription;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSubscriptionType() { return subscriptionType; }
    public void setSubscriptionType(String subscriptionType) { this.subscriptionType = subscriptionType; }

    public Boolean getActiveSubscription() { return activeSubscription; }
    public void setActiveSubscription(Boolean activeSubscription) { this.activeSubscription = activeSubscription; }

    // Builder helper
    public static UserBuilder builder() {
        return new UserBuilder();
    }

    public static class UserBuilder {
        private String name;
        private String email;
        private String subscriptionType;
        private Boolean activeSubscription;

        public UserBuilder name(String name) { this.name = name; return this; }
        public UserBuilder email(String email) { this.email = email; return this; }
        public UserBuilder subscriptionType(String subscriptionType) { this.subscriptionType = subscriptionType; return this; }
        public UserBuilder activeSubscription(Boolean activeSubscription) { this.activeSubscription = activeSubscription; return this; }

        public User build() {
            return new User(name, email, subscriptionType, activeSubscription);
        }
    }
}
