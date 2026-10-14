'use strict';

const crypto = require('node:crypto');

// Same limits as the Solana runtime. find_program_address appends the bump as
// one more seed, so a derivation takes at most MAX_SEEDS - 1 seeds from you.
const MAX_SEEDS = 16;
const MAX_SEED_LEN = 32;
const MARKER = Buffer.from('ProgramDerivedAddress');

// Curve25519 field prime and the Edwards curve constant d = -121665 / 121666.
const P = (1n << 255n) - 19n;

function mod(value) {
  const result = value % P;
  return result >= 0n ? result : result + P;
}

function modPow(base, exponent) {
  let result = 1n;
  let b = mod(base);
  let e = exponent;
  while (e > 0n) {
    if (e & 1n) result = (result * b) % P;
    b = (b * b) % P;
    e >>= 1n;
  }
  return result;
}

const D = mod(-121665n * modPow(121666n, P - 2n));

function sha256(...chunks) {
  const hash = crypto.createHash('sha256');
  for (const chunk of chunks) hash.update(chunk);
  return new Uint8Array(hash.digest());
}

// True when the 32 bytes decode to a point on the ed25519 curve.
// Program derived addresses are the hashes that are NOT on the curve.
function isOnCurve(bytes) {
  if (bytes.length !== 32) return false;

  const copy = Uint8Array.from(bytes);
  const signBit = copy[31] >> 7;
  copy[31] &= 0x7f;

  let y = 0n;
  for (let i = 31; i >= 0; i--) y = (y << 8n) | BigInt(copy[i]);
  if (y >= P) return false;

  const y2 = mod(y * y);
  const u = mod(y2 - 1n);
  const v = mod(D * y2 + 1n);
  const x2 = mod(u * modPow(v, P - 2n));

  if (x2 === 0n) return signBit === 0;
  return modPow(x2, (P - 1n) / 2n) === 1n;
}

function checkSeeds(seeds, max) {
  if (seeds.length > max) {
    throw new Error(`At most ${max} seeds are allowed`);
  }
  for (const seed of seeds) {
    if (seed.length > MAX_SEED_LEN) {
      throw new Error(`A seed is ${seed.length} bytes, the maximum is ${MAX_SEED_LEN}`);
    }
  }
}

function checkProgram(programId) {
  if (programId.length !== 32) {
    throw new Error('Program address must be 32 bytes');
  }
}

// Hash the seeds with the program id. Throws when the result is on the curve,
// because that would be a normal keypair address, not a PDA.
// seeds: array of Uint8Array/Buffer, bump included if you have one.
function createProgramAddress(seeds, programId) {
  checkSeeds(seeds, MAX_SEEDS);
  checkProgram(programId);
  const hash = sha256(...seeds, programId, MARKER);
  if (isOnCurve(hash)) {
    throw new Error('Seeds produce an address on the ed25519 curve, so it is not a PDA');
  }
  return hash;
}

// Try bumps from 255 down and return the first address that is off the curve.
function findProgramAddress(seeds, programId) {
  checkSeeds(seeds, MAX_SEEDS - 1);
  checkProgram(programId);
  for (let bump = 255; bump >= 0; bump--) {
    const hash = sha256(...seeds, Uint8Array.of(bump), programId, MARKER);
    if (!isOnCurve(hash)) return { address: hash, bump };
  }
  throw new Error('Could not find a program derived address');
}

module.exports = {
  isOnCurve,
  createProgramAddress,
  findProgramAddress,
  MAX_SEEDS,
  MAX_SEED_LEN,
};