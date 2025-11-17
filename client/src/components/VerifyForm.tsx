import { useState } from 'react';
import './VerifyForm.css';

interface VerifyFormProps {
  onVerify: (data: {
    game: 'dice' | 'crash';
    server_seed: string;
    server_seed_hash?: string;
    client_seed: string;
    nonce: number;
    expected_result?: number;
    expect_strict?: boolean;
  }) => void;
  loading: boolean;
}

function VerifyForm({ onVerify, loading }: VerifyFormProps) {
  const [game, setGame] = useState<'dice' | 'crash'>('dice');
  const [serverSeed, setServerSeed] = useState('');
  const [serverSeedHash, setServerSeedHash] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState(1);
  const [expectedResult, setExpectedResult] = useState('');
  const [useExpectedResult, setUseExpectedResult] = useState(false);
  const [expectStrict, setExpectStrict] = useState(false);
  const [useServerSeedHash, setUseServerSeedHash] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formData = {
      game,
      server_seed: serverSeed,
      server_seed_hash: useServerSeedHash ? serverSeedHash : undefined,
      client_seed: clientSeed,
      nonce: parseInt(nonce.toString(), 10),
      expected_result: useExpectedResult && expectedResult
        ? parseFloat(expectedResult)
        : undefined,
      expect_strict: expectStrict,
    };

    onVerify(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="verify-form">
      <div className="form-group">
        <label htmlFor="game">Game Type</label>
        <select
          id="game"
          value={game}
          onChange={(e) => setGame(e.target.value as 'dice' | 'crash')}
          disabled={loading}
        >
          <option value="dice">Dice</option>
          <option value="crash">Crash</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="server_seed">Server Seed</label>
        <input
          id="server_seed"
          type="text"
          value={serverSeed}
          onChange={(e) => setServerSeed(e.target.value)}
          placeholder="Enter server seed (plaintext)"
          required
          disabled={loading}
        />
        <small>Never logged or stored in plaintext</small>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={useServerSeedHash}
            onChange={(e) => setUseServerSeedHash(e.target.checked)}
            disabled={loading}
          />
          Verify server seed hash
        </label>
      </div>

      {useServerSeedHash && (
        <div className="form-group">
          <label htmlFor="server_seed_hash">Server Seed Hash</label>
          <input
            id="server_seed_hash"
            type="text"
            value={serverSeedHash}
            onChange={(e) => setServerSeedHash(e.target.value)}
            placeholder="SHA256 hash of server seed"
            disabled={loading}
          />
        </div>
      )}

      <div className="form-group">
        <label htmlFor="client_seed">Client Seed</label>
        <input
          id="client_seed"
          type="text"
          value={clientSeed}
          onChange={(e) => setClientSeed(e.target.value)}
          placeholder="Enter client seed"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="nonce">Nonce</label>
        <input
          id="nonce"
          type="number"
          value={nonce}
          onChange={(e) => setNonce(parseInt(e.target.value, 10) || 1)}
          min="1"
          required
          disabled={loading}
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={useExpectedResult}
            onChange={(e) => setUseExpectedResult(e.target.checked)}
            disabled={loading}
          />
          Compare with expected result
        </label>
      </div>

      {useExpectedResult && (
        <>
          <div className="form-group">
            <label htmlFor="expected_result">Expected Result</label>
            <input
              id="expected_result"
              type="number"
              step="0.01"
              value={expectedResult}
              onChange={(e) => setExpectedResult(e.target.value)}
              placeholder={game === 'dice' ? '0.00 - 99.99' : 'Multiplier (e.g., 2.50)'}
              disabled={loading}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={expectStrict}
                onChange={(e) => setExpectStrict(e.target.checked)}
                disabled={loading}
              />
              Strict comparison (exact match required)
            </label>
          </div>
        </>
      )}

      <button type="submit" className="verify-button" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify Outcome'}
      </button>
    </form>
  );
}

export default VerifyForm;

