'use strict';

const { isValidAddress } = require('./address');

// find_program_address appends the bump as a seed, and Solana allows 16 in total.
const MAX_SEEDS = 15;

const VALUE_OPTIONS = {
  '--seed': { key: 'seed', needs: 'a type:value pair' },
  '--verify': { key: 'verify', needs: 'an address' },
  '--rpc': { key: 'rpc', needs: 'a URL' },
};

const FLAG_OPTIONS = {
  '--check': 'check',
  '--json': 'json',
};

class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

function checkRpcUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new UsageError('--rpc must be a valid http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UsageError('--rpc must be a valid http(s) URL');
  }
  return value;
}

function parseArgs(argv) {
  const opts = {
    program: null,
    seeds: [],
    verify: null,
    rpc: null,
    check: false,
    json: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    let name = arg;
    let inline = null;
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        name = arg.slice(0, eq);
        inline = arg.slice(eq + 1);
      }
    }

    if (name === '--help' || name === '-h') {
      opts.help = true;
    } else if (name === '--version' || name === '-v') {
      opts.version = true;
    } else if (FLAG_OPTIONS[name]) {
      if (inline !== null) throw new UsageError(`${name} does not take a value`);
      opts[FLAG_OPTIONS[name]] = true;
    } else if (VALUE_OPTIONS[name]) {
      const { key, needs } = VALUE_OPTIONS[name];
      let value = inline;
      if (value === null) {
        value = argv[++i];
        if (value === undefined || value.startsWith('-')) {
          throw new UsageError(`${name} needs ${needs}`);
        }
      }
      if (value === '') {
        throw new UsageError(`${name} needs ${needs}`);
      }

      if (key === 'seed') {
        opts.seeds.push(value);
      } else {
        if (opts[key] !== null) throw new UsageError(`${name} can only be given once`);
        opts[key] = key === 'rpc' ? checkRpcUrl(value) : value;
      }
    } else if (arg.startsWith('-')) {
      throw new UsageError(`Unknown option: ${name}`);
    } else if (opts.program === null) {
      opts.program = arg;
    } else {
      throw new UsageError('Only one program address can be given');
    }
  }

  if (!opts.help && !opts.version) {
    if (!opts.program) {
      throw new UsageError('Missing program address');
    }
    if (!isValidAddress(opts.program)) {
      throw new UsageError('Not a valid Solana address');
    }
    if (opts.verify !== null && !isValidAddress(opts.verify)) {
      throw new UsageError('--verify is not a valid Solana address');
    }
    if (opts.rpc !== null && !opts.check) {
      throw new UsageError('--rpc only applies together with --check');
    }
    if (opts.seeds.length > MAX_SEEDS) {
      throw new UsageError(`At most ${MAX_SEEDS} seeds are allowed`);
    }
  }

  return opts;
}

module.exports = { parseArgs, UsageError, MAX_SEEDS };