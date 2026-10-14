'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { run } = require('../src/cli');
const { version } = require('../package.json');

const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ATA = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const WALLET = 'So11111111111111111111111111111111111111112';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function sink() {
  return {
    data: '',
    write(chunk) {
      this.data += chunk;
    },
  };
}

test('--help prints usage and seed types and exits 0', async () => {
  const stdout = sink();
  const code = await run(['--help'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.match(stdout.data, /Usage:/);
  assert.match(stdout.data, /--seed/);
  assert.match(stdout.data, /--json/);
  assert.match(stdout.data, /u8\|u16\|u32\|u64/);
});

test('--version prints the package version', async () => {
  const stdout = sink();
  const code = await run(['--version'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.equal(stdout.data.trim(), version);
});

test('usage errors exit 2 and print to stderr', async () => {
  const stdout = sink();
  const stderr = sink();
  const code = await run([], { stdout, stderr });
  assert.equal(code, 2);
  assert.equal(stdout.data, '');
  assert.match(stderr.data, /Error: Missing program address/);
  assert.match(stderr.data, /Usage:/);
});

test('derives a PDA and prints it with the bump', async () => {
  const stdout = sink();
  const code = await run([TOKEN, '--seed', 'string:vault'], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.match(stdout.data, /Address {2}AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA/);
  assert.match(stdout.data, /Bump {5}254/);
});

test('--json prints the derivation as JSON', async () => {
  const stdout = sink();
  const argv = [ATA, '--seed', `pubkey:${WALLET}`, '--seed', `pubkey:${TOKEN}`, '--seed', `pubkey:${MINT}`, '--json'];
  const code = await run(argv, { stdout, stderr: sink() });
  assert.equal(code, 0);
  const parsed = JSON.parse(stdout.data);
  assert.equal(parsed.address, 'DHe62eeQVEnNK7vg5xUpDkJm7tuqHadjhvmPRFBG9UPo');
  assert.equal(parsed.bump, 254);
  assert.equal(parsed.seeds.length, 3);
});

test('a program address with no seeds is fine', async () => {
  const stdout = sink();
  const code = await run([TOKEN], { stdout, stderr: sink() });
  assert.equal(code, 0);
  assert.match(stdout.data, /29aDZ12ST2mQkLeVfoeKkkm7WA83MCyiGU3Zf8MjDDGV/);
});

test('a bad seed is a usage error with exit 2 and nothing on stdout', async () => {
  const stdout = sink();
  const stderr = sink();
  const code = await run([TOKEN, '--seed', 'u8:300'], { stdout, stderr });
  assert.equal(code, 2);
  assert.equal(stdout.data, '');
  assert.match(stderr.data, /Invalid seed "u8:300"/);
});