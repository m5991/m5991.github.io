// The postcard (v0.23, design audit 12: "The drawing in Extras gains a stats strip (finish time,
// yard sales, birds Dwight scared off, songs x/24, keepsakes) and a Share button using the phone's
// share sheet (Web Share with files, falling back to download)"). `postcardStats` and `statsLine`
// are pure; `drawPostcard` paints Vanessa's drawing with the strip under it on a canvas, and
// `sharePostcard` hands that picture to the phone's share sheet or saves it. No names beyond the
// farm's own title are written on it.
import { fmtRace } from '../game/race.js';

// -> { timeMs (null while the farm is not finished), sales, birds, songs: [found, all], keepsakes: [found, all] }
export function postcardStats({ ledger, session = {}, songsFound = 0, songsTotal = 0, keepsakesFound = 0, keepsakesTotal = 0 }) {
  return {
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
