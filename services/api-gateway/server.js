const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 8000;

// Configuration
const CLAIMS_SERVICE_URL = process.env.CLAIMS_SERVICE_URL || 'http://localhost:3001';
const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:8001';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting - 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// JWT verification middleware (stubbed)
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For demo purposes, allow requests without auth
    console.log('⚠️  No JWT provided - allowing for demo');
    req.user = { sub: 'demo-user', role: 'policyholder' };
    return next();
  }

  const token = authHeader.substring(7);
  
  try {
    // In production, verify against JWKS endpoint
    // For demo, we'll just decode without verification
    const decoded = jwt.decode(token);
    req.user = decoded || { sub: 'demo-user', role: 'policyholder' };
    console.log('✅ JWT verified:', req.user.sub);
    next();
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Route: POST /api/claims - Create claim
app.post('/api/claims', verifyJWT, async (req, res) => {
  try {
    console.log(`📨 POST /api/claims from ${req.user.sub}`);
    
    const response = await axios.post(
      `${CLAIMS_SERVICE_URL}/api/claims`,
      req.body,
      {
        headers: {
          'Authorization': req.headers.authorization || 'Bearer demo-token',
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`✅ Claim created: ${response.data.claimId}`);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('❌ Error creating claim:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Internal server error',
    });
  }
});

// Route: GET /api/claims/:id - Get claim
app.get('/api/claims/:id', verifyJWT, async (req, res) => {
  try {
    console.log(`📨 GET /api/claims/${req.params.id} from ${req.user.sub}`);
    
    const response = await axios.get(
      `${CLAIMS_SERVICE_URL}/api/claims/${req.params.id}`,
      {
        headers: {
          'Authorization': req.headers.authorization || 'Bearer demo-token',
        },
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error fetching claim:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Internal server error',
    });
  }
});

// Route: GET /api/claims - List claims
app.get('/api/claims', verifyJWT, async (req, res) => {
  try {
    console.log(`📨 GET /api/claims from ${req.user.sub}`);
    
    const response = await axios.get(
      `${CLAIMS_SERVICE_URL}/api/claims`,
      {
        params: req.query,
        headers: {
          'Authorization': req.headers.authorization || 'Bearer demo-token',
        },
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error listing claims:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Internal server error',
    });
  }
});

// Route: POST /api/documents/upload - Upload document
app.post('/api/documents/upload', verifyJWT, async (req, res) => {
  try {
    console.log(`📨 POST /api/documents/upload from ${req.user.sub}`);
    
    const response = await axios.post(
      `${DOCUMENT_SERVICE_URL}/api/documents/upload`,
      req.body,
      {
        headers: {
          'Authorization': req.headers.authorization || 'Bearer demo-token',
          'Content-Type': 'application/json',
        },
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error('❌ Error uploading document:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Internal server error',
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📊 Claims Service: ${CLAIMS_SERVICE_URL}`);
  console.log(`📎 Document Service: ${DOCUMENT_SERVICE_URL}`);
  console.log(`🔒 JWT Secret: ${JWT_SECRET.substring(0, 10)}...`);
  console.log(`⏱️  Rate limit: 100 req/min per IP`);
});

// Made with Bob
