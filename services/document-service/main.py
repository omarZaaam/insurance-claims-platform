from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
import os
import hashlib
import uuid
from datetime import datetime
import json

app = FastAPI(title="InsureCo Document Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://insureco:insureco123@localhost:5432/insureco")
S3_BUCKET = os.getenv("S3_BUCKET", "insureco-documents-local")
STORAGE_PATH = "/app/storage"

# Ensure storage directory exists
os.makedirs(STORAGE_PATH, exist_ok=True)

# Database connection
def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

# Models
class DocumentUpload(BaseModel):
    claim_id: str
    filename: str
    mime_type: str
    size: int
    content_base64: Optional[str] = None

class DocumentResponse(BaseModel):
    id: str
    claim_id: str
    filename: str
    s3_key: str
    mime_type: str
    file_size: int
    virus_scan_status: str
    uploaded_at: str

# Health check
@app.get("/health")
async def health():
    try:
        conn = get_db_connection()
        conn.close()
        return {
            "status": "healthy",
            "service": "document-service",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "document-service",
            "database": "disconnected",
            "error": str(e)
        }

# Upload document
@app.post("/api/documents/upload", response_model=DocumentResponse)
async def upload_document(
    document: DocumentUpload,
    authorization: Optional[str] = Header(None)
):
    try:
        # Extract user from JWT (stubbed)
        user_id = "demo-user"
        
        # Simulate virus scan (ClamAV stub)
        virus_scan_status = "CLEAN"
        print(f"🦠 Virus scan: {virus_scan_status}")
        
        # Generate S3 key
        s3_key = f"claims/{document.claim_id}/{document.filename}"
        
        # Calculate SHA-256 hash (stubbed)
        sha256_hash = hashlib.sha256(f"{document.filename}{datetime.utcnow()}".encode()).hexdigest()
        
        # Save to local storage (S3 stub)
        claim_dir = os.path.join(STORAGE_PATH, document.claim_id)
        os.makedirs(claim_dir, exist_ok=True)
        
        file_path = os.path.join(claim_dir, document.filename)
        with open(file_path, 'w') as f:
            f.write(f"Stub document: {document.filename}")
        
        print(f"📁 Saved to local storage: {file_path}")
        
        # Insert into database
        conn = get_db_connection()
        cur = conn.cursor()
        
        doc_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO documents 
            (id, claim_id, filename, s3_key, mime_type, file_size, sha256_hash, virus_scan_status, uploaded_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, claim_id, filename, s3_key, mime_type, file_size, virus_scan_status, uploaded_at
            """,
            (doc_id, document.claim_id, document.filename, s3_key, document.mime_type, 
             document.size, sha256_hash, virus_scan_status, user_id)
        )
        
        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        print(f"✅ Document uploaded: {doc_id}")
        
        return DocumentResponse(
            id=result[0],
            claim_id=result[1],
            filename=result[2],
            s3_key=result[3],
            mime_type=result[4],
            file_size=result[5],
            virus_scan_status=result[6],
            uploaded_at=result[7].isoformat()
        )
        
    except Exception as e:
        print(f"❌ Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Get documents for a claim
@app.get("/api/documents/claim/{claim_id}", response_model=List[DocumentResponse])
async def get_claim_documents(claim_id: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            """
            SELECT id, claim_id, filename, s3_key, mime_type, file_size, virus_scan_status, uploaded_at
            FROM documents
            WHERE claim_id = %s
            ORDER BY uploaded_at DESC
            """,
            (claim_id,)
        )
        
        results = cur.fetchall()
        cur.close()
        conn.close()
        
        documents = [
            DocumentResponse(
                id=row[0],
                claim_id=row[1],
                filename=row[2],
                s3_key=row[3],
                mime_type=row[4],
                file_size=row[5],
                virus_scan_status=row[6],
                uploaded_at=row[7].isoformat()
            )
            for row in results
        ]
        
        return documents
        
    except Exception as e:
        print(f"❌ Error fetching documents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Get presigned URL (stubbed)
@app.get("/api/documents/{document_id}/download")
async def get_download_url(document_id: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute(
            "SELECT s3_key, filename FROM documents WHERE id = %s",
            (document_id,)
        )
        
        result = cur.fetchone()
        cur.close()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # In production, generate presigned S3 URL
        # For demo, return a stub URL
        presigned_url = f"http://localhost:8001/storage/{result[0]}"
        
        return {
            "url": presigned_url,
            "filename": result[1],
            "expires_in": 3600
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating download URL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

# Made with Bob
