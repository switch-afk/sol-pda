'use strict';

const toHex = (bytes) => Buffer.from(bytes).toString('hex');

const VERIFY_TEXT = {
  match: () => 'match, it is the canonical PDA',
  'non-canonical': (v, bump) => `match, but with non-canonical bump ${v.bump} (canonical is ${bump})`,
  'no-match': () => 'no match, it is not a PDA of these seeds',
};

// result: { program, seeds: [{ spec, bytes }], address, bump, verify? }
// verify: { address, result: 'match' | 'non-canonical' | 'no-match', bump }
function formatHuman(result) {
  const lines = [`Program  ${result.program}`];

  if (result.seeds.length === 0) {
    lines.push('Seeds    (none)');
  } else {
    const width = Math.max(...result.seeds.map((seed) => seed.spec.length));
    result.seeds.forEach((seed, i) => {
      const label = i === 0 ? 'Seeds    ' : '         ';
      const hex = seed.bytes.length === 0 ? '(empty)' : toHex(seed.bytes);
      lines.push(`${label}${seed.spec.padEnd(width)}  ${hex}`);
    });
  }

  lines.push(`Address  ${result.address}`);
  lines.push(`Bump     ${result.bump}`);
  if (result.verify) {
    lines.push(`Check    ${result.verify.address}`);
    lines.push(`Result   ${VERIFY_TEXT[result.verify.result](result.verify, result.bump)}`);
  }
  return `${lines.join('\n')}\n`;
}

function formatJson(result) {
  const out = {
    program: result.program,
    seeds: result.seeds.map((seed) => ({ seed: seed.spec, hex: toHex(seed.bytes) })),
    address: result.address,
    bump: result.bump,
  };
  if (result.verify) {
    out.verify = {
      address: result.verify.address,
      result: result.verify.result,
      bump: result.verify.bump,
    };
  }
  return `${JSON.stringify(out, null, 2)}\n`;
}

module.exports = { formatHuman, formatJson };