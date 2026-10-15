'use strict';

const { parseArgs, UsageError } = require('./args');
const { decodeBase58, encodeBase58 } = require('./address');
const { parseSeed } = require('./seeds');
const { findProgramAddress } = require('./pda');
const { formatHuman, formatJson } = require('./format');
const { version } = require('../package.json');

const HELP = `sol-pda v${version}

Derive a Solana program derived address (PDA) offline: give it a program
address and seeds, get the address and bump. Read-only: never signs anything.

Usage:
  sol-pda <program-address> [options]

Options:
  --seed <type:value>  Add a seed (repeat for several, in order, max 15)
  --json               Print machine-readable JSON
  -h, --help           Show this help
  -v, --version        Show the version

Seed types (each seed is at most 32 bytes):
  string:<text>        UTF-8 text, e.g. string:vault
  pubkey:<address>     A Solana address as its 32 bytes
  hex:<digits>         Raw bytes, e.g. hex:ff00 (0x prefix allowed)
  u8|u16|u32|u64:<n>   Whole number, little-endian, e.g. u64:1

Example:
  sol-pda TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --seed string:vault --seed u8:1
`;

async function run(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;

  let opts;
  let seeds = [];
  try {
    opts = parseArgs(argv);
    if (!opts.help && !opts.version) {
      seeds = opts.seeds.map((spec) => ({ spec, bytes: parseSeed(spec) }));
    }
  } catch (err) {
    if (err instanceof UsageError) {
      stderr.write(`Error: ${err.message}\n\n${HELP}`);
      return 2;
    }
    throw err;
  }

  if (opts.help) {
    stdout.write(HELP);
    return 0;
  }
  if (opts.version) {
    stdout.write(`${version}\n`);
    return 0;
  }

  let found;
  try {
    found = findProgramAddress(
      seeds.map((seed) => seed.bytes),
      decodeBase58(opts.program)
    );
  } catch (err) {
    stderr.write(`Error: ${err.message}\n`);
    return 1;
  }

  const result = {
    program: opts.program,
    seeds,
    address: encodeBase58(found.address),
    bump: found.bump,
  };
  stdout.write(opts.json ? formatJson(result) : formatHuman(result));
  return 0;
}

module.exports = { run, HELP };