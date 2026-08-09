# Code Rhythm 🎵

![Version](https://img.shields.io/visual-studio-marketplace/v/maxs-lab-of-things.code-rhythm-live)
![MLoT](https://img.shields.io/badge/MLoT-ai-blue)

Transform your code into music! Code Rhythm is a VS Code extension that converts code structure into musical patterns using the Web Audio API, making programming more accessible and enjoyable.

![Demo](https://raw.githubusercontent.com/incrediblecrab/mlot-developer-media/main/gifs/code-rhythm.gif)

## Features

### Real-time Code Sonification
- **Automatic Analysis**: Converts functions, loops, variables, and conditionals into distinct sounds
- **Live Updates**: Music adapts as you type
- **Multi-language Support**: Works with any language VS Code supports

### Musical Genres
Choose from different musical styles:
- **Electronic**: Punchy drums and synthesizers
- **Jazz**: Swung rhythms and blue notes
- **Ambient**: Atmospheric pads and textures  
- **Classical**: Orchestral arrangements

### Advanced Modes

#### Navigation Mode
- Cursor movements trigger contextual sounds
- Jump detection with transition effects
- Audio breadcrumbs for code exploration

#### Overview Mode
- Compress entire files into 30-second compositions
- Identify musical sections (intro/verse/chorus)
- Export as MIDI files

#### Diff Mode
- Stereo comparison of code changes
- Added code in right channel, removed in left
- Crossfade effects for modifications

#### Focus Mode
- Binaural beats for concentration (alpha/theta waves)
- Typing rhythm metronome
- Pomodoro timer with musical cues

### Team Features
- **Author Signatures**: Unique rhythm patterns per developer
- **Musical Handoffs**: Smooth transitions between coding styles
- **Git Integration**: Analyze commit patterns

## Installation

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install code-rhythm`
4. Press Enter

## Quick Start

1. Open any code file
2. Click the "▶ Code Rhythm" button in the status bar
3. Adjust tempo and volume in the control panel
4. Start coding and listen!

### Keyboard Shortcuts

- `Ctrl+Alt+P` / `Cmd+Alt+P`: Toggle playback
- `Ctrl+Alt+M` / `Cmd+Alt+M`: Change mode
- `Ctrl+Alt+G` / `Cmd+Alt+G`: Switch genre

## Sound Mappings

| Code Element | Instrument | Musical Role |
|--------------|------------|--------------|
| Functions | Kick Drum | Downbeats, structure |
| Loops | Hi-hat | Rolling patterns |
| Conditionals | Snare | Accents, decisions |
| Variables | Synthesizer | Melody |
| Classes | Chord Pads | Harmonic foundation |
| Comments | Rest | Silence, breathing space |

## Configuration

```json
{
  "codeRhythm.tempo": 120,
  "codeRhythm.genre": "Electronic",
  "codeRhythm.volume": 0.7,
  "codeRhythm.enableVisualizer": true
}
```

## Use Cases

### Accessibility
- Navigate code by sound for visually impaired developers
- Audio debugging through pattern recognition
- Multi-sensory learning experience

### Productivity
- Maintain coding rhythm and flow
- Audio indicators for code complexity
- Binaural beats for deep focus

### Education
- Teach code structure through music
- Make programming concepts more tangible
- Gamify the learning experience

### Team Collaboration
- Identify coding patterns across team members
- Audio diffs for code reviews
- Musical pair programming

## How It Works

1. **AST Parsing**: Analyzes code structure using VS Code's APIs
2. **Pattern Detection**: Identifies repetitions and complexity
3. **Sound Mapping**: Converts code elements to musical events
4. **Real-time Synthesis**: Generates audio using Web Audio API
5. **Adaptive Playback**: Adjusts to your coding style

## Performance

- Minimal CPU usage (<5%)
- Smart caching for large files
- Voice stealing for polyphony limits
- Efficient AST analysis

## Privacy

Code Rhythm runs entirely locally. No code or audio is sent to external servers.

## Resources

- 📺 [Watch Demo Video](https://youtu.be/fxyoaWU6CTA)
- 🌐 [Visit MLoT Page](https://mlot.ai/code-rhythm/)
- 🔒 [Privacy Policy](https://mlot.ai/privacy)

## Publisher

**Max's Lab of Things**
Visit [mlot.ai](https://mlot.ai/)

## License

MIT
