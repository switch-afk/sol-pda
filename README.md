# sol-pda

[![CI](https://github.com/switch-afk/sol-pda/actions/workflows/ci.yml/badge.svg)](https://github.com/switch-afk/sol-pda/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/sol-pda)](https://www.npmjs.com/package/sol-pda)
[![license](https://img.shields.io/npm/l/sol-pda)](LICENSE)

Derive Solana program derived addresses (PDAs) offline from your terminal: give it a program address and seeds, get the address and the bump.

A PDA is an address a program controls, computed from the program's address plus a list of seeds. Programs derive them on chain; clients derive them to know where to look. This tool does the same calculation without writing any code or installing a Solana SDK, and can then check the result against an address you have or against the chain.

- Offline by default: no RPC needed to derive an address, and it never signs anything
- Typed seeds: strings, public keys, hex bytes and little-endian integers
- `--verify` tells you if an address is the canonical PDA for your seeds, and which bump it uses
- `--check` shows whether the derived account exists on chain, with its owner, balance and size
- Zero dependencies, Node 18+

## Install

```bash
npx sol-pda <program-address> --seed string:vault
```

Or install it globally:

```bash
npm install -g sol-pda
```

## Usage

```bash
sol-pda <program-address> [options]
```

| Option | Description |
| --- | --- |
| `--seed <type:value>` | Add a seed. Repeat it for several, in order. Up to 15 seeds |
| `--verify <address>` | Check an address against the derivation. Exits 1 unless it is the canonical PDA |
| `--check` | Look the derived address up on chain. Exits 1 if the account does not exist |
| `--rpc <url>` | RPC endpoint for `--check` (or set `SOL_PDA_RPC`) |
| `--json` | Print machine-readable JSON |
| `-h`, `--help` | Show help |
| `-v`, `--version` | Show the version |

## Seed types

Seeds are used in the order you give them, and each one is at most 32 bytes.

| Seed | Bytes used |
| --- | --- |
| `string:<text>` | The UTF-8 bytes of the text, for example `string:vault` |
| `pubkey:<address>` | The 32 bytes of a Solana address |
| `hex:<digits>` | Raw bytes, for example `hex:ff00` (a `0x` prefix is allowed) |
| `u8:<n>`, `u16:<n>`, `u32:<n>`, `u64:<n>` | A whole number, little-endian, 1, 2, 4 or 8 bytes |

Only the first colon splits the type from the value, so `string:a:b` is the text `a:b`. A seed with an empty value, like `string:`, is an empty seed.

## Examples

A string seed and a number:

```bash
sol-pda TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --seed string:vault --seed u64:1
```

```
Program  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Seeds    string:vault  7661756c74
         u64:1         0100000000000000
Address  9v9uPG5jUkXmFjvS8jyYALRYdRFm8js8WVtJEvBB1qvK
Bump     254
```

The associated token account of a wallet for a mint. This is how the Associated Token Account program derives it:

```bash
sol-pda ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL --seed pubkey:So11111111111111111111111111111111111111112 --seed pubkey:TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --seed pubkey:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

```
Program  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
Seeds    pubkey:So11111111111111111111111111111111111111112   069b8857feab8184fb687f634618c035dac439dc1aeb3b5598a0f00000000001
         pubkey:TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA   06ddf6e1d765a193d9cbe146ceeb79ac1cb485ed5f5b37913a8cf5857eff00a9
         pubkey:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v  c6fa7af3bedbad3a3d65f36aabc97431b1bbe4c2d2f6e0e47ca60203452f5d61
Address  DHe62eeQVEnNK7vg5xUpDkJm7tuqHadjhvmPRFBG9UPo
Bump     254
```

## Verify an address

`--verify` derives the canonical PDA and compares it to the address you give. It also tells you when your address is a valid PDA that uses a lower bump than the canonical one, which is a common source of bugs.

```bash
sol-pda TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --seed string:vault --verify AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA
```

```
Program  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Seeds    string:vault  7661756c74
Address  AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA
Bump     254
Check    AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA
Result   match, it is the canonical PDA
```

With an address that uses another bump:

```
Result   match, but with non-canonical bump 252 (canonical is 254)
```

| Result | Meaning | Exit code |
| --- | --- | --- |
| `match` | The canonical PDA for these seeds and this program | `0` |
| `non-canonical` | A valid PDA for these seeds, but not with the canonical bump | `1` |
| `no-match` | Not a PDA of these seeds and this program | `1` |

## Check on chain

`--check` asks an RPC for the derived address with `getAccountInfo` and shows what it finds. It only reads the account's details, not its data, so it stays fast for large accounts.

```bash
sol-pda TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --seed string:vault --check
```

```
Program  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
Seeds    string:vault  7661756c74
Address  AispKP3Ls5d2m6t411kMtP1xkPemdZPGPJUvemsBqmXA
Bump     254
Account  not found on api.mainnet-beta.solana.com
```

When the account exists, the output ends with these lines instead:

```
Account  found on <rpc host>
Owner    <owner address> (the program)
Balance  <lamports> lamports (<SOL> SOL)
Size     <bytes> bytes
```

`(the program)` is added when the owner is the program you derived from. `Size` is left out when the RPC node does not report it.

`--check` and `--verify` can be used together. If the RPC call fails, the derivation is still printed, the error goes to stderr and the exit code is `1`.

## RPC endpoint

The endpoint is picked in this order: `--rpc`, then the `SOL_PDA_RPC` environment variable, then the public mainnet endpoint. Use `--rpc` to point at devnet or testnet. The public endpoint is rate limited, so use your own RPC for anything serious.

```bash
export SOL_PDA_RPC="https://your-rpc.example.com/?api-key=..."
```

```powershell
$env:SOL_PDA_RPC = "https://your-rpc.example.com/?api-key=..."
```

Errors only ever print the RPC hostname, so API keys in the URL are not leaked. Requests that get an HTTP 429 are retried with backoff.

## JSON output

`--json` prints the same information as JSON:

```bash
sol-pda TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA --seed string:vault --seed u8:1 --json
```

```json
{
  "program": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  "seeds": [
    {
      "seed": "string:vault",
      "hex": "7661756c74"
    },
    {
      "seed": "u8:1",
      "hex": "01"
    }
  ],
  "address": "P2qncPuPobnjN2GFen2T54RGgUshJGWo3Sf1nRhm8Fv",
  "bump": 255
}
```

With `--verify` the output gains a `verify` object (`address`, `result` of `match`, `non-canonical` or `no-match`, and the `bump` found or `null`). With `--check` it gains an `account` object with a `status` of `found`, `not-found` or `error`, plus the host and, when found, the owner, lamports, executable flag and size.

## How it works

A PDA is the SHA-256 hash of the seeds, one extra byte called the bump, the program address and the text `ProgramDerivedAddress`. A PDA must not be a valid public key, because nobody should hold a private key for it. So the tool tries bumps from 255 downwards and returns the first hash that is not on the ed25519 curve. That bump is the canonical bump.

sol-pda does the hashing and the curve check with Node's built-in crypto and BigInt. Its results are checked against `@solana/web3.js` in the tests.

## Good to know

- At most 15 seeds, because the bump takes the 16th slot. Each seed is at most 32 bytes
- The same seeds under another program give another address. Always derive with the program that owns the account
- Derivation only tells you where an account would live. Use `--check` to see if it actually exists
- `--check` reads at `confirmed` commitment, and only from the endpoint you chose, so check devnet addresses with a devnet `--rpc`

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success, and any `--verify` matched the canonical PDA and any `--check` found the account |
| `1` | `--verify` was not the canonical PDA, `--check` found no account or the RPC failed, or no PDA could be derived |
| `2` | Usage error (bad arguments or a bad seed) |

## Development

```bash
npm test
```

No dependencies to install. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT