import React, { useState, useEffect } from "react";
import { api } from "./api";
import "./DocumentsPage.css";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadData, setUploadData] = useState({ title: '', description: '' });

  // RAG Search UI state
  const [ragQuery, setRagQuery] = useState("");
  const [ragLimit, setRagLimit] = useState(5);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState("");
  const [ragResults, setRagResults] = useState(null);
  const [ragHealth, setRagHealth] = useState(null);
  const [ragHealthLoading, setRagHealthLoading] = useState(false);
  const [reprocessing, setReprocessing] = useState({});

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/documents");
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
    setLoading(false);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadData.title) {
        setUploadData(prev => ({ ...prev, title: file.name }));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('title', uploadData.title);
      formData.append('description', uploadData.description);

      await api.post("/documents/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reset form
      setSelectedFile(null);
      setUploadData({ title: '', description: '' });
      setShowUploadModal(false);
      
      // Refresh documents list
      await fetchDocuments();
      
      alert('Document uploaded successfully!');
    } catch (error) {
      console.error("Upload failed:", error);
      alert('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.delete(`/documents/${documentId}`);
      await fetchDocuments();
      alert('Document deleted successfully!');
    } catch (error) {
      console.error("Delete failed:", error);
      alert('Delete failed. Please try again.');
    }
  };

  // RAG: Reprocess a document
  const handleReprocess = async (documentId) => {
    try {
      setReprocessing((prev) => ({ ...prev, [documentId]: true }));
      const res = await api.post(`/documents/${documentId}/reprocess`);
      alert(res.data?.message || 'Reprocessing requested. Check Knowledge Base soon.');
    } catch (err) {
      console.error('Reprocess failed:', err);
      alert(err?.response?.data?.error || 'Reprocess failed. Please try again.');
    } finally {
      setReprocessing((prev) => ({ ...prev, [documentId]: false }));
    }
  };

  // RAG: Query Knowledge Base
  const handleRagSearch = async (e) => {
    e?.preventDefault?.();
    setRagError("");
    setRagResults(null);
    if (!ragQuery.trim()) {
      setRagError("Enter a query");
      return;
    }
    setRagLoading(true);
    try {
      const res = await api.post("/rag/query", {
        query: ragQuery.trim(),
        limit: Math.max(1, Math.min(20, Number(ragLimit) || 5))
      });
      setRagResults(res.data || null);
    } catch (err) {
      console.error("RAG query failed", err);
      setRagError(err?.response?.data?.error || "Knowledge base query failed");
    } finally {
      setRagLoading(false);
    }
  };

  // RAG: Health check
  const handleRagHealth = async () => {
    setRagHealthLoading(true);
    setRagHealth(null);
    try {
      const res = await api.get("/rag/health");
      setRagHealth(res.data || null);
    } catch {
      setRagHealth({ error: "unavailable" });
    } finally {
      setRagHealthLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType && mimeType.startsWith('text/')) return '📝';
    return '📎';
  };

  function copyText(s) {
    try {
      navigator.clipboard.writeText(s);
    } catch {}
  }

  return (
    <div className="documents-page">
      <div className="documents-header">
        <h2>Document Library</h2>
        <p>Upload documents to make your AI assistant document-aware</p>
        <button 
          className="upload-btn"
          onClick={() => setShowUploadModal(true)}
        >
          + Upload Document
        </button>
      </div>

      {/* Knowledge Base Search */}
      <div className="settings-card" style={{ marginBottom: '1rem' }}>
        <h3>Knowledge Base Search (RAG)</h3>
        <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
          Ask questions across your uploaded files. Results show the most relevant chunks grouped by document.
        </p>
        <form onSubmit={handleRagSearch} style={{ display: 'grid', gap: '0.5rem', maxWidth: 920 }}>
          <input
            className="subdomain-field"
            placeholder="e.g., What were my top 3 performing products in Q2?"
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="number"
              min={1}
              max={20}
              value={ragLimit}
              onChange={(e) => setRagLimit(e.target.value)}
              className="subdomain-field"
              style={{ maxWidth: 160 }}
              placeholder="Results limit"
            />
            <button className="generate-btn" type="submit" disabled={ragLoading} style={{ maxWidth: 220 }}>
              {ragLoading ? "Searching…" : "Search Knowledge Base"}
            </button>
            <button type="button" className="edit-btn" onClick={handleRagHealth} disabled={ragHealthLoading} style={{ maxWidth: 220 }}>
              {ragHealthLoading ? "Checking…" : "Check RAG Health"}
            </button>
            {ragHealth && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {ragHealth?.status ? `RAG: ${ragHealth.status}` : 'RAG unavailable'}
              </span>
            )}
          </div>
          {ragError && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                color: 'var(--danger-text)',
                background: 'var(--danger-bg)',
                maxWidth: 920
              }}
            >
              {ragError}
            </div>
          )}
        </form>

        {/* Results */}
        {ragResults && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {typeof ragResults.total_results === 'number'
                ? `${ragResults.total_results} document(s) matched`
                : null}
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {(ragResults.results || []).map((doc) => (
                <div key={doc.doc_id} className="settings-card" style={{ padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 600 }}>Document #{doc.doc_id}</div>
                    {typeof doc.total_score === 'number' && (
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        Score: {doc.total_score.toFixed(3)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {(doc.chunks || []).map((chunk, idx) => {
                      const score = typeof chunk.score === 'number' ? chunk.score : 0;
                      const maxScore = Math.max(0.0001, Math.max(...(doc.chunks || []).map(c => (typeof c.score === 'number' ? c.score : 0))));
                      const pct = Math.max(8, Math.round((score / maxScore) * 100));
                      const isTop = score >= maxScore - 1e-12;
                      return (
                        <div
                          key={`${doc.doc_id}_${idx}_${chunk.chunk_index ?? idx}`}
                          className="page-item"
                          style={{ display: 'grid', gap: '0.35rem' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                              Chunk {chunk.chunk_index != null ? chunk.chunk_index : idx} • Confidence {score ? score.toFixed(3) : '—'}
                            </div>
                            {isTop && (
                              <span className="impact-badge" style={{ background: 'var(--success-50)', color: 'var(--success-700)' }}>
                                Top snippet
                              </span>
                            )}
                          </div>
                          <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, var(--info-600), var(--primary-color))'
                              }}
                            />
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap' }}>{chunk.content}</div>
                          <div className="page-actions" style={{ marginTop: '0.25rem' }}>
                            <button className="edit-btn" onClick={() => copyText(chunk.content)}>Copy Snippet</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Loading documents...</div>
      ) : (
        <div className="documents-grid">
          {documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>No documents yet</h3>
              <p>Click the "Upload Document" button to add files to your library.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <div key={doc.id} className="document-card">
                <div className="document-header">
                  <div className="document-icon">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  <div className="document-info">
                    <h4 className="document-title">{doc.title}</h4>
                    <p className="document-meta">
                      {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                    {doc.description && (
                      <p className="document-description">{doc.description}</p>
                    )}
                  </div>
                </div>
                
                <div className="document-status">
                  <span className={`status-badge ${doc.processed ? 'processed' : 'processing'}`}>
                    {doc.processed ? '✓ Ready' : '⏳ Processing'}
                  </span>
                </div>

                <div className="document-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="edit-btn"
                    onClick={() => handleReprocess(doc.id)}
                    disabled={!!reprocessing[doc.id]}
                  >
                    {reprocessing[doc.id] ? 'Reprocessing…' : 'Reprocess'}
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Upload Document</h3>
              <button 
                className="close-btn"
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>File</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md"
                  onChange={handleFileSelect}
                  className="file-input"
                />
                {selectedFile && (
                  <p className="selected-file">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Document title"
                  className="text-input"
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the document"
                  className="text-input"
                  rows="3"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="cancel-btn"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button 
                className="upload-btn"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
