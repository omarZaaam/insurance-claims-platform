import { Injectable } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { KafkaService } from './kafka.service';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Validation schema
const CreateClaimSchema = z.object({
  policyId: z.string().min(1),
  claimType: z.enum(['AUTO_COLLISION', 'AUTO_COMPREHENSIVE', 'HOME_PROPERTY', 'HOME_LIABILITY', 'HEALTH_MEDICAL', 'LIFE']),
  amount: z.number().positive(),
  incidentDate: z.string(),
  description: z.string().optional(),
  documents: z.array(z.object({
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
  })).optional(),
});

@Injectable()
export class ClaimsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly kafka: KafkaService,
  ) {}

  async createClaim(data: any, userId: string) {
    // Validate payload
    const validated = CreateClaimSchema.parse(data);

    // Check policy coverage
    const policyResult = await this.db.query(
      'SELECT * FROM policies WHERE id = $1 AND status = $2',
      [validated.policyId, 'ACTIVE']
    );

    if (policyResult.rows.length === 0) {
      throw new Error('Policy not found or inactive');
    }

    const policy = policyResult.rows[0];

    // Check for duplicate claims (idempotency)
    const duplicateCheck = await this.db.query(
      `SELECT id FROM claims 
       WHERE policy_id = $1 
       AND incident_date = $2 
       AND status NOT IN ('REJECTED', 'CLOSED')
       AND created_at > NOW() - INTERVAL '30 days'`,
      [validated.policyId, validated.incidentDate]
    );

    if (duplicateCheck.rows.length > 0) {
      throw new Error('Duplicate claim detected for this incident');
    }

    const client = await this.db.getClient();
    
    try {
      await client.query('BEGIN');

      // Insert claim
      const claimId = uuidv4();
      const claimResult = await client.query(
        `INSERT INTO claims (id, policy_id, claim_type, status, amount, incident_date, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          claimId,
          validated.policyId,
          validated.claimType,
          'SUBMITTED',
          validated.amount,
          validated.incidentDate,
          validated.description || '',
          userId,
        ]
      );

      const claim = claimResult.rows[0];

      // Insert documents metadata if provided
      if (validated.documents && validated.documents.length > 0) {
        for (const doc of validated.documents) {
          await client.query(
            `INSERT INTO documents (claim_id, filename, s3_key, mime_type, file_size, sha256_hash, virus_scan_status, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              claimId,
              doc.filename,
              `claims/${claimId}/${doc.filename}`,
              doc.mimeType,
              doc.size,
              'stub-hash-' + uuidv4(),
              'CLEAN',
              userId,
            ]
          );
        }
      }

      // Insert audit log
      await client.query(
        `INSERT INTO audit_log (claim_id, actor, action, details)
         VALUES ($1, $2, $3, $4)`,
        [claimId, userId, 'CLAIM_CREATED', JSON.stringify({ amount: validated.amount, type: validated.claimType })]
      );

      await client.query('COMMIT');

      // Produce Kafka event
      await this.kafka.produce('claims.submitted', validated.policyId, {
        claimId,
        policyId: validated.policyId,
        claimType: validated.claimType,
        amount: validated.amount,
        status: 'SUBMITTED',
        policyHolderEmail: policy.policy_holder_email,
        policyHolderName: policy.policy_holder_name,
        timestamp: new Date().toISOString(),
      });

      console.log(`✅ Claim created: ${claimId}`);

      return {
        claimId,
        status: 'SUBMITTED',
        ref: `INS-${new Date().getFullYear()}-${claimId.split('-')[0]}`,
        message: 'Claim submitted successfully',
      };

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating claim:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getClaim(claimId: string) {
    const result = await this.db.query(
      `SELECT c.*, p.policy_holder_name, p.policy_holder_email,
              (SELECT COUNT(*) FROM documents WHERE claim_id = c.id) as document_count
       FROM claims c
       LEFT JOIN policies p ON c.policy_id = p.id
       WHERE c.id = $1`,
      [claimId]
    );

    if (result.rows.length === 0) {
      throw new Error('Claim not found');
    }

    return result.rows[0];
  }

  async listClaims(filters: any = {}) {
    let query = `
      SELECT c.*, p.policy_holder_name, p.policy_holder_email,
             (SELECT COUNT(*) FROM documents WHERE claim_id = c.id) as document_count
      FROM claims c
      LEFT JOIN policies p ON c.policy_id = p.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` AND c.status = $${params.length}`;
    }

    if (filters.policyId) {
      params.push(filters.policyId);
      query += ` AND c.policy_id = $${params.length}`;
    }

    query += ' ORDER BY c.created_at DESC LIMIT 100';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async health() {
    try {
      await this.db.query('SELECT 1');
      return { status: 'healthy', database: 'connected' };
    } catch (error) {
      return { status: 'unhealthy', database: 'disconnected', error: error.message };
    }
  }
}

// Made with Bob
