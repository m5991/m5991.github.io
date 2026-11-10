// v0.21 (design audit 5, "one voice on screen"). At the first yard sale six cues asked for one tap:
// the goal line, an edge note, the coach pill, the status pill, the build line and the hand on the
// pulsing button. Each thing is now said in one place:
// - the goal line (top): what she is working toward, in one line (game/guide.js `line`);
// - a button with the hand on it: what to press (Yard Sale, DIY);
// - one pill above the controls: the coach's "how" while a first action is being learned
//   ("Stand still to gather"), otherwise the status ("Gathering wood… 3", "Growing"), never both;
// - the edge note: only something new (the first harvest opens the other patches, a new table, a
//   bird took a tomato), never the instruction the goal line or a button already gives.
// Pure: no DOM.

// The pill slot holds one message: the coach's while it teaches, else the status.
export function onePill(coach, status) {
  return coach ? { coach, status: null } : { coach: null, status: status || null };
}

// What the coach would say that is already said: the goal line names the crop choice and the
// shovel, and the hand points at the Yard Sale and DIY buttons, which carry their own words. The
// keyboard's "press E" lines stay: no hand can show a key.
const SAID_ELSEWHERE = [/^Choose your first crop/, /^Now take the shovel$/, /: tap Yard Sale$/, /^Tap DIY to build it$/];
export const quietCoach = (prompt) => (prompt && !SAID_ELSEWHERE.some((re) => re.test(prompt)) ? prompt : null);

// An edge note is shown once per kind in a session: the second time it is not news.
export function createNotes(show) {
  const told = new Set();
  return {
    // `key` names the kind of news; -> whether it was shown
    once(key, text, ms) { if (told.has(key)) return false; told.add(key); show(text, ms); return true; },
    reset() { told.clear(); },
    get told() { return [...told]; },
  };
}
