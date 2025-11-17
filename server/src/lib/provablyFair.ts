import { sha256, verifyServerSeedHash } from './hashUtils';

export type GameType = 'dice' | 'crash';

export interface VerificationResult {
  computedResult: number;
  computationHex: string;
  serverSeedHash: string;
}

export interface VerificationDetails {
  usedInput: {
    clientSeed: string;
    nonce: number;
    serverSeedHash: string;
  };
  computationHex: string;
  notes: string;
}

/**
 * Compute the hash input string from seeds and nonce
 */
function computeHashInput(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): string {
  return `${serverSeed}:${clientSeed}:${nonce}`;
}

/**
 * Provably-fair Dice algorithm
 * 
 * Algorithm:
 * 1. Compute H = SHA256(server_seed + ":" + client_seed + ":" + nonce)
 * 2. Parse first 8 hex chars as integer: x = parseInt(H.slice(0, 8), 16)
 * 3. Result = (x % 10000) / 100 → yields 0.00-99.99 (two decimal places)
 * 
 * @param serverSeed - Server seed (plaintext)
 * @param clientSeed - Client seed
 * @param nonce - Nonce (must be > 0)
 * @returns VerificationResult with computed result and computation hex
 */
export function verifyDice(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): VerificationResult {
  const hashInput = computeHashInput(serverSeed, clientSeed, nonce);
  const hash = sha256(hashInput);
  const computationHex = hash;

  // Take first 8 hex chars and parse as integer
  const hexPrefix = hash.slice(0, 8);
  const x = parseInt(hexPrefix, 16);

  // Result: (x % 10000) / 100 → 0.00-99.99
  const result = (x % 10000) / 100;

  const serverSeedHash = sha256(serverSeed);

  return {
    computedResult: Math.round(result * 100) / 100, // Round to 2 decimals
    computationHex,
    serverSeedHash,
  };
}

/**
 * Provably-fair Crash algorithm (inverse mapping)
 * 
 * Algorithm:
 * 1. Compute H = SHA256(server_seed + ":" + client_seed + ":" + nonce)
 * 2. Use first 13 hex chars (52 bits): x = parseInt(H.slice(0, 13), 16)
 * 3. Convert to uniform r: r = x / 2^52
 * 4. Clamp: r = Math.min(r, 1 - 1e-12) to avoid r == 1.0
 * 5. Multiplier: mult = Math.floor((1 / (1 - r)) * 100) / 100
 * 6. Apply MAX_MULT cap: mult = Math.min(mult, MAX_MULT)
 * 
 * Bit-width: 52 bits (first 13 hex characters)
 * 
 * @param serverSeed - Server seed (plaintext)
 * @param clientSeed - Client seed
 * @param nonce - Nonce (must be > 0)
 * @param maxMult - Maximum multiplier cap (default: 10000)
 * @returns VerificationResult with computed multiplier and computation hex
 */
export function verifyCrash(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  maxMult: number = 10000
): VerificationResult {
  const hashInput = computeHashInput(serverSeed, clientSeed, nonce);
  const hash = sha256(hashInput);
  const computationHex = hash;

  // Use first 13 hex chars (52 bits) for r calculation
  const hexPrefix = hash.slice(0, 13);
  const x = parseInt(hexPrefix, 16);

  // Convert to uniform r in (0,1): r = x / 2^52
  // 2^52 = 4503599627370496
  const TWO_TO_52 = 4503599627370496;
  let r = x / TWO_TO_52;

  // Clamp to avoid r == 1.0 (which would cause division by zero)
  r = Math.min(r, 1 - 1e-12);

  // Compute multiplier using inverse mapping
  // mult = Math.floor((1 / (1 - r)) * 100) / 100
  let mult = Math.floor((1 / (1 - r)) * 100) / 100;

  // Apply MAX_MULT cap
  mult = Math.min(mult, maxMult);

  const serverSeedHash = sha256(serverSeed);

  return {
    computedResult: Math.round(mult * 100) / 100, // Round to 2 decimals
    computationHex,
    serverSeedHash,
  };
}

/**
 * Verify a game outcome using provably-fair algorithms
 * 
 * @param game - Game type ('dice' or 'crash')
 * @param serverSeed - Server seed (plaintext)
 * @param serverSeedHash - Optional server seed hash for verification
 * @param clientSeed - Client seed
 * @param nonce - Nonce (must be > 0)
 * @param maxMult - Maximum multiplier for crash (default: 10000)
 * @returns VerificationResult and verification status
 */
export function verifyGame(
  game: GameType,
  serverSeed: string,
  serverSeedHash: string | undefined,
  clientSeed: string,
  nonce: number,
  maxMult: number = 10000
): {
  result: VerificationResult;
  hashVerified: boolean;
  hashMismatch: boolean;
} {
  // Verify server seed hash if provided
  let hashVerified = false;
  let hashMismatch = false;

  if (serverSeedHash) {
    hashVerified = verifyServerSeedHash(serverSeed, serverSeedHash);
    if (!hashVerified) {
      hashMismatch = true;
    }
  }

  // Compute result based on game type
  let result: VerificationResult;
  if (game === 'dice') {
    result = verifyDice(serverSeed, clientSeed, nonce);
  } else if (game === 'crash') {
    result = verifyCrash(serverSeed, clientSeed, nonce, maxMult);
  } else {
    throw new Error(`Unknown game type: ${game}`);
  }

  return {
    result,
    hashVerified,
    hashMismatch,
  };
}

/**
 * Compare expected result with computed result
 * 
 * @param computed - Computed result
 * @param expected - Expected result
 * @param strict - If true, require exact match (within floating point precision)
 * @returns true if results match (within tolerance)
 */
export function compareResults(
  computed: number,
  expected: number,
  strict: boolean = false
): boolean {
  if (strict) {
    // Strict comparison: exact match (within floating point precision)
    return Math.abs(computed - expected) < Number.EPSILON * 10;
  } else {
    // Tolerant comparison: within 0.01 difference
    return Math.abs(computed - expected) < 0.01;
  }
}

