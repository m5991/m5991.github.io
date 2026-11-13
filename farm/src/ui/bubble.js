// Where a speech bubble goes (v0.23). Tiffany: "If Dwight has a speech bubble don't let it block the
// birds, and make it have the pointy part pointing towards him that makes it look like a typical
// speech [bubble]". Pure: no DOM.
//
// The bubble stands beside the speaker's head with its tail on the side that faces him and the
// tail's tip at his head. It is tried above him first (the usual place), then above and drawn
// aside, then to his right, his left and below; the first place that fits the play area and covers
// none of the things to keep clear (`avoid`: the birds in the sky, the bird he has just sent off,
// Vanessa) is taken. If every place covers something, the one that covers least is.
export const TAIL_PX = 18; // the tail's length: the gap between the bubble and his head
export const BUBBLE_MARGIN = 12;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// does the circle (x, y, r) reach into the rectangle
const covers = (rect, c) => {
  const nx = clamp(c.x, rect.left, rect.left + rect.w);
  const ny = clamp(c.y, rect.top, rect.top + rect.h);
  return Math.hypot(c.x - nx, c.y - ny) < (c.r ?? 0);
};

// head: { x, y } on screen (px); size: { w, h } of the bubble; area: { left, right, top, bottom } it
// must stay inside; avoid: [{ x, y, r }] to keep clear.
// -> { left, top, side: the bubble's side the tail is on ('bottom' | 'left' | 'right' | 'top'),
//      tail: px along that side to the tail's root, hits: how many of `avoid` it covers }
export function bubblePlace(head, size, area, avoid = []) {
  const { w, h } = size;
  const lo = { x: area.left + BUBBLE_MARGIN, y: area.top + BUBBLE_MARGIN };
  const hi = { x: area.right - BUBBLE_MARGIN - w, y: area.bottom - BUBBLE_MARGIN - h };
  const fit = (left, top) => ({ left: clamp(left, lo.x, Math.max(lo.x, hi.x)), top: clamp(top, lo.y, Math.max(lo.y, hi.y)) });
  const tries = [
    // above him: the tail on the bubble's bottom edge
    { side: 'bottom', ...fit(head.x - w / 2, head.y - TAIL_PX - h), want: { left: head.x - w / 2, top: head.y - TAIL_PX - h } },
    // still above him, but drawn aside to his left or his right (the tail stays at his head)
    { side: 'bottom', ...fit(head.x - w + 36, head.y - TAIL_PX - h), want: { left: head.x - w + 36, top: head.y - TAIL_PX - h } },
    { side: 'bottom', ...fit(head.x - 36, head.y - TAIL_PX - h), want: { left: head.x - 36, top: head.y - TAIL_PX - h } },
    // to his right: the tail on its left edge; to his left: on its right edge
    { side: 'left', ...fit(head.x + TAIL_PX + 14, head.y - h * 0.6), want: { left: head.x + TAIL_PX + 14, top: head.y - h * 0.6 } },
    { side: 'right', ...fit(head.x - TAIL_PX - 14 - w, head.y - h * 0.6), want: { left: head.x - TAIL_PX - 14 - w, top: head.y - h * 0.6 } },
    // below him: the tail on its top edge
    { side: 'top', ...fit(head.x - w / 2, head.y + TAIL_PX + 40), want: { left: head.x - w / 2, top: head.y + TAIL_PX + 40 } },
  ];
  let best = null;
  for (const t of tries) {
    const rect = { left: t.left, top: t.top, w, h };
    const hits = avoid.filter((c) => covers(rect, c)).length;
    // pushed off its place across the tail's axis: the tail could no longer reach him
    const moved = t.side === 'bottom' || t.side === 'top' ? Math.abs(t.top - t.want.top) : Math.abs(t.left - t.want.left);
    const score = hits * 1000 + moved;
    const along = t.side === 'bottom' || t.side === 'top' ? clamp(head.x - t.left, 18, w - 18) : clamp(head.y - t.top, 16, h - 16);
    const out = { left: t.left, top: t.top, side: t.side, tail: along, hits, moved };
    if (!best || score < best.score) best = { ...out, score };
    if (hits === 0 && moved < 1) return out;
  }
  const { score, ...out } = best;
  return out;
}
