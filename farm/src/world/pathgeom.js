// v0.18 (captain: "No rocks on the path, the rocks from the circle shouldn't be on top of the
// path"): ground-plane geometry for keeping stones off the path. The path is a ribbon between two
// matching edge polylines (world.js buildPathOutline); these read only x and z. Pure, no three.js.

const cross = (a, b, p) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
// is p inside (or on) the triangle abc?
export function inTriangle(p, a, b, c) {
  const d1 = cross(a, b, p); const d2 = cross(b, c, p); const d3 = cross(c, a, p);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
// distance from p to the segment ab
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x; const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}
// is p on the ribbon between the matching polylines left and right?
export function onRibbon(p, left, right) {
  for (let i = 0; i < left.length - 1; i++) {
    if (inTriangle(p, left[i], left[i + 1], right[i + 1]) || inTriangle(p, left[i], right[i + 1], right[i])) return true;
  }
  return false;
}
// how far p is from the ribbon: 0 on it, else the distance to its outline (both edges and both ends)
export function ribbonDistance(p, left, right) {
  if (onRibbon(p, left, right)) return 0;
  let d = Math.min(segmentDistance(p, left[0], right[0]), segmentDistance(p, left.at(-1), right.at(-1)));
  for (const edge of [left, right]) for (let i = 0; i < edge.length - 1; i++) d = Math.min(d, segmentDistance(p, edge[i], edge[i + 1]));
  return d;
}
