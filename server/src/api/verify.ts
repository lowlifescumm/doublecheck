import { Request, Response } from 'express';
import { verifyGame, compareResults, GameType } from '../lib/provablyFair';
import { createAuditDigest } from '../lib/hashUtils';

export interface VerifyRequest {
  game: GameType;
  server_seed: string;
  server_seed_hash?: string;
  client_seed: string;
  nonce: number;
  server_provided_hash?: boolean;
  expected_result?: number;
  expect_strict?: boolean;
}

export interface VerifyResponse {
  ok: boolean;
  game: GameType;
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

/**
 * Validate verify request
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
  if (!body.game || (body.game !== 'dice' && body.game !== 'crash')) {
    return { valid: false, error: 'Invalid game type. Must be "dice" or "crash"' };
  }

  if (!body.server_seed || typeof body.server_seed !== 'string') {
    return { valid: false, error: 'server_seed is required and must be a string' };
  }

  if (body.server_seed.length > 1000) {
    return { valid: false, error: 'server_seed is too long (max 1000 characters)' };
  }

  if (!body.client_seed || typeof body.client_seed !== 'string') {
    return { valid: false, error: 'client_seed is required and must be a string' };
  }

  if (body.client_seed.length > 1000) {
    return { valid: false, error: 'client_seed is too long (max 1000 characters)' };
  }

  if (typeof body.nonce !== 'number' || body.nonce < 1 || !Number.isInteger(body.nonce)) {
    return { valid: false, error: 'nonce must be a positive integer' };
  }

  if (body.expected_result !== undefined) {
    if (typeof body.expected_result !== 'number' || body.expected_result < 0) {
      return { valid: false, error: 'expected_result must be a non-negative number' };
    }
  }

  if (body.server_seed_hash && typeof body.server_seed_hash !== 'string') {
    return { valid: false, error: 'server_seed_hash must be a string if provided' };
  }

  return { valid: true };
}

/**
 * POST /api/verify
 * Verify a provably-fair game outcome
 */
export function postVerify(req: Request, res: Response): void {
  try {
    const body = req.body as VerifyRequest;

    // Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      res.status(400).json({
        ok: false,
        error: validation.error,
      } as VerifyResponse);
      return;
    }

    // Get MAX_MULT from environment (default: 10000)
    const maxMult = parseInt(process.env.MAX_MULT || '10000', 10);

    // Verify the game outcome
    const { result, hashVerified, hashMismatch } = verifyGame(
      body.game,
      body.server_seed,
      body.server_seed_hash,
      body.client_seed,
      body.nonce,
      maxMult
    );

    // Build notes
    const notes: string[] = [];
    
    if (body.server_seed_hash) {
      if (hashMismatch) {
        notes.push('Server seed hash verification FAILED - hash mismatch');
      } else if (hashVerified) {
        notes.push('Server seed hash verified successfully');
      }
    } else {
      notes.push('No server seed hash provided for verification');
    }

    // Determine verdict
    let verdict: 'PASS' | 'FAIL' = 'PASS';

    // Check hash verification
    if (hashMismatch) {
      verdict = 'FAIL';
    }

    // Check expected result if provided
    if (body.expected_result !== undefined) {
      const matches = compareResults(
        result.computedResult,
        body.expected_result,
        body.expect_strict || false
      );
      
      if (matches) {
        notes.push(`Computed result matches expected result (${body.expected_result})`);
      } else {
        verdict = 'FAIL';
        notes.push(
          `Computed result (${result.computedResult}) does not match expected result (${body.expected_result})`
        );
      }
    } else {
      notes.push('No expected result provided - computation only');
    }

    // Security: Never log plaintext server_seed
    // Use audit digest for any logging purposes
    const auditDigest = createAuditDigest(body.server_seed);
    // Note: We don't log the full server_seed anywhere

    const response: VerifyResponse = {
      ok: true,
      game: body.game,
      computed_result: result.computedResult,
      verdict,
      details: {
        used_input: {
          client_seed: body.client_seed,
          nonce: body.nonce,
          server_seed_hash: result.serverSeedHash,
        },
        computation_hex: result.computationHex,
        notes: notes.join('; '),
      },
    };

    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      ok: false,
      error: `Verification failed: ${errorMessage}`,
    } as VerifyResponse);
  }
}

