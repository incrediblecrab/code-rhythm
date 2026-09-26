# code-rhythm

![Version](https://img.shields.io/visual-studio-marketplace/v/maxs-lab-of-things.code-rhythm-live) ![MLoT](https://img.shields.io/badge/MLoT-ai-blue)

Code Rhythm is a VS Code extension that turns the active editor's code structure into synthesized audio. It is published on the VS Code Marketplace as [`maxs-lab-of-things.code-rhythm-live`](https://marketplace.visualstudio.com/items?itemName=maxs-lab-of-things.code-rhythm-live); the Marketplace version is 1.5.1, matching this repository.

![Demo](https://raw.githubusercontent.com/incrediblecrab/mlot-developer-media/main/gifs/code-rhythm.gif)

**Objective:** make code structure audible through local analysis, playback controls and a VS Code side panel.

**Inputs:** VS Code 1.74.0 or newer, an open text editor and the Web Audio API inside the extension webview. Optional team-signature code reads local Git history when that feature is used by the extension code.

**Files:**

- [`src/analysis/`](src/analysis/): document-symbol parsing, complexity metrics and pattern detection
- [`src/audio/`](src/audio/): playback engine, sequencer and synthesizer
- [`src/features/`](src/features/): code highlighting, focus mode and team-signature helpers
- [`src/mapping/`](src/mapping/): conversion from code events to rhythm and sound events
- [`src/modes/`](src/modes/): navigation, overview and diff mode logic
- [`src/ui/`](src/ui/): status bar and Code Rhythm webview
- [`src/extension.ts`](src/extension.ts): activation, command registration and editor-change listeners
- [`package.json`](package.json): extension manifest, Marketplace metadata, commands, settings, view contribution and scripts
- [`CHANGELOG.md`](CHANGELOG.md): release notes
- [`tsconfig.json`](tsconfig.json): TypeScript compiler settings

**Try it:** install with `ext install maxs-lab-of-things.code-rhythm-live`, open a code file, then run **Code Rhythm: Open Control Panel** and start playback from the Code Rhythm Explorer view.

## Usage

Code Rhythm contributes a **Code Rhythm** webview to the Explorer. Open the panel with **Code Rhythm: Open Control Panel**, initialize audio in the panel, choose tempo, volume and genre, then play the current document's generated sound pattern.

**Code Rhythm: Toggle Playback** analyzes the active editor with VS Code document symbols, maps the result to sound events and starts or stops playback. If the webview has not initialized audio yet, the command prompts you to open the control panel.

**Code Rhythm: Change Mode** offers Navigation, Overview, Diff and Focus in a quick pick. The selected mode is passed to the audio engine.

## Commands and views

| Contribution | Identifier | What it does |
| --- | --- | --- |
| Command | `codeRhythm.togglePlayback` | toggles playback for the active editor |
| Command | `codeRhythm.openPanel` | focuses the Code Rhythm control panel |
| Command | `codeRhythm.changeMode` | lets the user choose Navigation, Overview, Diff or Focus mode |
| Explorer webview | `codeRhythm.controlPanel` | provides playback controls, tempo, volume, genre selection and visualizer canvas |

## Settings

| Setting | Default | What it controls |
| --- | --- | --- |
| `codeRhythm.tempo` | `120` | playback tempo in beats per minute |
| `codeRhythm.genre` | `"Electronic"` | musical genre preset; the UI offers Electronic, Jazz, Ambient and Classical |
| `codeRhythm.volume` | `0.7` | master volume from 0 to 1 |
| `codeRhythm.enableVisualizer` | `true` | whether the waveform visualizer is enabled |

Example `settings.json`:

```json
{
  "codeRhythm.tempo": 120,
  "codeRhythm.genre": "Electronic",
  "codeRhythm.volume": 0.7,
  "codeRhythm.enableVisualizer": true
}
```

## Sound mappings

| Code element | Instrument | Musical role |
| --- | --- | --- |
| Functions | Kick | downbeats and structural accents |
| Loops | Hihat | repeated pulses based on loop depth and duration |
| Conditionals | Snare | decision accents, with extra hits for additional conditions |
| Variables | Synth | pitched notes derived from the variable name and scope |
| Classes | Synth | three low notes from the current scale |
| Comments | Rest | silence |

## How it works

The extension uses VS Code document symbols and text analysis to produce code events, maps those events into rhythmic sound events and plays them through a webview-backed audio engine. While playback is active, changing the active editor or editing the active document regenerates the sound events.

The repository contains additional mode and feature modules for navigation cues, overview generation, diff processing, focus mode, code highlighting and team signatures. The README describes only the contributed commands, settings and view exposed by the current manifest.

## Development

The repository includes the scripts `npm run compile`, `npm run watch`, `npm run lint`, `npm run test` and `npm run vscode:prepublish`. The extension entry point is configured as `./out/extension.js`.

## Links

- [Marketplace listing](https://marketplace.visualstudio.com/items?itemName=maxs-lab-of-things.code-rhythm-live)
- [Demo video](https://youtu.be/fxyoaWU6CTA)
- [MLoT product page](https://mlot.ai/code-rhythm/)
- [Privacy policy](https://mlot.ai/privacy)
- Publisher: [Max's Lab of Things](https://mlot.ai/)

## License

MIT. See [`LICENSE`](LICENSE).
