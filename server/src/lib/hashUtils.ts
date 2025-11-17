import { createHash } from 'crypto';

/**
 * Compute SHA256 hash of a string
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Verify server seed hash
 * Returns true if server_seed hashes to the provided server_seed_hash
 */
export function verifyServerSeedHash(
  serverSeed: string,
  serverSeedHash: string
): boolean {
  const computedHash = sha256(serverSeed);
  return computedHash.toLowerCase() === serverSeedHash.toLowerCase();
}

/**
 * Create a short audit digest from server seed (for logging/display)
 * Returns first 12 characters of SHA256 hash
 */
export function createAuditDigest(serverSeed: string): string {
  return sha256(serverSeed).slice(0, 12);
}

