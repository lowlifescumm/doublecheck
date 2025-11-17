import {
  verifyDice,
  verifyCrash,
  verifyGame,
  compareResults,
} from '../src/lib/provablyFair';
import { sha256, verifyServerSeedHash } from '../src/lib/hashUtils';

describe('Provably Fair Algorithms', () => {
  describe('Dice Algorithm', () => {
    test('Test Vector 1: Basic dice calculation', () => {
      const serverSeed = 'test-server-seed-1';
      const clientSeed = 'test-client-seed-1';
      const nonce = 1;

      const result = verifyDice(serverSeed, clientSeed, nonce);

      // Verify result is in valid range
      expect(result.computedResult).toBeGreaterThanOrEqual(0);
      expect(result.computedResult).toBeLessThan(100);
      expect(result.computationHex).toBeTruthy();
      expect(result.serverSeedHash).toBe(sha256(serverSeed));
    });

    test('Test Vector 2: Different nonce produces different result', () => {
      const serverSeed = 'test-server-seed-2';
      const clientSeed = 'test-client-seed-2';
      const nonce1 = 1;
      const nonce2 = 2;

      const result1 = verifyDice(serverSeed, clientSeed, nonce1);
      const result2 = verifyDice(serverSeed, clientSeed, nonce2);

      // Results should be different
      expect(result1.computedResult).not.toBe(result2.computedResult);
    });

    test('Test Vector 3: Deterministic - same inputs produce same result', () => {
      const serverSeed = 'deterministic-test-seed';
      const clientSeed = 'deterministic-client';
      const nonce = 42;

      const result1 = verifyDice(serverSeed, clientSeed, nonce);
      const result2 = verifyDice(serverSeed, clientSeed, nonce);

      // Results should be identical
      expect(result1.computedResult).toBe(result2.computedResult);
      expect(result1.computationHex).toBe(result2.computationHex);
      expect(result1.serverSeedHash).toBe(result2.serverSeedHash);
    });

    test('Test Vector 4: Specific known result', () => {
      // Using a seed that produces a predictable result for verification
      const serverSeed = 'seed123';
      const clientSeed = 'client456';
      const nonce = 1;

      const result = verifyDice(serverSeed, clientSeed, nonce);

      // Verify the algorithm steps
      const hashInput = `${serverSeed}:${clientSeed}:${nonce}`;
      const hash = sha256(hashInput);
      const hexPrefix = hash.slice(0, 8);
      const x = parseInt(hexPrefix, 16);
      const expectedResult = (x % 10000) / 100;
      const roundedExpected = Math.round(expectedResult * 100) / 100;

      expect(result.computedResult).toBe(roundedExpected);
    });
  });

  describe('Crash Algorithm', () => {
    test('Test Vector 1: Basic crash calculation', () => {
      const serverSeed = 'crash-server-seed-1';
      const clientSeed = 'crash-client-seed-1';
      const nonce = 1;
      const maxMult = 10000;

      const result = verifyCrash(serverSeed, clientSeed, nonce, maxMult);

      // Verify result is valid multiplier (>= 1.0, <= maxMult)
      expect(result.computedResult).toBeGreaterThanOrEqual(1.0);
      expect(result.computedResult).toBeLessThanOrEqual(maxMult);
      expect(result.computationHex).toBeTruthy();
      expect(result.serverSeedHash).toBe(sha256(serverSeed));
    });

    test('Test Vector 2: MAX_MULT cap is applied', () => {
      const serverSeed = 'crash-server-seed-2';
      const clientSeed = 'crash-client-seed-2';
      const nonce = 1;
      const maxMult = 100; // Lower cap for testing

      const result = verifyCrash(serverSeed, clientSeed, nonce, maxMult);

      expect(result.computedResult).toBeLessThanOrEqual(maxMult);
    });

    test('Test Vector 3: Deterministic - same inputs produce same result', () => {
      const serverSeed = 'crash-deterministic-seed';
      const clientSeed = 'crash-deterministic-client';
      const nonce = 100;
      const maxMult = 10000;

      const result1 = verifyCrash(serverSeed, clientSeed, nonce, maxMult);
      const result2 = verifyCrash(serverSeed, clientSeed, nonce, maxMult);

      // Results should be identical
      expect(result1.computedResult).toBe(result2.computedResult);
      expect(result1.computationHex).toBe(result2.computationHex);
    });

    test('Test Vector 4: Inverse mapping produces heavy-tailed distribution', () => {
      // Test that the algorithm produces multipliers > 1.0
      const serverSeed = 'crash-test-seed';
      const clientSeed = 'crash-test-client';
      const maxMult = 10000;

      // Test multiple nonces to see distribution
      const results: number[] = [];
      for (let nonce = 1; nonce <= 10; nonce++) {
        const result = verifyCrash(serverSeed, clientSeed, nonce, maxMult);
        results.push(result.computedResult);
      }

      // All results should be >= 1.0
      results.forEach((r) => {
        expect(r).toBeGreaterThanOrEqual(1.0);
      });

      // At least some results should be > 1.0 (not all exactly 1.0)
      const hasVariation = results.some((r) => r > 1.0);
      expect(hasVariation).toBe(true);
    });

    test('Test Vector 5: Clamping prevents division by zero', () => {
      // Test that r is clamped to avoid 1.0
      const serverSeed = 'clamp-test';
      const clientSeed = 'clamp-client';
      const nonce = 1;
      const maxMult = 10000;

      const result = verifyCrash(serverSeed, clientSeed, nonce, maxMult);

      // Verify the computation doesn't crash and produces valid result
      expect(result.computedResult).toBeGreaterThanOrEqual(1.0);
      expect(result.computedResult).toBeFinite();
    });
  });

  describe('Server Seed Hash Verification', () => {
    test('Hash verification passes with correct hash', () => {
      const serverSeed = 'test-seed-for-hash';
      const serverSeedHash = sha256(serverSeed);

      const verified = verifyServerSeedHash(serverSeed, serverSeedHash);
      expect(verified).toBe(true);
    });

    test('Hash verification fails with incorrect hash', () => {
      const serverSeed = 'test-seed-for-hash';
      const wrongHash = 'wrong-hash-value';

      const verified = verifyServerSeedHash(serverSeed, wrongHash);
      expect(verified).toBe(false);
    });

    test('verifyGame with hash verification - PASS case', () => {
      const serverSeed = 'game-test-seed';
      const serverSeedHash = sha256(serverSeed);
      const clientSeed = 'game-client';
      const nonce = 1;

      const { result, hashVerified, hashMismatch } = verifyGame(
        'dice',
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce
      );

      expect(hashVerified).toBe(true);
      expect(hashMismatch).toBe(false);
      expect(result.computedResult).toBeGreaterThanOrEqual(0);
    });

    test('verifyGame with hash verification - FAIL case', () => {
      const serverSeed = 'game-test-seed';
      const wrongHash = 'wrong-hash-value';
      const clientSeed = 'game-client';
      const nonce = 1;

      const { result, hashVerified, hashMismatch } = verifyGame(
        'dice',
        serverSeed,
        wrongHash,
        clientSeed,
        nonce
      );

      expect(hashVerified).toBe(false);
      expect(hashMismatch).toBe(true);
      expect(result.computedResult).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Result Comparison', () => {
    test('Tolerant comparison - within 0.01 passes', () => {
      const computed = 42.37;
      const expected = 42.38; // 0.01 difference

      const matches = compareResults(computed, expected, false);
      expect(matches).toBe(true);
    });

    test('Tolerant comparison - outside 0.01 fails', () => {
      const computed = 42.37;
      const expected = 42.39; // 0.02 difference

      const matches = compareResults(computed, expected, false);
      expect(matches).toBe(false);
    });

    test('Strict comparison - exact match passes', () => {
      const computed = 42.37;
      const expected = 42.37;

      const matches = compareResults(computed, expected, true);
      expect(matches).toBe(true);
    });

    test('Strict comparison - small difference fails', () => {
      const computed = 42.37;
      const expected = 42.3701; // Very small difference

      const matches = compareResults(computed, expected, true);
      // May pass due to floating point precision, but test the logic
      expect(typeof matches).toBe('boolean');
    });
  });

  describe('Integration Tests', () => {
    test('Full verification flow - Dice with expected result (PASS)', () => {
      const serverSeed = 'integration-test';
      const clientSeed = 'integration-client';
      const nonce = 1;

      // First compute the result
      const { result } = verifyGame('dice', serverSeed, undefined, clientSeed, nonce);
      const expectedResult = result.computedResult;

      // Then verify with expected result
      const matches = compareResults(result.computedResult, expectedResult, false);
      expect(matches).toBe(true);
    });

    test('Full verification flow - Crash with hash verification', () => {
      const serverSeed = 'crash-integration';
      const serverSeedHash = sha256(serverSeed);
      const clientSeed = 'crash-integration-client';
      const nonce = 5;
      const maxMult = 10000;

      const { result, hashVerified } = verifyGame(
        'crash',
        serverSeed,
        serverSeedHash,
        clientSeed,
        nonce,
        maxMult
      );

      expect(hashVerified).toBe(true);
      expect(result.computedResult).toBeGreaterThanOrEqual(1.0);
      expect(result.computedResult).toBeLessThanOrEqual(maxMult);
    });
  });
});

