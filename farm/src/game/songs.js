// Song discoveries (spec §8), the first one built: E21 "One day she'll be rich". Pure: no
// three.js, no DOM. Found songs are kept in the save's `discoveries` field (spec §12), apart
// from the ledger, as { [id]: { at: active ms when found } }.
//
// v0.12 (captain 2026-11-02, after the v0.11 playtest: "maybe spare coins and in fact a lot of
// coins unlock the easter egg of the song of money"): E21's trigger becomes saving up a lot of
// coins. When her purse holds E21_COINS, the song is found, with a small coin moment and its
// card. The goal line spends coins as soon as a build can take them (the purse peaks at about 37
// on each first crop's route), so 80 takes about four extra yard sales after the house, unless she
// chooses to save up earlier. Its first hint points at saving coins.
export const E21_COINS = 80;

export const SONGS = {
  E21: {
    title: "One day she'll be rich",
    // the first hint (spec §8's three-tier hints: this is tier one)
    hint: 'Spare coins add up: save a big purse and someone will sing about it.',
    coins: E21_COINS,
  },
};

// the songs this ledger has just earned that are not found yet, in id order
export function songsDue(l, discoveries = {}) {
  return Object.keys(SONGS).filter((id) => !discoveries?.[id] && SONGS[id].coins !== undefined && l.purse >= SONGS[id].coins);
}
// the found record for a song
export const found = (l) => ({ at: l.activeMs });
