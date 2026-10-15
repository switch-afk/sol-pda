'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createRpcClient } = require('../src/rpc');
const { fetchAccount } = require('../src/account');
const { createMockRpc } = require('./helpers/mock-rpc');

const ADDRESS = 'AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA';
const OWNER = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

function clientFor(handlers) {
  const mock = createMockRpc(handlers);
  return { mock, client: createRpcClient({ url: 'https://rpc.example.com', fetch: mock.fetch }) };
}

test('asks for the address with an empty data slice', async () => {
  const { client, mock } = clientFor({ getAccountInfo: { value: null } });
  await fetchAccount(client, ADDRESS);
  assert.equal(mock.calls[0].method, 'getAccountInfo');
  assert.equal(mock.calls[0].params[0], ADDRESS);
  assert.deepEqual(mock.calls[0].params[1].dataSlice, { offset: 0, length: 0 });
});

test('a missing account is not-found', async () => {
  const { client } = clientFor({ getAccountInfo: { context: { slot: 1 }, value: null } });
  assert.deepEqual(await fetchAccount(client, ADDRESS), { status: 'not-found' });
});

test('an existing account reports owner, lamports, executable and size', async () => {
  const value = { owner: OWNER, lamports: 1461600, executable: false, space: 165, data: ['', 'base64'] };
  const { client } = clientFor({ getAccountInfo: { value } });
  assert.deepEqual(await fetchAccount(client, ADDRESS), {
    status: 'found',
    owner: OWNER,
    lamports: 1461600,
    executable: false,
    size: 165,
  });
});

test('size is null when the node does not report it', async () => {
  const value = { owner: OWNER, lamports: 1, executable: false, data: ['', 'base64'] };
  const { client } = clientFor({ getAccountInfo: { value } });
  assert.equal((await fetchAccount(client, ADDRESS)).size, null);
});