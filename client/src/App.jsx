import { useState, useEffect } from 'react';

function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function checkHealth() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/health');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (isMounted) {
          setHealth(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to connect to backend API');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem', maxWidth: '600px', margin: '2rem auto' }}>
      <h1>Nexfolio</h1>
      <p>Full-Stack Stock Trading Simulation Platform (Phase 1 Foundation)</p>

      <section style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
        <h2 style={{ marginTop: 0 }}>Backend API Health Check</h2>

        {loading && <p id="health-loading">Loading API status...</p>}

        {error && (
          <div id="health-error" style={{ color: '#d32f2f' }}>
            <p><strong>Error connecting to API:</strong></p>
            <p>{error}</p>
          </div>
        )}

        {health && (
          <div id="health-data" style={{ color: '#2e7d32' }}>
            <p><strong>Status:</strong> {health.status}</p>
            <p><strong>Service:</strong> {health.service}</p>
            <p><strong>Timestamp:</strong> {health.timestamp}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
