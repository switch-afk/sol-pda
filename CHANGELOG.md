# Changelog

## [0.1.0] - 2026-10-15

First release.

### Added
- Derive a program derived address (PDA) offline from a program address and seeds, with the canonical bump
- Typed seeds with `--seed type:value`: `string`, `pubkey`, `hex`, and little-endian `u8`, `u16`, `u32` and `u64`. Seeds keep their order, up to 15 of them, 32 bytes each
- ed25519 curve check and the PDA hash implemented with Node's built-in crypto, checked against `@solana/web3.js`
- `--verify <address>` tells you if an address is the canonical PDA for your seeds, a PDA with a non-canonical bump (and which bump), or not a PDA of those seeds at all
- `--check` looks the derived address up on-chain and shows owner, balance and data size, or that it does not exist
- RPC client with 429 retry and backoff, `--rpc` and `SOL_PDA_RPC`, hostname-only error messages
- `--json` output for derivation, verification and the on-chain check
- Exit codes: `0` ok, `1` failed check, `2` usage error