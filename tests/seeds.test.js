'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSeed } = require('../src/seeds');
const { UsageError } = require('../src/args');

const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const hex = (bytes) => Buffer.from(bytes).toString('hex');

test('string seeds are UTF-8, and may be empty or contain colons', () => {
  assert.equal(hex(parseSeed('string:vault')), '7661756c74');
  assert.equal(hex(parseSeed('string:a:b')), '613a62');
  assert.equal(hex(parseSeed('string:')), '');
  assert.equal(hex(parseSeed('string:é')), 'c3a9');
});

test('pubkey seeds are the 32 decoded bytes', () => {
  const bytes = parseSeed(`pubkey:${MINT}`);
  assert.equal(bytes.length, 32);
  assert.equal(hex(bytes).slice(0, 8), 'c6fa7af3');
});

test('pubkey seeds must be valid addresses', () => {
  assert.throws(() => parseSeed('pubkey:nope'), /valid Solana address/);
});

test('hex seeds accept an optional 0x prefix', () => {
  assert.equal(hex(parseSeed('hex:ff00')), 'ff00');
  assert.equal(hex(parseSeed('hex:0xAB12')), 'ab12');
  assert.equal(hex(parseSeed('hex:')), '');
});

test('hex seeds reject odd length and non-hex digits', () => {
  assert.throws(() => parseSeed('hex:abc'), /even number of hex digits/);
  assert.throws(() => parseSeed('hex:zz'), /even number of hex digits/);
});

test('integer seeds are little-endian with the right width', () => {
  assert.equal(hex(parseSeed('u8:255')), 'ff');
  assert.equal(hex(parseSeed('u16:258')), '0201');
  assert.equal(hex(parseSeed('u32:1')), '01000000');
  assert.equal(hex(parseSeed('u64:1')), '0100000000000000');
  assert.equal(hex(parseSeed('u64:18446744073709551615')), 'ffffffffffffffff');
});

test('integer seeds reject out of range and non-numbers', () => {
  assert.throws(() => parseSeed('u8:256'), /cannot be larger than 255/);
  assert.throws(() => parseSeed('u64:18446744073709551616'), /cannot be larger than/);
  assert.throws(() => parseSeed('u8:-1'), /whole number/);
  assert.throws(() => parseSeed('u32:1.5'), /whole number/);
  assert.throws(() => parseSeed('u16:abc'), /whole number/);
  assert.throws(() => parseSeed('u8:'), /whole number/);
});

test('missing type, unknown type and long seeds are usage errors', () => {
  assert.throws(() => parseSeed('vault'), /use type:value/);
  assert.throws(() => parseSeed('bytes:00'), /unknown type "bytes"/);
  assert.throws(() => parseSeed(`string:${'a'.repeat(33)}`), /maximum is 32/);
  assert.doesNotThrow(() => parseSeed(`string:${'a'.repeat(32)}`));
  assert.throws(() => parseSeed('vault'), UsageError);
});