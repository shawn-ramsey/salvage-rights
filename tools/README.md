# Diagram source

`build-flowchart.js` generates the "how to play" flow chart shown on the
briefing screen. It draws with [roughjs](https://github.com/rough-stuff/rough),
the hand-drawn rendering engine Excalidraw itself uses, so the diagram matches
the Excalidraw look without the page having to load Excalidraw at runtime.

```sh
npm install roughjs jsdom      # not vendored; there is no package.json here
node tools/build-flowchart.js
```

The diagram is deliberately hand-drawn: sketchy strokes, a handwriting face and
doodles, rather than a tidy corporate flowchart. Two knobs control that. `ROUGH`
and `BOW` set how loose the pen is — they are low for the big rectangles, which
look broken rather than drawn above about 1.8, and raised only while the small
icons are drawn. Coordinates are rounded to one decimal on the way out, which
costs nothing visually and cuts the file by about two thirds.

It writes three files from one definition at the top of the script:

| file | use |
| --- | --- |
| `docs/game-flow.excalidraw` | open at [excalidraw.com](https://excalidraw.com) to edit by hand |
| `docs/game-flow.svg` | standalone export, for slides and printed handouts |
| `tools/game-flow.inline.svg` | the copy that goes into `index.html` |

To change the diagram, edit the `NODES`, `DECISION` and `SIDE` arrays and re-run,
then paste `tools/game-flow.inline.svg` into the `how:` tab in `index.html`,
inside `<div class="chartbox">`.

The inline copy uses `var(--mono)` / `var(--hand)` and inherits the page's fonts;
the standalone copy names them directly so it renders on its own.

The handwriting face is Patrick Hand (SIL Open Font License), embedded in
`index.html` as a base64 woff2 rather than linked from a font CDN. If the font
failed to load on a locked-down laptop the whole diagram would fall back to a
sans face and look exactly like the corporate flowchart this replaced.
