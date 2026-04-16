package com.example.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.example.backend.model.ProfileUser;

import java.util.Optional;

@Repository
public interface ProfileRepository extends JpaRepository<ProfileUser, Long> {
    Optional<ProfileUser> findByUserId(Long userId);
}
