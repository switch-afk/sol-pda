'use strict';

const { createProgramAddress } = require('./pda');

// Which bump (255 down to 0) turns these seeds into the given address?
// Returns the first bump that does, or null when none does. createProgramAddress
// throws for bumps that land on the curve, so those are skipped.
function findBump(seeds, programId, address) {
  const target = Buffer.from(address);
  for (let bump = 255; bump >= 0; bump--) {
    let candidate;
    try {
      candidate = createProgramAddress([...seeds, Uint8Array.of(bump)], programId);
    } catch (err) {
      continue;
    }
    if (target.equals(Buffer.from(candidate))) return bump;
  }
  return null;
}

// canonical: { address, bump } from findProgramAddress.
// Returns { result: 'match' | 'non-canonical' | 'no-match', bump }.
function verifyAddress(seeds, programId, address, canonical) {
  if (Buffer.from(address).equals(Buffer.from(canonical.address))) {
    return { result: 'match', bump: canonical.bump };
  }
  const bump = findBump(seeds, programId, address);
  if (bump === null) return { result: 'no-match', bump: null };
  return { result: 'non-canonical', bump };
}

module.exports = { findBump, verifyAddress };