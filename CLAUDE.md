# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and GitHub Copilot CLI when working in this repository.

Code Rhythm is a VS Code extension that turns the active editor's code structure into synthesized audio played in a webview. The folder and repository are `code-rhythm`, but the Marketplace extension is `maxs-lab-of-things.code-rhythm-live`. The repository is public.

## Commands

```bash
npm run compile      # tsc -p ./ -> out/
npm run watch
npm run lint         # eslint src --ext ts
npx vsce package     # read the printed file list before publishing
```

Run the extension with F5 from VS Code (`.vscode/launch.json`). `npm test` points at `out/test/runTest.js`, but there is no `src/test/`, so it compiles, lints and then fails; there are no tests.

## Structure

`src/extension.ts` activates on startup and wires five objects: `ASTParser` (`analysis/astParser.ts`) turns the document into structure, `SoundMapper` (`mapping/soundMapper.ts`) maps it to sound events, `AudioEngine` (`audio/audioEngine.ts`) holds playback state, `WebviewProvider` (`ui/webviewProvider.ts`) renders the explorer panel where the Web Audio API actually makes sound, and `CodeHighlighter` plus `StatusBar` give editor feedback. The three commands (`codeRhythm.togglePlayback`, `codeRhythm.openPanel`, `codeRhythm.changeMode`) and four settings (`codeRhythm.tempo`, `genre`, `volume`, `enableVisualizer`) are declared in `package.json`.

Much of `src/` is written but not wired in. Nothing constructs the classes in `src/modes/` (navigation, overview, diff), `features/focusMode.ts`, `features/teamSignatures.ts`, `mapping/rhythmGenerator.ts`, `audio/sequencer.ts`, `audio/synthesizer.ts`, `analysis/complexityAnalyzer.ts` or `analysis/patternDetector.ts` outside those folders, and `codeRhythm.changeMode` only stores the chosen name with `AudioEngine.setMode`. Check whether a module is reachable from `extension.ts` before assuming a feature works.

## Releasing

`.vscodeignore` is the only control over what ships in the `.vsix`; `.gitignore` is ignored by `vsce`. The managed block in it is rewritten by a standardizing script, so add project-specific exclusions outside that block. The README states the Marketplace version, so bump it with `package.json` and `CHANGELOG.md`. The publishing procedure is in `../README.md`.
