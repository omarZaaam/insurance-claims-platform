package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
)

var ctx = context.Background()
var rdb *redis.Client

type ClaimEvent struct {
	ClaimID            string  `json:"claimId"`
	PolicyID           string  `json:"policyId"`
	ClaimType          string  `json:"claimType"`
	Amount             float64 `json:"amount"`
	Status             string  `json:"status"`
	PolicyHolderEmail  string  `json:"policyHolderEmail"`
	PolicyHolderName   string  `json:"policyHolderName"`
	Timestamp          string  `json:"timestamp"`
}

func main() {
	// Initialize Redis (Kafka stub)
	kafkaBroker := getEnv("KAFKA_BROKER", "localhost:6379")
	
	rdb = redis.NewClient(&redis.Options{
		Addr:     kafkaBroker,
		Password: "",
		DB:       0,
	})

	// Test connection
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		log.Printf("⚠️  Warning: Could not connect to Redis: %v", err)
	} else {
		log.Println("✅ Connected to Kafka stub (Redis)")
	}

	// Start Kafka consumer in background
	go consumeClaimEvents()

	// HTTP server for health checks
	http.HandleFunc("/health", healthHandler)
	
	port := getEnv("PORT", "8002")
	log.Printf("🚀 Notification Service running on port %s", port)
	log.Printf("📨 Kafka broker: %s", kafkaBroker)
	log.Printf("📧 SMTP: %s:%s", getEnv("SMTP_HOST", "mailhog"), getEnv("SMTP_PORT", "1025"))
	
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	status := "healthy"
	kafkaStatus := "connected"
	
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		kafkaStatus = "disconnected"
		status = "degraded"
	}
	
	response := map[string]interface{}{
		"status":    status,
		"service":   "notification-service",
		"kafka":     kafkaStatus,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func consumeClaimEvents() {
	topic := "kafka:claims.submitted:notifications"
	
	log.Printf("📥 Starting Kafka consumer for claims.submitted")
	
	pubsub := rdb.Subscribe(ctx, topic)
	defer pubsub.Close()
	
	ch := pubsub.Channel()
	
	for msg := range ch {
		var event map[string]interface{}
		if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
			log.Printf("❌ Error parsing message: %v", err)
			continue
		}
		
		// Extract claim event
		value, ok := event["value"].(map[string]interface{})
		if !ok {
			log.Printf("⚠️  Invalid event format")
			continue
		}
		
		claimEvent := ClaimEvent{
			ClaimID:           getString(value, "claimId"),
			PolicyID:          getString(value, "policyId"),
			ClaimType:         getString(value, "claimType"),
			Amount:            getFloat(value, "amount"),
			Status:            getString(value, "status"),
			PolicyHolderEmail: getString(value, "policyHolderEmail"),
			PolicyHolderName:  getString(value, "policyHolderName"),
			Timestamp:         getString(value, "timestamp"),
		}
		
		log.Printf("📨 Received claim event: %s (status: %s)", claimEvent.ClaimID, claimEvent.Status)
		
		// Send notifications
		go sendEmailNotification(claimEvent)
		go sendSMSNotification(claimEvent)
	}
}

func sendEmailNotification(event ClaimEvent) {
	// Stub: In production, use AWS SES
	log.Printf("📧 Email sent to %s: Claim %s submitted successfully", 
		event.PolicyHolderEmail, event.ClaimID)
	
	// Simulate email sending delay
	time.Sleep(100 * time.Millisecond)
	
	log.Printf("✅ Email delivered to %s", event.PolicyHolderEmail)
}

func sendSMSNotification(event ClaimEvent) {
	// Stub: In production, use Twilio
	log.Printf("📱 SMS sent: Claim %s submitted. Ref: INS-2026-%s", 
		event.ClaimID, event.ClaimID[:8])
	
	// Simulate SMS sending delay
	time.Sleep(150 * time.Millisecond)
	
	log.Printf("✅ SMS delivered")
}

func getString(m map[string]interface{}, key string) string {
	if val, ok := m[key].(string); ok {
		return val
	}
	return ""
}

func getFloat(m map[string]interface{}, key string) float64 {
	if val, ok := m[key].(float64); ok {
		return val
	}
	return 0
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Made with Bob
