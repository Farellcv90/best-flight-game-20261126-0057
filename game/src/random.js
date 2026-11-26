// Seeded random numbers for Langit Nusantara. The island, palms, town and
// clouds all come from one seed, so the same seed always builds the same
// archipelago — screenshots and replays stay reproducible.

/** Mulberry32: a small, fast seeded PRNG with a good spread. */
export function makeRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** A value-noise sampler built on the seeded RNG: smooth 2D noise in [0, 1). */
export function makeNoise2D(seed) {
  const rng = makeRng(seed);
  const grid = 64;
  const table = new Float32Array((grid + 1) * (grid + 1));
  for (let i = 0; i < table.length; i += 1) table[i] = rng();

  function lattice(ix, iz) {
    const x = ((ix % grid) + grid) % grid;
    const z = ((iz % grid) + grid) % grid;
    return table[z * (grid + 1) + x];
  }

  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  return function noise(x, z) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = smooth(x - ix);
    const fz = smooth(z - iz);
    const a = lattice(ix, iz);
    const b = lattice(ix + 1, iz);
    const c = lattice(ix, iz + 1);
    const d = lattice(ix + 1, iz + 1);
    return (a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz);
  };
}

/** Pick one item from an array using the given RNG. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
