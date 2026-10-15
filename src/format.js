'use strict';

const toHex = (bytes) => Buffer.from(bytes).toString('hex');

const VERIFY_TEXT = {
  match: () => 'match, it is the canonical PDA',
  'non-canonical': (v, bump) => `match, but with non-canonical bump ${v.bump} (canonical is ${bump})`,
  'no-match': () => 'no match, it is not a PDA of these seeds',
};

// 1461600 -> "0.0014616". Works on BigInt so large balances stay exact.
function lamportsToSol(lamports) {
  const total = BigInt(lamports);
  const whole = total / 1000000000n;
  const fraction = (total % 1000000000n).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

function accountLines(result) {
  const account = result.account;
  if (account.status === 'error') return ['Account  could not be checked'];
  if (account.status === 'not-found') return [`Account  not found on ${account.host}`];

  const owner = account.owner === result.program ? `${account.owner} (the program)` : account.owner;
  const lines = [
    `Account  found on ${account.host}`,
    `Owner    ${owner}`,
    `Balance  ${account.lamports} lamports (${lamportsToSol(account.lamports)} SOL)`,
  ];
  if (account.size !== null) lines.push(`Size     ${account.size} bytes`);
  return lines;
}

// result: { program, seeds: [{ spec, bytes }], address, bump, verify?, account? }
// account: { status: 'found' | 'not-found' | 'error', host, owner, lamports, executable, size, error }
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
  if (result.account) lines.push(...accountLines(result));
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
  if (result.account) out.account = result.account;
  return `${JSON.stringify(out, null, 2)}\n`;
}

module.exports = { formatHuman, formatJson, lamportsToSol };