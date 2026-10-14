'use strict';

const toHex = (bytes) => Buffer.from(bytes).toString('hex');

// result: { program, seeds: [{ spec, bytes }], address, bump }
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
  return `${lines.join('\n')}\n`;
}

function formatJson(result) {
  return `${JSON.stringify(
    {
      program: result.program,
      seeds: result.seeds.map((seed) => ({ seed: seed.spec, hex: toHex(seed.bytes) })),
      address: result.address,
      bump: result.bump,
    },
    null,
    2
  )}\n`;
}

module.exports = { formatHuman, formatJson };