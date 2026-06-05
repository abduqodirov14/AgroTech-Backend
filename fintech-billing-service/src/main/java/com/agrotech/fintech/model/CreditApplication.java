package com.agrotech.fintech.model;

import jakarta.persistence.*;
import lombok.Data;

/**
 * Kredit arizasi entity
 */
@Entity
@Table(name = "credit_applications")
@Data
public class CreditApplication {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    private String phone;
    private Double amount;
    private Integer months;
    private String status; // PENDING, APPROVED, REJECTED
    
    // TODO: userInfo field
    // TODO: score field
    // TODO: timestamps
}
