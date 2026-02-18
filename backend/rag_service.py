
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
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Resolve DB path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get('RAG_DB_PATH', os.path.join(BASE_DIR, 'database.sqlite'))

# AI Clients
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

openai_client = None
genai_model = None

# Initialize Clients
if OPENAI_API_KEY:
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        print("Using OpenAI for RAG embeddings.")
    except Exception as e:
        print(f"Failed to init OpenAI: {e}")

if not openai_client and GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        # Verify model access?
        print("Using Google Gemini for RAG embeddings.")
    except Exception as e:
        print(f"Failed to init Gemini: {e}")

# Ensure google.generativeai is available for embedding function
try:
    import google.generativeai as genai
except ImportError:
    genai = None
    print("google.generativeai module not found. Gemini embeddings will fail.")

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")

def local_hash_embedding(text, dim=768):
    h = hashlib.md5(text.encode("utf-8")).digest()
    seed = int.from_bytes(h, "big") % (2**32)
    rng = np.random.default_rng(seed)
    vec = rng.standard_normal(dim)
    norm = np.linalg.norm(vec)
    if norm == 0:
        return vec.tolist()
    return (vec / norm).tolist()

def get_embedding_with_retries(text, retries=3, delay=1):
    # 1. OpenAI Strategy
    if openai_client:
        for attempt in range(1, retries + 1):
            try:
                response = openai_client.embeddings.create(input=text, model=EMBEDDING_MODEL)
                return response.data[0].embedding
            except Exception as e:
                if attempt == retries: break
                time.sleep(delay * (2 ** (attempt - 1)))
    
    # 2. Gemini Strategy
    if GEMINI_API_KEY and genai:
        try:
            # 'models/text-embedding-004' is a common embedding model
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        except Exception as e:
            print(f"Gemini embedding failed: {e}")

    # 3. Fallback Strategy
    return local_hash_embedding(text)

# Simple in-memory vector store for MVP
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
        if len(vec1) != len(vec2):
            # Dimensionality mismatch (e.g. switching models), return 0
            return 0
        if np.linalg.norm(vec1) == 0 or np.linalg.norm(vec2) == 0:
            return 0
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

    def search(self, query: str, limit: int = 5) -> List[Dict]:
        if not self.vectors:
            return []

        try:
            query_embedding = np.array(get_embedding_with_retries(query))
        except Exception as e:
            print(f"Error generating query embedding: {e}")
            return []

        results = []
        for chunk_id, embedding in self.vectors.items():
            score = self._cosine_similarity(query_embedding, embedding)
            if score > 0:
                metadata = self.chunk_metadata.get(chunk_id, {})
                results.append({
                    'chunk_id': chunk_id,
                    'content': metadata.get('content', ''),
                    'doc_id': metadata.get('doc_id', ''),
                    'score': float(score),
                    'chunk_index': metadata.get('chunk_index', 0)
                })
        
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        if end < len(text):
            search_start = max(start, end - 100)
            sentence_end = text.rfind('.', search_start, end)
            if sentence_end > search_start:
                end = sentence_end + 1
            else:
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
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE Documents SET processed = ? WHERE id = ?", (processed, doc_id))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error updating document status: {e}")

app = Flask(__name__)
CORS(app)

vector_store = SimpleVectorStore()

@app.route('/health', methods=['GET'])
def health_check():
    provider = "openai" if openai_client else ("gemini" if GEMINI_API_KEY else "local")
    return jsonify({'status': 'healthy', 'service': 'rag', 'provider': provider})

@app.route('/process', methods=['POST'])
def process_document():
    try:
        data = request.get_json()
        doc_id = data.get('doc_id')
        if not doc_id: return jsonify({'error': 'Document ID required'}), 400
        content = extract_text_from_db(doc_id)
        if not content: return jsonify({'error': 'Document content not found'}), 404
        content = re.sub(r'\s+', ' ', content.strip())
        chunks = chunk_text(content)
        vector_store.add_document(str(doc_id), content, chunks)
        update_document_processing_status(doc_id, True)
        return jsonify({'success': True, 'doc_id': doc_id, 'chunks_created': len(chunks)})
    except Exception as e:
        print(f"Error processing document: {e}")
        return jsonify({'error': 'Processing failed'}), 500

@app.route('/search', methods=['POST'])
def search_documents():
    try:
        data = request.get_json()
        query = data.get('query', '')
        limit = data.get('limit', 5)
        if not query: return jsonify({'error': 'Query required'}), 400
        results = vector_store.search(query, limit)
        doc_results = {}
        for result in results:
            doc_id = result['doc_id']
            if doc_id not in doc_results:
                doc_results[doc_id] = {'doc_id': doc_id, 'chunks': [], 'total_score': 0}
            doc_results[doc_id]['chunks'].append({
                'content': result['content'],
                'score': result['score'],
                'chunk_index': result['chunk_index']
            })
            doc_results[doc_id]['total_score'] += result['score']
        sorted_docs = sorted(doc_results.values(), key=lambda x: x['total_score'], reverse=True)
        return jsonify({'query': query, 'results': sorted_docs, 'total_results': len(sorted_docs)})
    except Exception as e:
        print(f"Error searching documents: {e}")
        return jsonify({'error': 'Search failed'}), 500

if __name__ == '__main__':
    print("Starting RAG Service...")
    port = int(os.environ.get("PORT", 5001))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host='0.0.0.0', port=port, debug=debug)
