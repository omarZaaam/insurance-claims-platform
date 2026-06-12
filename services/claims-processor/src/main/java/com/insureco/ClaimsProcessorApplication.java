package com.insureco;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ClaimsProcessorApplication {
    public static void main(String[] args) {
        SpringApplication.run(ClaimsProcessorApplication.class, args);
        System.out.println("🚀 Claims Processor started");
    }
}

// Made with Bob
