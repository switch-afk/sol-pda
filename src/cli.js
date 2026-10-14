'use strict';

const { parseArgs, UsageError } = require('./args');
const { version } = require('../package.json');

const HELP = `sol-pda v${version}

Derive a Solana program derived address (PDA) offline: give it a program
address and seeds, get the address and bump. Read-only: never signs anything.

Usage:
  sol-pda <program-address> [options]

Options:
  --seed <type:value>  Add a seed (repeat for several, in order)
  --json               Print machine-readable JSON
  -h, --help           Show this help
  -v, --version        Show the version
`;

async function run(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;

  let opts;
  try {
    opts = parseArgs(argv);
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

  stderr.write('Error: deriving addresses is not implemented yet\n');
  return 1;
}

module.exports = { run, HELP };