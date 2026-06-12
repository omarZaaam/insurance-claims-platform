-- InsureCo Database Schema
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id VARCHAR(50) NOT NULL,
    claim_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
    amount DECIMAL(10, 2) NOT NULL,
    incident_date DATE NOT NULL,
    description TEXT,
    adjuster_id VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    
    CONSTRAINT chk_status CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'AUTO_APPROVED', 'APPROVED', 'REJECTED', 'CLOSED')),
    CONSTRAINT chk_claim_type CHECK (claim_type IN ('AUTO_COLLISION', 'AUTO_COMPREHENSIVE', 'HOME_PROPERTY', 'HOME_LIABILITY', 'HEALTH_MEDICAL', 'LIFE'))
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    virus_scan_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    uploaded_by VARCHAR(100) NOT NULL,
    
    CONSTRAINT chk_virus_scan CHECK (virus_scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'ERROR'))
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    actor VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    sent_at TIMESTAMP,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_notification_type CHECK (notification_type IN ('EMAIL', 'SMS', 'PUSH')),
    CONSTRAINT chk_notification_status CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'CANCELLED'))
);

-- Policies table (for reference)
CREATE TABLE IF NOT EXISTS policies (
    id VARCHAR(50) PRIMARY KEY,
    policy_holder_name VARCHAR(255) NOT NULL,
    policy_holder_email VARCHAR(255) NOT NULL,
    policy_holder_phone VARCHAR(20),
    policy_type VARCHAR(50) NOT NULL,
    coverage_amount DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_policy_status CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'))
);

-- Indexes for performance
CREATE INDEX idx_claims_policy_id ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_documents_claim_id ON documents(claim_id);
CREATE INDEX idx_audit_log_claim_id ON audit_log(claim_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_notifications_claim_id ON notifications(claim_id);
CREATE INDEX idx_notifications_status ON notifications(status) WHERE status = 'PENDING';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for claims table
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample policies for testing
INSERT INTO policies (id, policy_holder_name, policy_holder_email, policy_holder_phone, policy_type, coverage_amount, status, start_date, end_date)
VALUES 
    ('POL-8821', 'John Doe', 'john.doe@example.com', '+1-555-0101', 'AUTO_COLLISION', 50000.00, 'ACTIVE', '2025-01-01', '2026-12-31'),
    ('POL-8822', 'Jane Smith', 'jane.smith@example.com', '+1-555-0102', 'HOME_PROPERTY', 250000.00, 'ACTIVE', '2025-01-01', '2026-12-31'),
    ('POL-8823', 'Bob Johnson', 'bob.johnson@example.com', '+1-555-0103', 'HEALTH_MEDICAL', 100000.00, 'ACTIVE', '2025-01-01', '2026-12-31'),
    ('POL-8824', 'Alice Williams', 'alice.williams@example.com', '+1-555-0104', 'AUTO_COMPREHENSIVE', 75000.00, 'ACTIVE', '2025-01-01', '2026-12-31'),
    ('POL-8825', 'Charlie Brown', 'charlie.brown@example.com', '+1-555-0105', 'LIFE', 500000.00, 'ACTIVE', '2025-01-01', '2026-12-31')
ON CONFLICT (id) DO NOTHING;

-- Create view for claim summary
CREATE OR REPLACE VIEW claim_summary AS
SELECT 
    c.id,
    c.policy_id,
    p.policy_holder_name,
    p.policy_holder_email,
    c.claim_type,
    c.status,
    c.amount,
    c.incident_date,
    c.created_at,
    c.adjuster_id,
    COUNT(d.id) as document_count
FROM claims c
LEFT JOIN policies p ON c.policy_id = p.id
LEFT JOIN documents d ON c.id = d.claim_id
GROUP BY c.id, c.policy_id, p.policy_holder_name, p.policy_holder_email, c.claim_type, c.status, c.amount, c.incident_date, c.created_at, c.adjuster_id;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO insureco;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO insureco;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO insureco;

-- Made with Bob
