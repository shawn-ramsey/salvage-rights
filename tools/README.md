# Diagram source

`build-flowchart.js` generates the "how to play" flow chart shown on the
briefing screen. It draws with [roughjs](https://github.com/rough-stuff/rough),
the hand-drawn rendering engine Excalidraw itself uses, so the diagram matches
the Excalidraw look without the page having to load Excalidraw at runtime.

```sh
npm install roughjs jsdom      # not vendored; there is no package.json here
node tools/build-flowchart.js
```

It writes three files from one definition at the top of the script:

| file | use |
| --- | --- |
| `docs/game-flow.excalidraw` | open at [excalidraw.com](https://excalidraw.com) to edit by hand |
| `docs/game-flow.svg` | standalone export, for slides and printed handouts |
| `tools/game-flow.inline.svg` | the copy that goes into `index.html` |

To change the diagram, edit the `NODES`, `DECISION` and `SIDE` arrays and re-run,
then paste `tools/game-flow.inline.svg` into the `how:` tab in `index.html`,
inside `<div class="chartbox">`.

The inline copy uses `var(--mono)` / `var(--sans)` and inherits the page's fonts;
the standalone copy names the fonts directly so it renders correctly on its own.
