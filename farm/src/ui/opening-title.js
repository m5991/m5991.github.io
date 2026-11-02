// The opening's title, set in this one place (a classic script, run as the page is parsed, so
// the paper is painted before the game has loaded).
//
// For now it is placeholder lettering: "The Farm" in an italic pencil hand (the bundled font
// Nothing You Could Do, assets/fonts/, SIL Open Font License). Tiffany's own hand lettering
// will replace it: put the image in assets/ and set TITLE.image to its path (a transparent PNG
// or SVG of the words, about 3:1 on one line). The words stay as its alt text.
//
// It also decides, before the game loads, whether this launch opens on the paper at all: once
// per device (the `openingSeen` view setting, src/game/prefs.js), `?opening=1` forces it and
// `?opening=0` or `?overlay=1` skip it. main.js makes the final call (a save notice is
// answered first).
(function () {
  var TITLE = {
    text: 'The Farm',
    lines: ['The', 'Farm'], // where the words break when the title stands beside the drawing
    image: null, // e.g. 'assets/title/the-farm.png'
  };
  var PREFS_KEY = 'vanessas-farm/view';

  var el = document.getElementById('opening-title');
  if (el) {
    el.textContent = '';
    if (TITLE.image) {
      var img = document.createElement('img');
      img.src = TITLE.image;
      img.alt = TITLE.text;
      img.className = 'art';
      el.appendChild(img);
    } else {
      el.setAttribute('aria-label', TITLE.text);
      TITLE.lines.forEach(function (word, i) {
        var s = document.createElement('span');
        s.className = 'w' + (i + 1);
        s.setAttribute('aria-hidden', 'true');
        s.textContent = word;
        el.appendChild(s);
        if (i < TITLE.lines.length - 1) el.appendChild(document.createTextNode(' '));
      });
    }
  }

  var q = new URLSearchParams(location.search);
  var seen = false;
  try { seen = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null').openingSeen === true; } catch (e) { seen = false; }
  var param = q.get('opening');
  var plays = param === '1' || (param !== '0' && q.get('overlay') !== '1' && !seen);
  if (plays) {
    document.documentElement.dataset.opening = 'waiting';
    var root = document.getElementById('opening');
    if (root) root.hidden = false;
  }
}());
