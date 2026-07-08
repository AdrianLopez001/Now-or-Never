package com.nowornever.controller;

import com.nowornever.model.User;
import com.nowornever.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable UUID id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public User createUser(@RequestBody User user) {
        if (user.getSubscriptionType() == null) {
            user.setSubscriptionType("FREE");
        }
        if (user.getActiveSubscription() == null) {
            user.setActiveSubscription(true);
        }
        return userRepository.save(user);
    }

    @PutMapping("/{id}/subscription")
    public ResponseEntity<User> toggleSubscription(@PathVariable UUID id, @RequestParam String type) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setSubscriptionType(type.toUpperCase());
                    user.setActiveSubscription(true);
                    userRepository.save(user);
                    return ResponseEntity.ok(user);
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
