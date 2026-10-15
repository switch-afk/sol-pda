'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../src/args');
const { formatHuman, formatJson, lamportsToSol } = require('../src/format');
const { run } = require('../src/cli');
const { createMockRpc, httpError, rpcError } = require('./helpers/mock-rpc');

const TOKEN = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const VAULT = 'AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA';
const OTHER_OWNER = '11111111111111111111111111111111';

function sink() {
  return {
    data: '',
    write(chunk) {
      this.data += chunk;
    },
  };
}

const found = (extra = {}) => ({
  value: { owner: TOKEN, lamports: 1461600, executable: false, space: 165, ...extra },
});

async function check(handlers, extra = [], io = {}) {
  const mock = createMockRpc(handlers);
  const stdout = sink();
  const stderr = sink();
  const code = await run([TOKEN, '--seed', 'string:vault', '--check', ...extra], {
    stdout,
    stderr,
    fetch: mock.fetch,
    sleep: async () => {},
    env: {},
    ...io,
  });
  return { code, stdout: stdout.data, stderr: stderr.data, mock };
}

test('--check and --rpc are parsed; --rpc must be an http(s) URL and needs --check', () => {
  assert.equal(parseArgs([TOKEN]).check, false);
  assert.equal(parseArgs([TOKEN]).rpc, null);
  const opts = parseArgs([TOKEN, '--check', '--rpc', 'https://api.devnet.solana.com']);
  assert.equal(opts.check, true);
  assert.equal(opts.rpc, 'https://api.devnet.solana.com');
  assert.throws(() => parseArgs([TOKEN, '--check', '--rpc', 'nope']), /valid http\(s\) URL/);
  assert.throws(() => parseArgs([TOKEN, '--check', '--rpc', 'ftp://x.com']), /valid http\(s\) URL/);
  assert.throws(() => parseArgs([TOKEN, '--rpc', 'https://x.com']), /--rpc only applies together with --check/);
  assert.throws(() => parseArgs([TOKEN, '--check=1']), /does not take a value/);
});

test('lamportsToSol keeps nine decimals exact and trims zeros', () => {
  assert.equal(lamportsToSol(0), '0');
  assert.equal(lamportsToSol(1), '0.000000001');
  assert.equal(lamportsToSol(1461600), '0.0014616');
  assert.equal(lamportsToSol(1000000000), '1');
  assert.equal(lamportsToSol(2500000000), '2.5');
});

test('an existing account is shown and exits 0, after checking the derived address', async () => {
  const { code, stdout, mock } = await check({ getAccountInfo: found() });
  assert.equal(code, 0);
  assert.equal(mock.calls.length, 1);
  assert.equal(mock.calls[0].params[0], VAULT);
  assert.match(stdout, /Account {2}found on api\.mainnet-beta\.solana\.com/);
  assert.match(stdout, new RegExp(`Owner {4}${TOKEN} \\(the program\\)`));
  assert.match(stdout, /Balance {2}1461600 lamports \(0\.0014616 SOL\)/);
  assert.match(stdout, /Size {5}165 bytes/);
});

test('an owner other than the program is shown without the note', async () => {
  const { stdout } = await check({ getAccountInfo: found({ owner: OTHER_OWNER }) });
  assert.match(stdout, new RegExp(`Owner {4}${OTHER_OWNER}\\n`));
});

test('a missing account exits 1 and names the host', async () => {
  const { code, stdout } = await check({ getAccountInfo: { value: null } }, [
    '--rpc',
    'https://api.devnet.solana.com/?api-key=secret',
  ]);
  assert.equal(code, 1);
  assert.match(stdout, /Account {2}not found on api\.devnet\.solana\.com/);
  assert.ok(!stdout.includes('secret'));
});

test('the RPC url comes from --rpc, then SOL_PDA_RPC, then the default', async () => {
  const flag = await check({ getAccountInfo: found() }, ['--rpc', 'https://flag.example.com'], {
    env: { SOL_PDA_RPC: 'https://env.example.com' },
  });
  assert.equal(flag.mock.calls[0].url, 'https://flag.example.com');

  const env = await check({ getAccountInfo: found() }, [], { env: { SOL_PDA_RPC: 'https://env.example.com' } });
  assert.equal(env.mock.calls[0].url, 'https://env.example.com');

  const fallback = await check({ getAccountInfo: found() });
  assert.equal(fallback.mock.calls[0].url, 'https://api.mainnet-beta.solana.com');
});

test('an RPC failure still prints the derivation, reports the error and exits 1', async () => {
  const { code, stdout, stderr } = await check({ getAccountInfo: httpError(500) });
  assert.equal(code, 1);
  assert.match(stdout, new RegExp(`Address {2}${VAULT}`));
  assert.match(stdout, /Account {2}could not be checked/);
  assert.match(stderr, /Error: api\.mainnet-beta\.solana\.com returned HTTP 500/);
});

test('an RPC-level error is reported the same way', async () => {
  const { code, stderr } = await check({ getAccountInfo: rpcError(-32602, 'Invalid param') });
  assert.equal(code, 1);
  assert.match(stderr, /Invalid param/);
});

test('--json includes the account, and the error case carries the message', async () => {
  const ok = await check({ getAccountInfo: found() }, ['--json']);
  assert.equal(ok.code, 0);
  assert.deepEqual(JSON.parse(ok.stdout).account, {
    host: 'api.mainnet-beta.solana.com',
    status: 'found',
    owner: TOKEN,
    lamports: 1461600,
    executable: false,
    size: 165,
  });

  const missing = await check({ getAccountInfo: { value: null } }, ['--json']);
  assert.deepEqual(JSON.parse(missing.stdout).account, { host: 'api.mainnet-beta.solana.com', status: 'not-found' });

  const failed = await check({ getAccountInfo: httpError(500) }, ['--json']);
  const account = JSON.parse(failed.stdout).account;
  assert.equal(account.status, 'error');
  assert.match(account.error, /HTTP 500/);
});

test('--check works together with --verify', async () => {
  const { code, stdout } = await check({ getAccountInfo: found() }, ['--verify', VAULT]);
  assert.equal(code, 0);
  assert.match(stdout, /Result {3}match, it is the canonical PDA/);
  assert.match(stdout, /Account {2}found on/);
});

test('a failed --verify still exits 1 even when the account exists', async () => {
  const { code } = await check({ getAccountInfo: found() }, ['--verify', TOKEN]);
  assert.equal(code, 1);
});

test('without --check no RPC call is made and no account output appears', async () => {
  const mock = createMockRpc({ getAccountInfo: found() });
  const stdout = sink();
  const code = await run([TOKEN, '--seed', 'string:vault', '--json'], { stdout, stderr: sink(), fetch: mock.fetch });
  assert.equal(code, 0);
  assert.equal(mock.calls.length, 0);
  assert.equal(JSON.parse(stdout.data).account, undefined);
  assert.doesNotMatch(formatHuman({ program: TOKEN, seeds: [], address: VAULT, bump: 254 }), /Account/);
  assert.equal(JSON.parse(formatJson({ program: TOKEN, seeds: [], address: VAULT, bump: 254 })).account, undefined);
});

test('--help documents --check, --rpc and the env var', async () => {
  const stdout = sink();
  await run(['--help'], { stdout, stderr: sink() });
  assert.match(stdout.data, /--check/);
  assert.match(stdout.data, /--rpc <url>/);
  assert.match(stdout.data, /SOL_PDA_RPC/);
});