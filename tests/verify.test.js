'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeBase58 } = require('../src/address');
const { findProgramAddress } = require('../src/pda');
const { findBump, verifyAddress } = require('../src/verify');

const TOKEN = decodeBase58('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SEEDS = [Buffer.from('vault')];

// Expected values come from @solana/web3.js (findProgramAddressSync, createProgramAddressSync).
const CANONICAL = 'AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA'; // bump 254
const NON_CANONICAL = '57DjfLevBMcvKXWwatLsWCh9xLvRm2ix8NxR3L4w2ZHX'; // bump 252

test('findBump returns the bump that produces an address', () => {
  assert.equal(findBump(SEEDS, TOKEN, decodeBase58(CANONICAL)), 254);
  assert.equal(findBump(SEEDS, TOKEN, decodeBase58(NON_CANONICAL)), 252);
});

test('findBump returns null for an address these seeds do not produce', () => {
  assert.equal(findBump(SEEDS, TOKEN, decodeBase58('So11111111111111111111111111111111111111112')), null);
  assert.equal(findBump([Buffer.from('other')], TOKEN, decodeBase58(CANONICAL)), null);
});

test('verifyAddress reports a canonical match, a non-canonical match and no match', () => {
  const canonical = findProgramAddress(SEEDS, TOKEN);

  assert.deepEqual(verifyAddress(SEEDS, TOKEN, decodeBase58(CANONICAL), canonical), {
    result: 'match',
    bump: 254,
  });
  assert.deepEqual(verifyAddress(SEEDS, TOKEN, decodeBase58(NON_CANONICAL), canonical), {
    result: 'non-canonical',
    bump: 252,
  });
  assert.deepEqual(
    verifyAddress(SEEDS, TOKEN, decodeBase58('So11111111111111111111111111111111111111112'), canonical),
    { result: 'no-match', bump: null }
  );
});