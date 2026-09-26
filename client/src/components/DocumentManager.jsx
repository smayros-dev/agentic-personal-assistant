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
    <div className="document-manager" style={{ marginTop: '20px', padding: '10px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3>📄 Document Manager</h3>
        
        {/* Search Section */}
        <form onSubmit={handleSearch} style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '14px',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            disabled={loading}
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
                padding: '8px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
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
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Documents</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.totalDocuments}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Total Size</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatSize(stats.totalSize)}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#666' }}>Chunks</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{stats.totalChunks}</div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '4px',
              marginBottom: '10px',
              fontSize: '14px',
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading documents...
          </div>
        )}

        {/* Documents List */}
        {!loading && documents.length === 0 && (
          <div
            style={{
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px',
              textAlign: 'center',
              color: '#666',
            }}
          >
            No documents yet. Upload a PDF to get started!
          </div>
        )}

        {!loading && documents.length > 0 && (
          <div>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
              Found {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
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
                      <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                        📄 {doc.fileName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Uploaded: {formatDate(doc.uploadedAt)}
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
