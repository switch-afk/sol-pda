'use strict';

const { decodeBase58, isValidAddress } = require('./address');
const { UsageError } = require('./args');
const { MAX_SEED_LEN } = require('./pda');

const INT_TYPES = {
  u8: { bytes: 1, max: 0xffn },
  u16: { bytes: 2, max: 0xffffn },
  u32: { bytes: 4, max: 0xffffffffn },
  u64: { bytes: 8, max: 0xffffffffffffffffn },
};

const TYPES = ['string', 'pubkey', 'hex', ...Object.keys(INT_TYPES)];

function bad(spec, reason) {
  const shown = spec.length > 40 ? `${spec.slice(0, 40)}...` : spec;
  return new UsageError(`Invalid seed "${shown}": ${reason}`);
}

// Little-endian, the same layout Anchor and Rust use for integer seeds.
function encodeInt(type, value, spec) {
  if (!/^\d+$/.test(value)) throw bad(spec, `${type} must be a whole number`);
  const { bytes, max } = INT_TYPES[type];
  let n = BigInt(value);
  if (n > max) throw bad(spec, `${type} cannot be larger than ${max}`);
  const out = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) {
    out[i] = Number(n & 0xffn);
    n >>= 8n;
  }
  return out;
}

// "type:value" -> bytes. Only the first colon splits, so strings may contain colons.
function parseSeed(spec) {
  const colon = spec.indexOf(':');
  if (colon === -1) {
    throw bad(spec, 'use type:value, for example string:vault');
  }
  const type = spec.slice(0, colon);
  const value = spec.slice(colon + 1);

  let bytes;
  if (type === 'string') {
    bytes = Buffer.from(value, 'utf8');
  } else if (type === 'pubkey') {
    if (!isValidAddress(value)) throw bad(spec, 'pubkey must be a valid Solana address');
    bytes = decodeBase58(value);
  } else if (type === 'hex') {
    const hex = value.startsWith('0x') ? value.slice(2) : value;
    if (hex.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(hex)) {
      throw bad(spec, 'hex must be an even number of hex digits');
    }
    bytes = Buffer.from(hex, 'hex');
  } else if (INT_TYPES[type]) {
    bytes = encodeInt(type, value, spec);
  } else {
    throw bad(spec, `unknown type "${type}", use one of: ${TYPES.join(', ')}`);
  }

  if (bytes.length > MAX_SEED_LEN) {
    throw bad(spec, `it is ${bytes.length} bytes, the maximum is ${MAX_SEED_LEN}`);
  }
  return Uint8Array.from(bytes);
}

module.exports = { parseSeed, TYPES };