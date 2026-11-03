// The permanent crop theme (spec v0.11): once the first crop is chosen, cards, the pause screen
// and the save notice take that crop's mood. All the look lives in styles.css, keyed on
// html[data-theme="corn" | "sunflower" | "tomato"]; this module only sets or clears the attribute,
// so it survives cards.js rewriting the dialog on every open. No DOM is touched at import time,
// so themeName() works in Node.

export const THEMES = { C: 'corn', S: 'sunflower', T: 'tomato' };

// 'C' | 'S' | 'T' -> 'corn' | 'sunflower' | 'tomato'; anything else (null, undefined) -> null
export function themeName(crop) {
  return Object.hasOwn(THEMES, crop ?? '') ? THEMES[crop] : null;
}

// sets root.dataset.theme to the crop's theme, or removes it when there is no crop; idempotent
export function applyTheme(crop, root = globalThis.document?.documentElement) {
  if (!root?.dataset) return null;
  const name = themeName(crop);
  if (name) {
    if (root.dataset.theme !== name) root.dataset.theme = name;
  } else {
    delete root.dataset.theme;
  }
  return name;
}
