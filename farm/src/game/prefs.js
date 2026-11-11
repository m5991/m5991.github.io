// View settings kept on the device apart from the farm save, like the sound settings
// (audio.js): the Blueprint toggle (P25-3) is a setting, not progress, so it survives a reload,
// a New game and a progress reset. On by default, so a new player sees where things go.
// `openingSeen`: the opening (game/opening.js) has played once on this device, so later
// launches go straight to play (v0.22: `?opening=1` on the address shows it again). src/ui/opening-title.js reads the same
// key before the game loads, to paint the paper or not.
export const PREFS_KEY = 'vanessas-farm/view';
export const DEFAULT_PREFS = Object.freeze({ blueprint: true, openingSeen: false });

export function createPrefs(storage = globalThis.localStorage) {
  let values = { ...DEFAULT_PREFS };
  try {
    const d = JSON.parse(storage?.getItem(PREFS_KEY) ?? 'null');
    if (d && typeof d.blueprint === 'boolean') values.blueprint = d.blueprint;
    if (d && typeof d.openingSeen === 'boolean') values.openingSeen = d.openingSeen;
  } catch { /* unreadable or denied storage: defaults */ }
  const write = () => { try { storage?.setItem(PREFS_KEY, JSON.stringify(values)); } catch { /* session only */ } };
  return {
    get blueprint() { return values.blueprint; },
    setBlueprint(on) { values = { ...values, blueprint: !!on }; write(); return values.blueprint; },
    toggleBlueprint() { return this.setBlueprint(!values.blueprint); },
    get openingSeen() { return values.openingSeen; },
    setOpeningSeen(on = true) { values = { ...values, openingSeen: !!on }; write(); return values.openingSeen; },
  };
}
