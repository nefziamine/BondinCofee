package com.example.backend.repository;

import com.example.backend.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

import org.springframework.stereotype.Repository;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByReceiverIdOrIsBroadcastTrueOrderByTimestampAsc(Long receiverId);
    List<Message> findBySenderIdOrReceiverIdOrIsBroadcastTrueOrderByTimestampAsc(Long senderId, Long receiverId);
}
