import { useState } from 'react';
import { VerifyResponse } from '../App';
import ExplainTooltip from './ExplainTooltip';
import './ResultDisplay.css';

interface ResultDisplayProps {
  result: VerifyResponse;
}

function ResultDisplay({ result }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verdictClass = result.verdict === 'PASS' ? 'pass' : 'fail';

  return (
    <div className="result-display">
      <div className="result-header">
        <h2>Verification Result</h2>
        <div className={`verdict-badge ${verdictClass}`}>
          {result.verdict}
        </div>
      </div>

      <div className="result-content">
        <div className="result-item">
          <span className="label">Game:</span>
          <span className="value">{result.game.toUpperCase()}</span>
        </div>

        <div className="result-item">
          <span className="label">Computed Result:</span>
          <span className="value highlight">{result.computed_result}</span>
        </div>

        <div className="result-item">
          <span className="label">Server Seed Hash:</span>
          <span className="value code">{result.details.used_input.server_seed_hash}</span>
        </div>

        <div className="result-item">
          <span className="label">Computation Hex:</span>
          <span className="value code small">{result.details.computation_hex}</span>
        </div>

        <div className="result-item">
          <span className="label">Client Seed:</span>
          <span className="value">{result.details.used_input.client_seed}</span>
        </div>

        <div className="result-item">
          <span className="label">Nonce:</span>
          <span className="value">{result.details.used_input.nonce}</span>
        </div>

        <div className="result-item notes">
          <span className="label">Notes:</span>
          <span className="value">{result.details.notes}</span>
        </div>
      </div>

      <div className="result-actions">
        <button
          className="action-button explain-button"
          onClick={() => setShowExplain(!showExplain)}
        >
          {showExplain ? 'Hide' : 'Show'} Explanation
        </button>
        <button
          className="action-button copy-button"
          onClick={copyToClipboard}
        >
          {copied ? '✓ Copied!' : 'Copy JSON'}
        </button>
      </div>

      {showExplain && (
        <ExplainTooltip
          game={result.game}
          computationHex={result.details.computation_hex}
          result={result.computed_result}
        />
      )}
    </div>
  );
}

export default ResultDisplay;

