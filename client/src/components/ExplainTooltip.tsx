import './ExplainTooltip.css';

interface ExplainTooltipProps {
  game: 'dice' | 'crash';
  computationHex: string;
  result: number;
}

function ExplainTooltip({ game, computationHex, result }: ExplainTooltipProps) {
  if (game === 'dice') {
    const hexPrefix = computationHex.slice(0, 8);
    const x = parseInt(hexPrefix, 16);
    const modulo = x % 10000;
    const computed = modulo / 100;

    return (
      <div className="explain-tooltip">
        <h3>How the result was computed (Dice):</h3>
        <ol>
          <li>
            Compute hash: <code>SHA256(server_seed:client_seed:nonce)</code>
          </li>
          <li>
            Hash result: <code className="hex">{computationHex}</code>
          </li>
          <li>
            Take first 8 hex characters: <code className="hex">{hexPrefix}</code>
          </li>
          <li>
            Parse as integer: <code>x = {x}</code>
          </li>
          <li>
            Apply modulo: <code>({x} % 10000) = {modulo}</code>
          </li>
          <li>
            Divide by 100: <code>{modulo} / 100 = {computed}</code>
          </li>
          <li>
            <strong>Final result: {result}</strong>
          </li>
        </ol>
      </div>
    );
  } else {
    // Crash algorithm explanation
    const hexPrefix = computationHex.slice(0, 13);
    const x = parseInt(hexPrefix, 16);
    const TWO_TO_52 = 4503599627370496;
    let r = x / TWO_TO_52;
    r = Math.min(r, 1 - 1e-12);
    const mult = Math.floor((1 / (1 - r)) * 100) / 100;
    const maxMult = 10000; // Default MAX_MULT
    const finalMult = Math.min(mult, maxMult);

    return (
      <div className="explain-tooltip">
        <h3>How the result was computed (Crash):</h3>
        <ol>
          <li>
            Compute hash: <code>SHA256(server_seed:client_seed:nonce)</code>
          </li>
          <li>
            Hash result: <code className="hex">{computationHex}</code>
          </li>
          <li>
            Take first 13 hex characters (52 bits): <code className="hex">{hexPrefix}</code>
          </li>
          <li>
            Parse as integer: <code>x = {x}</code>
          </li>
          <li>
            Convert to uniform r: <code>r = {x} / 2^52 = {r.toFixed(12)}</code>
          </li>
          <li>
            Clamp to avoid r = 1.0: <code>r = min({r.toFixed(12)}, 0.999999999999) = {r.toFixed(12)}</code>
          </li>
          <li>
            Apply inverse mapping: <code>mult = floor((1 / (1 - {r.toFixed(12)})) * 100) / 100 = {mult.toFixed(2)}</code>
          </li>
          <li>
            Apply MAX_MULT cap: <code>min({mult.toFixed(2)}, {maxMult}) = {finalMult.toFixed(2)}</code>
          </li>
          <li>
            <strong>Final result: {result}</strong>
          </li>
        </ol>
        <p className="note">
          Note: This uses 52 bits (first 13 hex characters) for the uniform random number generation.
        </p>
      </div>
    );
  }
}

export default ExplainTooltip;

