package com.insureco;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPubSub;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class KafkaConsumerService {

    @Value("${kafka.broker:localhost:6379}")
    private String kafkaBroker;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Jedis jedis;
    private final Gson gson = new Gson();
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    
    private static final double AUTO_APPROVE_THRESHOLD = 5000.0;

    @PostConstruct
    public void init() {
        String[] parts = kafkaBroker.split(":");
        String host = parts[0];
        int port = Integer.parseInt(parts[1]);
        
        jedis = new Jedis(host, port);
        
        System.out.println("✅ Connected to Kafka stub (Redis)");
        
        // Start consumer in background thread
        executor.submit(this::startConsumer);
    }

    private void startConsumer() {
        System.out.println("📥 Starting Kafka consumer for claims.submitted");
        
        try {
            jedis.subscribe(new JedisPubSub() {
                @Override
                public void onMessage(String channel, String message) {
                    try {
                        processClaimEvent(message);
                    } catch (Exception e) {
                        System.err.println("❌ Error processing message: " + e.getMessage());
                        e.printStackTrace();
                    }
                }
            }, "kafka:claims.submitted:notifications");
        } catch (Exception e) {
            System.err.println("❌ Consumer error: " + e.getMessage());
        }
    }

    private void processClaimEvent(String message) {
        JsonObject event = gson.fromJson(message, JsonObject.class);
        JsonObject value = event.getAsJsonObject("value");
        
        String claimId = value.get("claimId").getAsString();
        String policyId = value.get("policyId").getAsString();
        double amount = value.get("amount").getAsDouble();
        String status = value.get("status").getAsString();
        
        System.out.println("📨 Processing claim: " + claimId + " (amount: $" + amount + ")");
        
        // Run triage rules
        String newStatus;
        String adjusterID;
        
        if (amount < AUTO_APPROVE_THRESHOLD) {
            newStatus = "AUTO_APPROVED";
            adjusterID = "SYS";
            System.out.println("✅ Auto-approved: amount $" + amount + " < threshold $" + AUTO_APPROVE_THRESHOLD);
        } else {
            newStatus = "UNDER_REVIEW";
            adjusterID = assignAdjuster();
            System.out.println("👤 Assigned to adjuster: " + adjusterID);
        }
        
        // Update claim status in database
        try {
            String sql = "UPDATE claims SET status = ?, adjuster_id = ?, updated_at = NOW() WHERE id = ?::uuid";
            int updated = jdbcTemplate.update(sql, newStatus, adjusterID, claimId);
            
            if (updated > 0) {
                System.out.println("✅ Claim " + claimId + " updated to " + newStatus);
                
                // Insert audit log
                String auditSql = "INSERT INTO audit_log (claim_id, actor, action, details) VALUES (?::uuid, ?, ?, ?::jsonb)";
                String details = String.format("{\"status\": \"%s\", \"adjuster\": \"%s\", \"amount\": %.2f}", 
                    newStatus, adjusterID, amount);
                jdbcTemplate.update(auditSql, claimId, "SYSTEM", "STATUS_UPDATED", details);
                
                // Produce status update event (stub)
                produceStatusUpdate(claimId, policyId, newStatus);
            }
        } catch (Exception e) {
            System.err.println("❌ Database error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String assignAdjuster() {
        // Simple round-robin assignment (stub)
        String[] adjusters = {"ADJ-001", "ADJ-002", "ADJ-003"};
        int index = (int) (System.currentTimeMillis() % adjusters.length);
        return adjusters[index];
    }

    private void produceStatusUpdate(String claimId, String policyId, String status) {
        try {
            String[] parts = kafkaBroker.split(":");
            String host = parts[0];
            int port = Integer.parseInt(parts[1]);
            Jedis producer = new Jedis(host, port);
            
            JsonObject event = new JsonObject();
            event.addProperty("claimId", claimId);
            event.addProperty("policyId", policyId);
            event.addProperty("status", status);
            event.addProperty("timestamp", java.time.Instant.now().toString());
            
            String message = gson.toJson(event);
            producer.lpush("kafka:claim.status_updated", message);
            producer.publish("kafka:claim.status_updated:notifications", message);
            
            System.out.println("📤 Produced status update event: " + status);
            producer.close();
        } catch (Exception e) {
            System.err.println("⚠️  Failed to produce status update: " + e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 60000)
    public void healthCheck() {
        try {
            String result = jdbcTemplate.queryForObject("SELECT 1", String.class);
            System.out.println("💓 Health check: Database OK");
        } catch (Exception e) {
            System.err.println("❌ Health check failed: " + e.getMessage());
        }
    }
}

// Made with Bob
