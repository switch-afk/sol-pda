'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, UsageError, MAX_SEEDS } = require('../src/args');

const PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

test('parses a bare program address with defaults', () => {
  const opts = parseArgs([PROGRAM]);
  assert.equal(opts.program, PROGRAM);
  assert.deepEqual(opts.seeds, []);
  assert.equal(opts.json, false);
});

test('parses --json', () => {
  assert.equal(parseArgs([PROGRAM, '--json']).json, true);
});

test('--json does not take a value', () => {
  assert.throws(() => parseArgs([PROGRAM, '--json=yes']), /does not take a value/);
});

test('--seed can repeat and keeps its order, in both forms', () => {
  const opts = parseArgs([PROGRAM, '--seed', 'string:vault', '--seed=u8:1', '--seed', 'hex:ff']);
  assert.deepEqual(opts.seeds, ['string:vault', 'u8:1', 'hex:ff']);
});

test('--seed needs a value', () => {
  assert.throws(() => parseArgs([PROGRAM, '--seed']), /--seed needs a type:value pair/);
  assert.throws(() => parseArgs([PROGRAM, '--seed=']), /--seed needs a type:value pair/);
  assert.throws(() => parseArgs([PROGRAM, '--seed', '--json']), /--seed needs a type:value pair/);
});

test('more than the maximum number of seeds is a usage error', () => {
  const ok = [];
  for (let i = 0; i < MAX_SEEDS; i++) ok.push('--seed', `u8:${i}`);
  assert.equal(parseArgs([PROGRAM, ...ok]).seeds.length, MAX_SEEDS);
  assert.throws(() => parseArgs([PROGRAM, ...ok, '--seed', 'u8:99']), /At most 16 seeds/);
});

test('--help and --version work without an address', () => {
  assert.equal(parseArgs(['--help']).help, true);
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['--version']).version, true);
  assert.equal(parseArgs(['-v']).version, true);
});

test('missing program address is a usage error', () => {
  assert.throws(() => parseArgs([]), UsageError);
  assert.throws(() => parseArgs(['--json']), /Missing program address/);
});

test('invalid program address is a usage error', () => {
  assert.throws(() => parseArgs(['not-an-address']), /valid Solana address/);
});

test('unknown option and extra argument are usage errors', () => {
  assert.throws(() => parseArgs([PROGRAM, '--nope']), /Unknown option: --nope/);
  assert.throws(() => parseArgs([PROGRAM, PROGRAM]), /Only one program address/);
});