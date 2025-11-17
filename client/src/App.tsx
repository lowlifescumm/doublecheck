import { useState } from 'react';
import VerifyForm from './components/VerifyForm';
import ResultDisplay from './components/ResultDisplay';
import './App.css';

export interface VerifyResponse {
  ok: boolean;
  game: 'dice' | 'crash';
  computed_result: number;
  verdict: 'PASS' | 'FAIL';
  details: {
    used_input: {
      client_seed: string;
      nonce: number;
      server_seed_hash: string;
    };
    computation_hex: string;
    notes: string;
  };
  error?: string;
}

function App() {
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (formData: {
    game: 'dice' | 'crash';
    server_seed: string;
    server_seed_hash?: string;
    client_seed: string;
    nonce: number;
    expected_result?: number;
    expect_strict?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game: formData.game,
          server_seed: formData.server_seed,
          server_seed_hash: formData.server_seed_hash || undefined,
          client_seed: formData.client_seed,
          nonce: formData.nonce,
          expected_result: formData.expected_result || undefined,
          expect_strict: formData.expect_strict || false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setResult(data as VerifyResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="app-card">
        <header className="app-header">
          <h1>Provably Fair Audit</h1>
          <p className="subtitle">Verify game outcomes with cryptographic proof</p>
        </header>

        <VerifyForm onVerify={handleVerify} loading={loading} />

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && <ResultDisplay result={result} />}
      </div>
    </div>
  );
}

export default App;

