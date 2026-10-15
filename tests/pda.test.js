'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeBase58, encodeBase58 } = require('../src/address');
const {
  isOnCurve,
  createProgramAddress,
  findProgramAddress,
  MAX_SEED_LEN,
} = require('../src/pda');

const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ATA = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const META = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const WALLET = 'So11111111111111111111111111111111111111112';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const b58 = (address) => decodeBase58(address);
const utf8 = (text) => Buffer.from(text, 'utf8');

// Expected values come from @solana/web3.js (findProgramAddressSync).
function derive(seeds, program) {
  const { address, bump } = findProgramAddress(seeds, b58(program));
  return [encodeBase58(address), bump];
}

test('derives the associated token account PDA', () => {
  const seeds = [b58(WALLET), b58(TOKEN), b58(MINT)];
  assert.deepEqual(derive(seeds, ATA), ['DHe62eeQVEnNK7vg5xUpDkJm7tuqHadjhvmPRFBG9UPo', 254]);
});

test('derives the Metaplex metadata PDA', () => {
  const seeds = [utf8('metadata'), b58(META), b58(MINT)];
  assert.deepEqual(derive(seeds, META), ['5x38Kp4hvdomTCnCrAny4UtMUt5rQBdB6px2K1Ui45Wq', 255]);
});

test('derives a PDA from a single string seed', () => {
  assert.deepEqual(derive([utf8('vault')], TOKEN), ['AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA', 254]);
});

test('derives a PDA from a string plus a little-endian u64 seed', () => {
  const seeds = [utf8('vault'), Buffer.from([1, 0, 0, 0, 0, 0, 0, 0])];
  assert.deepEqual(derive(seeds, TOKEN), ['9v9uPG5jUkXmFjvS8jyYALRYdRFm8js8WVtJEvBB1qvK', 254]);
});

test('derives with no seeds, a 32 byte seed and 15 seeds', () => {
  assert.deepEqual(derive([], TOKEN), ['29aDZ12ST2mQkLeVfoeKkkm7WA83MCyiGU3Zf8MjDDGV', 255]);
  assert.deepEqual(derive([Buffer.alloc(32, 7)], TOKEN), ['AwxHwzrhAEAqzth5W2FHCYx3gRX75uQNXSU7RtiuBELN', 254]);
  const fifteen = Array.from({ length: 15 }, (_, i) => Buffer.from([i]));
  assert.deepEqual(derive(fifteen, TOKEN), ['Axq9RwCkzEDbSok8vEeSozwhHwN3Eh6hi46QucwGD6HA', 255]);
});

test('findProgramAddress rejects too many or too long seeds', () => {
  const sixteen = Array.from({ length: 16 }, (_, i) => Buffer.from([i]));
  assert.throws(() => findProgramAddress(sixteen, b58(TOKEN)), /At most 15 seeds/);
  assert.throws(
    () => findProgramAddress([Buffer.alloc(MAX_SEED_LEN + 1)], b58(TOKEN)),
    /maximum is 32/
  );
});

test('findProgramAddress rejects a program id that is not 32 bytes', () => {
  assert.throws(() => findProgramAddress([], new Uint8Array(31)), /32 bytes/);
});

test('createProgramAddress with the found bump gives the same address', () => {
  const found = findProgramAddress([utf8('vault')], b58(TOKEN));
  const created = createProgramAddress([utf8('vault'), Uint8Array.of(found.bump)], b58(TOKEN));
  assert.equal(encodeBase58(created), 'AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA');
});

test('createProgramAddress rejects seeds that land on the curve', () => {
  assert.throws(() => createProgramAddress([utf8('x0')], b58(TOKEN)), /on the ed25519 curve/);
});

test('createProgramAddress allows 16 seeds and rejects 17', () => {
  const sixteen = Array.from({ length: 16 }, (_, i) => Buffer.from([i]));
  assert.throws(() => createProgramAddress([...sixteen, Buffer.from([1])], b58(TOKEN)), /At most 16 seeds/);
});

test('isOnCurve accepts real public keys and the base point', () => {
  assert.equal(isOnCurve(b58(WALLET)), true);
  assert.equal(isOnCurve(b58('11111111111111111111111111111111')), true);
  const basePoint = Buffer.from('5866666666666666666666666666666666666666666666666666666666666666', 'hex');
  assert.equal(isOnCurve(basePoint), true);
});

test('isOnCurve rejects derived addresses and wrong lengths', () => {
  assert.equal(isOnCurve(b58('DHe62eeQVEnNK7vg5xUpDkJm7tuqHadjhvmPRFBG9UPo')), false);
  assert.equal(isOnCurve(b58('AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA')), false);
  assert.equal(isOnCurve(new Uint8Array(31)), false);
});