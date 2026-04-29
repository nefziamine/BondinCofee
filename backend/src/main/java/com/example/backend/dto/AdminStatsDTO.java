package com.example.backend.dto;

import java.util.Map;
import com.example.backend.model.User;

public class AdminStatsDTO {
    private long totalActiveUsers;
    private long openTickets;
    private long ticketsResolvedThisWeek;
    private double averageResponseTime;
    private Map<String, Long> faqRankings;
    private Map<String, Integer> departmentLoad;
    private Map<String, Double> reclamationTypes;
    private long newUsersThisMonth;
    private java.util.List<User> activeUserList;
    private java.util.List<com.example.backend.model.Reclamation> openTicketList;
    private java.util.List<com.example.backend.model.Reclamation> resolvedTicketList;
    private Map<String, String> userPhotos;

    // Getters and Setters
    public Map<String, String> getUserPhotos() { return userPhotos; }
    public void setUserPhotos(Map<String, String> userPhotos) { this.userPhotos = userPhotos; }

    public java.util.List<User> getActiveUserList() { return activeUserList; }
    public void setActiveUserList(java.util.List<User> activeUserList) { this.activeUserList = activeUserList; }
    public java.util.List<com.example.backend.model.Reclamation> getOpenTicketList() { return openTicketList; }
    public void setOpenTicketList(java.util.List<com.example.backend.model.Reclamation> openTicketList) { this.openTicketList = openTicketList; }
    public java.util.List<com.example.backend.model.Reclamation> getResolvedTicketList() { return resolvedTicketList; }
    public void setResolvedTicketList(java.util.List<com.example.backend.model.Reclamation> resolvedTicketList) { this.resolvedTicketList = resolvedTicketList; }

    public long getTotalActiveUsers() { return totalActiveUsers; }
    public void setTotalActiveUsers(long totalActiveUsers) { this.totalActiveUsers = totalActiveUsers; }
    public long getOpenTickets() { return openTickets; }
    public void setOpenTickets(long openTickets) { this.openTickets = openTickets; }
    public long getTicketsResolvedThisWeek() { return ticketsResolvedThisWeek; }
    public void setTicketsResolvedThisWeek(long ticketsResolvedThisWeek) { this.ticketsResolvedThisWeek = ticketsResolvedThisWeek; }
    public double getAverageResponseTime() { return averageResponseTime; }
    public void setAverageResponseTime(double averageResponseTime) { this.averageResponseTime = averageResponseTime; }
    public Map<String, Long> getFaqRankings() { return faqRankings; }
    public void setFaqRankings(Map<String, Long> faqRankings) { this.faqRankings = faqRankings; }
    public Map<String, Integer> getDepartmentLoad() { return departmentLoad; }
    public void setDepartmentLoad(Map<String, Integer> departmentLoad) { this.departmentLoad = departmentLoad; }
    public Map<String, Double> getReclamationTypes() { return reclamationTypes; }
    public void setReclamationTypes(Map<String, Double> reclamationTypes) { this.reclamationTypes = reclamationTypes; }
    public long getNewUsersThisMonth() { return newUsersThisMonth; }
    public void setNewUsersThisMonth(long newUsersThisMonth) { this.newUsersThisMonth = newUsersThisMonth; }
}
