// v0.29 (Tiffany: "For editing purposes, can I be able to skip to the end to see what it looks like
// without playing the whole game?"): the finished farm, made from nothing through the ledger's own
// transactions (so it is a farm the game could have reached), for the address switch `?end=1`
// (main.js). Corn is the first crop; every stage is built and every spot dug, the welcome, the
// finale and the slideshow's offer count as seen, and the song hunt is where it opens. Nothing of it
// is saved: main.js keeps such a farm for the session only, so a player's own farm is untouched.
// Pure: no DOM.
import { NODES, STAGE_ORDER } from './data.js';
import { apply, createLedger, plotWeeds, recipe, settle } from './ledger.js';
import { createSaveData } from './save.js';

export function finishedFarm() {
  let l = createLedger();
  // (the ledger's own follow-ups, a free stage committing, are applied once the tools are put away)
  const run = (tx) => {
    const r = apply(l, tx);
    if (!r.ok) throw new Error(`the finished farm: ${JSON.stringify(tx)} refused (${r.reason})`);
    l = r.l;
    return r;
  };
  const settled = () => { l = settle(l).l; };
  const tool = (t) => { if (l.tool !== t) run({ t: 'takeTool', tool: t }); };
  const rake = (ids) => { for (const w of ids) if (!l.weeds[w]) { tool('rake'); run({ t: 'clearWeed', id: w }); } };
  rake(['wC1', 'wC2']); // her first crop: the corn, free once its weeds are raked
  settled();
  for (const stage of STAGE_ORDER) {
    if (!l.stages[stage].committed) {
      // (v0.31: a patch's weeds can be raked once it can be planted: after the first harvest)
      l = { ...l, harvested: true };
      rake(plotWeeds(stage));
      const need = recipe(l, stage);
      // funded from nothing (a farm made for a look, not played): the coins, the wood and the
      // stone it takes, a yard sale and some gathering since the last build, the first harvest
      // (v0.32: the wood and stone at the pile, where the first DIY takes them from)
      l = { ...l, harvested: true, purse: l.purse + need.coins, yard: { ...l.yard, W: l.yard.W + need.W, R: l.yard.R + need.R }, since: { sales: 1, gather: 2 } };
      run({ t: 'build', stage });
      settled();
    }
    for (const id of Object.keys(NODES)) {
      if (NODES[id].stage !== stage || l.nodes[id].dug) continue;
      tool('shovel');
      run({ t: 'dig', id });
    }
  }
  settled();
  if (l.tool) run({ t: 'returnTool' });
  // the plants grow their crops
  run({ t: 'tick', ms: 30000 });
  const d = createSaveData();
  d.ledger = l;
  Object.assign(d.session, { welcomeSeen: true, creditsSeen: true, firstSaleSeen: true, whoKnowsHelloSeen: true, finishedAt: l.activeMs });
  return d;
}
