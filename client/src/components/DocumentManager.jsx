import React, { useState, useEffect } from 'react';

const API_URL = 'http://localhost:3001';

export function DocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDocs, setExpandedDocs] = useState(new Set());

  // Fetch documents on mount and when needed
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      
      const data = await response.json();
      setDocuments(data.documents || []);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/documents/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setDocuments(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const response = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Failed to delete document');
      
      // Refresh list
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleExpanded = (docId) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="document-manager" style={{ 
      marginTop: '20px', 
      padding: '16px',
      backgroundColor: '#0f1419',
      borderRadius: '12px',
      border: '1px solid #1e2632',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ color: '#60a5fa', marginTop: '0', fontSize: '18px', fontWeight: '600' }}>📄 Document Manager</h3>
        
        {/* Search Section */}
        <form onSubmit={handleSearch} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #2d3f4f',
              fontSize: '14px',
              backgroundColor: '#1a2332',
              color: '#e0e0e0',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '10px 18px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s',
            }}
            disabled={loading}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                fetchDocuments();
              }}
              style={{
                padding: '10px 18px',
                backgroundColor: '#4b5563',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#5a6575'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#4b5563'}
            >
              Clear
            </button>
          )}
        </form>

        {/* Statistics */}
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '15px',
              padding: '14px',
              backgroundColor: '#1a2332',
              borderRadius: '8px',
              border: '1px solid #2d3f4f',
            }}
          >
            <div style={{ padding: '10px', backgroundColor: '#0f4c81', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '500', marginBottom: '6px' }}>📄 Documents</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#93c5fd' }}>{stats.totalDocuments}</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#0f5f3f', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '500', marginBottom: '6px' }}>💾 Size</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6ee7b7' }}>{formatSize(stats.totalSize)}</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#5f4a0f', borderRadius: '6px', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '500', marginBottom: '6px' }}>🔗 Chunks</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fde047' }}>{stats.totalChunks}</div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#7f1d1d',
              color: '#fecaca',
              borderRadius: '6px',
              marginBottom: '12px',
              fontSize: '14px',
              border: '1px solid #dc2626',
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#93c5fd', fontSize: '14px' }}>
            ⏳ Loading documents...
          </div>
        )}

        {/* Documents List */}
        {!loading && documents.length === 0 && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#1a2332',
              borderRadius: '6px',
              textAlign: 'center',
              color: '#9ca3af',
              border: '1px dashed #2d3f4f',
            }}
          >
            📭 No documents yet. Upload a PDF to get started!
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div>
            <p style={{ fontSize: '14px', color: '#d1d5db', marginBottom: '10px', marginTop: '0' }}>
              ✅ Found {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '12px',
                    border: '1px solid #2d3f4f',
                    borderRadius: '6px',
                    backgroundColor: '#1a2332',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#253447';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a2332';
                    e.currentTarget.style.borderColor = '#2d3f4f';
                  }}
                >
                  {/* Document Header */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleExpanded(doc.id)}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px', color: '#e0e0e0' }}>
                        📄 {doc.fileName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        📅 {formatDate(doc.uploadedAt)} • 📊 {doc.pageCount} pages
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Expanded Details */}
                  {expandedDocs.has(doc.id) && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '10px',
                        borderTop: '1px solid #eee',
                        fontSize: '12px',
                      }}
                    >
                      {doc.size && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Size:</strong> {formatSize(doc.size)}
                        </div>
                      )}
                      {doc.source && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Source:</strong> {doc.source}
                        </div>
                      )}
                      {doc.mimeType && (
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Type:</strong> {doc.mimeType}
                        </div>
                      )}
                      {doc.chunkCount && (
                        <div>
                          <strong>Chunks:</strong> {doc.chunkCount}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentManager;
