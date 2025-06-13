# Code Rhythm - VS Code Extension

## Project Overview
A VS Code extension that converts code structure into musical patterns using the Web Audio API. Features real-time sonification of code with different modes (navigation, diff, overview), team signatures, and focus mode with code highlighting.

## Technology Stack
- TypeScript
- VS Code Extension API
- Web Audio API for sound synthesis
- AST parsing for code analysis

## Architecture
- `src/extension.ts` - Main extension entry point
- `src/analysis/` - Code analysis (AST parsing, complexity analysis, pattern detection)
- `src/audio/` - Audio engine, sequencer, and synthesizer
- `src/mapping/` - Rhythm generation and sound mapping
- `src/modes/` - Different playback modes (diff, navigation, overview)
- `src/features/` - Code highlighting, focus mode, team signatures
- `src/ui/` - Status bar and webview components

## Key Features
- Real-time code-to-music conversion
- Multiple musical genres (Electronic, Jazz, Ambient, Classical)
- Configurable tempo (60-180 BPM) and volume
- Visual waveform analyzer
- Team signature sounds
- Focus mode with code highlighting

## Development Commands
- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run vscode:prepublish` - Prepare for publishing

## Configuration
The extension provides several configuration options:
- `codeRhythm.tempo` - Playback tempo (60-180 BPM)
- `codeRhythm.genre` - Musical genre preset
- `codeRhythm.volume` - Master volume (0-1)
- `codeRhythm.enableVisualizer` - Enable/disable waveform visualizer

## Commands
- `codeRhythm.togglePlayback` - Toggle audio playback
- `codeRhythm.openPanel` - Open control panel
- `codeRhythm.changeMode` - Switch between playback modes