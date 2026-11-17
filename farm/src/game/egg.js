// v0.30 (Tiffany's "Farm changes #4": "The egg fell on the chimney but she can't climb back up to
// get it. Also when she's on top of the house"; "She can't reach the chimney egg"; with her picture:
// "Pick up the egg - in the yellow circle", the circle on top of the chimney, Vanessa on the grass).
// Pure: no three.js, no DOM.
//
// What happened: at "Climb to the chimney" she waits up by the chimney and the bird drops the egg on
// the roof beside her (v0.29). A push on the stick while the bird was still on its way took her
// down at once (a moment always gives way to the stick), and the egg still landed up on the roof,
// out of reach: the house is in the way and nothing takes her up there again. The song was stuck.
// Now an egg that lies up on the roof while she is not up there with it comes down off the roof to
// the grass beside her (main.js eggDown, world.js eggFall), wherever she went, and is picked up
// there as every other egg is. It is asked on every frame the egg lies there, so no way down
// (the stick, a card, a teleport) leaves it behind.

// how high above the ground (m) an egg counts as up on the house
export const EGG_UP_M = 0.2;
// must the egg come down: it lies higher than the grass and she is not up there beside it
export const eggStuck = ({ eggY = 0, heroUp = false } = {}) => eggY > EGG_UP_M && !heroUp;
