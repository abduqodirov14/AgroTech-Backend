package com.agrotech.fintech.repository;

import com.agrotech.fintech.model.CreditApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Credit application repository
 */
@Repository
public interface CreditApplicationRepository extends JpaRepository<CreditApplication, String> {
    
    // TODO: findByPhone metodi
    // TODO: findByStatus metodi
    // TODO: findByPhoneAndStatus metodi
}
