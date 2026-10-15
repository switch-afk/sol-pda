'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../src/args');
const { formatHuman, formatJson } = require('../src/format');
const { run } = require('../src/cli');

const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const WALLET = 'So11111111111111111111111111111111111111112';
const CANONICAL = 'AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA';
const NON_CANONICAL = '57DjfLevBMcvKXWwatLsWCh9xLvRm2ix8NxR3L4w2ZHX';

function sink() {
  return {
    data: '',
    write(chunk) {
      this.data += chunk;
    },
  };
}

async function verify(address, extra = []) {
  const stdout = sink();
  const stderr = sink();
  const code = await run([TOKEN, '--seed', 'string:vault', '--verify', address, ...extra], { stdout, stderr });
  return { code, stdout: stdout.data, stderr: stderr.data };
}

test('--verify is parsed in both forms and defaults to null', () => {
  assert.equal(parseArgs([TOKEN]).verify, null);
  assert.equal(parseArgs([TOKEN, '--verify', WALLET]).verify, WALLET);
  assert.equal(parseArgs([TOKEN, `--verify=${WALLET}`]).verify, WALLET);
});

test('--verify needs a valid address and can only be given once', () => {
  assert.throws(() => parseArgs([TOKEN, '--verify']), /--verify needs an address/);
  assert.throws(() => parseArgs([TOKEN, '--verify', 'nope']), /--verify is not a valid Solana address/);
  assert.throws(
    () => parseArgs([TOKEN, '--verify', WALLET, '--verify', WALLET]),
    /--verify can only be given once/
  );
});

test('the canonical PDA verifies with exit 0', async () => {
  const { code, stdout } = await verify(CANONICAL);
  assert.equal(code, 0);
  assert.match(stdout, new RegExp(`Check {4}${CANONICAL}`));
  assert.match(stdout, /Result {3}match, it is the canonical PDA/);
});

test('a non-canonical bump is reported and exits 1', async () => {
  const { code, stdout } = await verify(NON_CANONICAL);
  assert.equal(code, 1);
  assert.match(stdout, /Result {3}match, but with non-canonical bump 252 \(canonical is 254\)/);
});

test('an address that is not a PDA of the seeds exits 1', async () => {
  const { code, stdout } = await verify(WALLET);
  assert.equal(code, 1);
  assert.match(stdout, /Result {3}no match, it is not a PDA of these seeds/);
  assert.match(stdout, new RegExp(`Address {2}${CANONICAL}`));
});

test('--json includes the verification result', async () => {
  const { code, stdout } = await verify(NON_CANONICAL, ['--json']);
  assert.equal(code, 1);
  const parsed = JSON.parse(stdout);
  assert.deepEqual(parsed.verify, { address: NON_CANONICAL, result: 'non-canonical', bump: 252 });
  assert.equal(parsed.bump, 254);
});

test('output without --verify has no check lines and no verify key', async () => {
  const stdout = sink();
  await run([TOKEN, '--seed', 'string:vault'], { stdout, stderr: sink() });
  assert.doesNotMatch(stdout.data, /Check|Result/);

  const base = { program: TOKEN, seeds: [], address: CANONICAL, bump: 254 };
  assert.equal(JSON.parse(formatJson(base)).verify, undefined);
  assert.doesNotMatch(formatHuman(base), /Result/);
});

test('--help documents --verify', async () => {
  const stdout = sink();
  await run(['--help'], { stdout, stderr: sink() });
  assert.match(stdout.data, /--verify <address>/);
});