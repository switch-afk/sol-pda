'use strict';

// Ask the RPC about the derived address without downloading its data:
// a zero-length dataSlice keeps the response tiny even for large accounts.
async function fetchAccount(client, address) {
  const result = await client.call('getAccountInfo', [
    address,
    { encoding: 'base64', dataSlice: { offset: 0, length: 0 }, commitment: 'confirmed' },
  ]);

  const value = result && result.value;
  if (!value) return { status: 'not-found' };

  return {
    status: 'found',
    owner: value.owner,
    lamports: value.lamports,
    executable: Boolean(value.executable),
    // Older nodes do not report the data size.
    size: typeof value.space === 'number' ? value.space : null,
  };
}

module.exports = { fetchAccount };