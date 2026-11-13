// The postcard (v0.23, design audit 12: "The drawing in Extras gains a stats strip (finish time,
// yard sales, birds Dwight scared off, songs x/24, keepsakes) and a Share button using the phone's
// share sheet (Web Share with files, falling back to download)"). `postcardStats` and `statsLine`
// are pure; `drawPostcard` paints Vanessa's drawing with the strip under it on a canvas, and
// `sharePostcard` hands that picture to the phone's share sheet or saves it. No names beyond the
// farm's own title are written on it.
import { fmtRace } from '../game/race.js';

// -> { timeMs (null while the farm is not finished), sales, birds, songs: [found, all], keepsakes: [found, all], complete }
// v0.25: `complete`: every song and every keepsake is found. The postcard then carries the
// pencilled signature "The Farm, complete" in the drawing's corner and a gold 100% stamp.
export const POSTCARD_SIGNATURE = 'The Farm, complete';
export const POSTCARD_STAMP = '100%';
export function postcardStats({ ledger, session = {}, songsFound = 0, songsTotal = 0, keepsakesFound = 0, keepsakesTotal = 0, complete = null }) {
  return {
    complete: complete ?? (songsTotal > 0 && songsFound >= songsTotal && keepsakesFound >= keepsakesTotal),
    timeMs: Number.isFinite(session.finishedAt) ? session.finishedAt : null,
    sales: ledger?.sales ?? 0,
    birds: session.dwightDeterred ?? 0,
    songs: [songsFound, songsTotal],
    keepsakes: [keepsakesFound, keepsakesTotal],
  };
}
// the strip's items, in order: [label, value]
export function statsItems(s) {
  return [
    ['Finished in', s.timeMs === null ? '–' : fmtRace(s.timeMs)],
    ['Yard sales', String(s.sales)],
    ['Birds Dwight scared off', String(s.birds)],
    ['Songs', `${s.songs[0]}/${s.songs[1]}`],
    ['Keepsakes', `${s.keepsakes[0]}/${s.keepsakes[1]}`],
  ];
}
// one line of it, for a caption or a screen reader
export const statsLine = (s) => `The Farm · ${statsItems(s).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(' · ')}`;

// Paint the postcard: the drawing on paper, a hand-ruled line, the title and the five numbers.
// canvas: an HTMLCanvasElement (or anything with getContext); img: the drawing, loaded.
export function drawPostcard(canvas, img, stats, { width = 1400 } = {}) {
  const pad = Math.round(width * 0.035);
  const iw = width - pad * 2;
  const ih = Math.round(iw * (img.height / img.width));
  const strip = Math.round(width * 0.15);
  canvas.width = width;
  canvas.height = pad + ih + strip + pad;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff7e5';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(img, pad, pad, iw, ih);
  g.strokeStyle = '#253347'; g.lineWidth = Math.max(2, width / 500);
  g.strokeRect(pad, pad, iw, ih);
  const top = pad + ih;
  g.fillStyle = '#253347';
  g.textBaseline = 'middle';
  g.textAlign = 'left';
  g.font = `italic 700 ${Math.round(width * 0.04)}px "Pencil Title", "Comic Sans MS", cursive`;
  g.fillText('The Farm', pad, top + strip * 0.3);
  const items = statsItems(stats);
  const col = iw / items.length;
  items.forEach(([label, value], i) => {
    const x = pad + col * i + col / 2;
    g.textAlign = 'center';
    g.font = `700 ${Math.round(width * 0.032)}px system-ui, sans-serif`;
    g.fillText(value, x, top + strip * 0.62);
    g.font = `${Math.round(width * 0.0165)}px system-ui, sans-serif`;
    g.globalAlpha = 0.8;
    g.fillText(label, x, top + strip * 0.86);
    g.globalAlpha = 1;
  });
  if (stats.complete) {
    // v0.25: the signature, pencilled in the drawing's lower right corner in her pen's colour...
    g.save();
    g.translate(pad + iw - Math.round(width * 0.03), pad + ih - Math.round(width * 0.02)); // under the raised bed, on the drawing's lowest strip of paper
    g.rotate(-0.05);
    g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillStyle = '#2a2760';
    g.font = `italic 700 ${Math.round(width * 0.042)}px "Pencil Title", "Comic Sans MS", cursive`;
    g.fillText(POSTCARD_SIGNATURE, 0, 0);
    g.restore();
    // ...and the gold 100% stamp, on the strip beside the title
    const r = Math.round(strip * 0.27);
    const cx = pad + Math.round(width * 0.25); const cy = top + Math.round(strip * 0.3);
    g.save();
    g.translate(cx, cy);
    g.rotate(-0.16);
    const gold = g.createRadialGradient?.(-r * 0.25, -r * 0.3, r * 0.1, 0, 0, r);
    if (gold) { gold.addColorStop(0, '#f6dc82'); gold.addColorStop(0.6, '#e3b53c'); gold.addColorStop(1, '#c9972a'); }
    g.fillStyle = gold ?? '#e3b53c';
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a9781a'; g.lineWidth = Math.max(2, width / 420);
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.84, 0, Math.PI * 2); g.lineWidth = Math.max(1, width / 900); g.stroke();
    g.fillStyle = '#5b3f06'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `700 ${Math.round(r * 0.72)}px "Pencil Title", "Comic Sans MS", cursive`;
    g.fillText(POSTCARD_STAMP, 0, r * 0.04);
    g.restore();
  }
  return canvas;
}

// Hand the picture to the share sheet (a file), or save it when the browser has no such sheet.
// -> 'shared' | 'saved' | 'cancelled'
export async function sharePostcard(canvas, { name = 'The Farm postcard.png', title = 'The Farm', text = '', nav = globalThis.navigator, doc = globalThis.document } = {}) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return 'cancelled';
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  if (file && nav?.canShare?.({ files: [file] }) && nav.share) {
    try { await nav.share({ files: [file], title, text }); return 'shared'; } catch (err) { if (err?.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob);
  const a = doc.createElement('a');
  a.href = url; a.download = name;
  doc.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'saved';
}
