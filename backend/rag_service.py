#!/usr/bin/env python3
"""
RAG (Retrieval-Augmented Generation) Service for Bizpanion
Handles document processing, vector storage, and similarity search
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import os
from typing import List, Dict, Any
import hashlib
import re
import numpy as np
from openai import OpenAI

# Added: optional ChromaDB integration and embedding retries
try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
except Exception:
    CHROMA_AVAILABLE = False

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Resolve DB path relative to this file or allow env override
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get('RAG_DB_PATH', os.path.join(BASE_DIR, 'database.sqlite'))

# Initialize OpenAI client (optional; allow service to run without key)
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
try:
    openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
except Exception:
    openai_client = None
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")  # prefer modern embedding model

import time

def local_hash_embedding(text, dim=256):
    h = hashlib.md5(text.encode("utf-8")).digest()
    seed = int.from_bytes(h, "big") % (2**32)
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(dim)
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec.tolist()
    return (vec / norm).tolist()

def get_embedding_with_retries(text, retries=4, delay=1):
    if openai_client is None:
        # Fallback: deterministic local embedding (no external API needed)
        return local_hash_embedding(text)
    for attempt in range(1, retries + 1):
        try:
            response = openai_client.embeddings.create(input=text, model=EMBEDDING_MODEL)
            return response.data[0].embedding
        except Exception as e:
            print(f"Embedding attempt {attempt} failed: {e}")
            if attempt == retries:
                # Last attempt failed; fallback to local embedding to keep service usable
                return local_hash_embedding(text)
            time.sleep(delay * (2 ** (attempt - 1)))


# Simple in-memory vector store for MVP
# In production, use FAISS, Pinecone, or Weaviate
class SimpleVectorStore:
    def __init__(self):
        self.documents = {}  # doc_id -> chunks
        self.vectors = {}    # chunk_id -> embedding vector
        self.chunk_metadata = {} # chunk_id -> {content, doc_id, chunk_index}
        
    def add_document(self, doc_id: str, content: str, chunks: List[str]):
        """Add document chunks to vector store"""
        self.documents[doc_id] = chunks
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{i}"
            try:
                # Generate embedding using OpenAI API
                embedding = get_embedding_with_retries(chunk)
                self.vectors[chunk_id] = np.array(embedding)
                self.chunk_metadata[chunk_id] = {
                    'content': chunk,
                    'doc_id': doc_id,
                    'chunk_index': i
                }
            except Exception as e:
                print(f"Error generating embedding for chunk {chunk_id}: {e}")
    
    def _cosine_similarity(self, vec1, vec2):
        """Calculate cosine similarity between two vectors"""
        if np.linalg.norm(vec1) == 0 or np.linalg.norm(vec2) == 0:
            return 0
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

    def search(self, query: str, limit: int = 5) -> List[Dict]:
        """Search for similar chunks using cosine similarity"""
        if not self.vectors:
            return []

        try:
            query_embedding = np.array(get_embedding_with_retries(query))
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            return [] # Cannot search without a query embedding

        results = []
        for chunk_id, embedding in self.vectors.items():
            score = self._cosine_similarity(query_embedding, embedding)
            if score > 0: # Only consider positive similarity scores
                metadata = self.chunk_metadata.get(chunk_id, {})
                results.append({
                    'chunk_id': chunk_id,
                    'content': metadata.get('content', ''),
                    'doc_id': metadata.get('doc_id', ''),
                    'score': score,
                    'chunk_index': metadata.get('chunk_index', 0)
                })
        
        # Sort by score and return top results
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """Split text into overlapping chunks"""
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings within the last 100 characters
            search_start = max(start, end - 100)
            sentence_end = text.rfind('.', search_start, end)
            if sentence_end > search_start:
                end = sentence_end + 1
            else:
                # Look for word boundary
                space_pos = text.rfind(' ', start, end)
                if space_pos > start:
                    end = space_pos
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        start = end - overlap
        if start >= len(text):
            break
    
    return chunks

def extract_text_from_db(doc_id: int) -> str:
    """Extract text content from database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT content FROM Documents WHERE id = ?", (doc_id,))
        result = cursor.fetchone()
        
        conn.close()
        
        if result:
            return result[0] or ""
        return ""
        
    except Exception as e:
        print(f"Error extracting text from DB: {e}")
        return ""

def update_document_processing_status(doc_id: int, processed: bool):
    """Update document processing status in database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE Documents SET processed = ? WHERE id = ?", 
            (processed, doc_id)
        )
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Error updating document status: {e}")

app = Flask(__name__)
CORS(app)

# Initialize vector store
vector_store = SimpleVectorStore()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'rag'})

@app.route('/process', methods=['POST'])
def process_document():
    """Process a document and add to vector store"""
    try:
        data = request.get_json()
        doc_id = data.get('doc_id')
        
        if not doc_id:
            return jsonify({'error': 'Document ID required'}), 400
        
        # Extract text from database
        content = extract_text_from_db(doc_id)
        
        if not content:
            return jsonify({'error': 'Document content not found'}), 404
        
        # Clean and chunk the text
        content = re.sub(r'\s+', ' ', content.strip())
        chunks = chunk_text(content)
        
        # Add to vector store
        vector_store.add_document(str(doc_id), content, chunks)
        
        # Update processing status
        update_document_processing_status(doc_id, True)
        
        return jsonify({
            'success': True,
            'doc_id': doc_id,
            'chunks_created': len(chunks),
            'message': 'Document processed successfully'
        })
        
    except Exception as e:
        print(f"Error processing document: {e}")
        return jsonify({'error': 'Processing failed'}), 500

@app.route('/search', methods=['POST'])
def search_documents():
    """Search documents for relevant content"""
    try:
        data = request.get_json()
        query = data.get('query', '')
        limit = data.get('limit', 5)
        
        if not query:
            return jsonify({'error': 'Query required'}), 400
        
        # Search vector store
        results = vector_store.search(query, limit)
        
        # Group results by document
        doc_results = {}
        for result in results:
            doc_id = result['doc_id']
            if doc_id not in doc_results:
                doc_results[doc_id] = {
                    'doc_id': doc_id,
                    'chunks': [],
                    'total_score': 0
                }
            
            doc_results[doc_id]['chunks'].append({
                'content': result['content'],
                'score': result['score'],
                'chunk_index': result['chunk_index']
            })
            doc_results[doc_id]['total_score'] += result['score']
        
        # Sort documents by total score
        sorted_docs = sorted(
            doc_results.values(), 
            key=lambda x: x['total_score'], 
            reverse=True
        )
        
        return jsonify({
            'query': query,
            'results': sorted_docs,
            'total_results': len(sorted_docs)
        })
        
    except Exception as e:
        print(f"Error searching documents: {e}")
        return jsonify({'error': 'Search failed'}), 500

@app.route('/status/<int:doc_id>', methods=['GET'])
def get_document_status(doc_id):
    """Get processing status of a document"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT id, title, processed FROM Documents WHERE id = ?", 
            (doc_id,)
        )
        result = cursor.fetchone()
        
        conn.close()
        
        if result:
            return jsonify({
                'doc_id': result[0],
                'title': result[1],
                'processed': bool(result[2])
            })
        
        return jsonify({'error': 'Document not found'}), 404
        
    except Exception as e:
        print(f"Error getting document status: {e}")
        return jsonify({'error': 'Status check failed'}), 500

if __name__ == '__main__':
    print("Starting RAG Service...")
    print("Vector store initialized")
    print("Ready to process documents!")
    
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host='0.0.0.0', port=port, debug=debug)
