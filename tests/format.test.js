'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatHuman, formatJson } = require('../src/format');

const RESULT = {
  program: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  seeds: [
    { spec: 'string:vault', bytes: Uint8Array.from(Buffer.from('vault')) },
    { spec: 'u64:1', bytes: Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0]) },
  ],
  address: 'ADDRESS',
  bump: 254,
};

test('human output lists program, aligned seeds with hex, address and bump', () => {
  assert.equal(
    formatHuman(RESULT),
    [
      'Program  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
      'Seeds    string:vault  7661756c74',
      '         u64:1         0100000000000000',
      'Address  ADDRESS',
      'Bump     254',
      '',
    ].join('\n')
  );
});

test('human output handles no seeds and empty seeds', () => {
  assert.match(formatHuman({ ...RESULT, seeds: [] }), /Seeds {4}\(none\)/);
  const empty = formatHuman({ ...RESULT, seeds: [{ spec: 'string:', bytes: new Uint8Array(0) }] });
  assert.match(empty, /string: {2}\(empty\)/);
});

test('json output is stable and parseable', () => {
  const parsed = JSON.parse(formatJson(RESULT));
  assert.deepEqual(parsed, {
    program: RESULT.program,
    seeds: [
      { seed: 'string:vault', hex: '7661756c74' },
      { seed: 'u64:1', hex: '0100000000000000' },
    ],
    address: 'ADDRESS',
    bump: 254,
  });
  assert.ok(formatJson(RESULT).endsWith('}\n'));
});