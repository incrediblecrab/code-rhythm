import * as vscode from 'vscode';
import { AudioEngine } from '../audio/audioEngine';
import { SoundMapper } from '../mapping/soundMapper';

export class WebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codeRhythm.controlPanel';
    private _view?: vscode.WebviewView;
    private astParser: any;
    private codeHighlighter: any;

    constructor(
        private readonly _extensionContext: vscode.ExtensionContext,
        private readonly audioEngine: AudioEngine,
        private readonly soundMapper: SoundMapper
    ) {}

    private get _extensionUri(): vscode.Uri {
        return this._extensionContext.extensionUri;
    }

    public isReady(): boolean {
        return this._view !== undefined;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'play':
                    // Simple demo: play a test sound
                    const editor = vscode.window.activeTextEditor;
                    if (editor) {
                        const events = await this.astParser.parse(editor.document);
                        const soundEvents = this.soundMapper.mapToSounds(events);
                        
                        // Send events to webview for playback
                        webviewView.webview.postMessage({
                            type: 'playEvents',
                            events: soundEvents,
                            fileName: editor.document.fileName.split('/').pop() || 'Unknown'
                        });
                        
                        // Start highlighting in the editor
                        if (this.codeHighlighter) {
                            this.codeHighlighter.startHighlighting(editor, soundEvents);
                        }
                    }
                    break;
                case 'stop':
                    // Stop highlighting
                    if (this.codeHighlighter) {
                        this.codeHighlighter.stop();
                    }
                    break;
                case 'updateAndPlay':
                    // Re-parse and play with new settings
                    const activeEditor = vscode.window.activeTextEditor;
                    if (activeEditor) {
                        const events = await this.astParser.parse(activeEditor.document);
                        const soundEvents = this.soundMapper.mapToSounds(events);
                        
                        // Send updated events to webview
                        webviewView.webview.postMessage({
                            type: 'playEvents',
                            events: soundEvents,
                            fileName: activeEditor.document.fileName.split('/').pop() || 'Unknown'
                        });
                        
                        // Restart highlighting
                        if (this.codeHighlighter) {
                            this.codeHighlighter.startHighlighting(activeEditor, soundEvents);
                        }
                    }
                    break;
                case 'tempo':
                    this.audioEngine.setTempo(data.value);
                    vscode.workspace.getConfiguration('codeRhythm').update('tempo', data.value, true);
                    break;
                case 'volume':
                    this.audioEngine.setVolume(data.value);
                    vscode.workspace.getConfiguration('codeRhythm').update('volume', data.value, true);
                    break;
                case 'genre':
                    this.soundMapper.setGenre(data.value);
                    vscode.workspace.getConfiguration('codeRhythm').update('genre', data.value, true);
                    break;
                case 'audioInitialized':
                    console.log('Audio context initialized in webview');
                    break;
                case 'audioError':
                    vscode.window.showErrorMessage(`Audio initialization failed: ${data.error}`);
                    break;
            }
        });

        // Add parser and highlighter
        this.astParser = new (require('../analysis/astParser').ASTParser)();
        this.codeHighlighter = new (require('../features/codeHighlighter').CodeHighlighter)();
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const config = vscode.workspace.getConfiguration('codeRhythm');
        const tempo = config.get('tempo', 120);
        const volume = config.get('volume', 0.7);
        const genre = config.get('genre', 'Electronic');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Rhythm Controls</title>
    <style>
        body {
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            font-family: var(--vscode-font-family);
        }
        
        .control-group {
            margin-bottom: 20px;
        }
        
        label {
            display: block;
            margin-bottom: 5px;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.8;
        }
        
        input[type="range"] {
            width: 100%;
            height: 4px;
            background: var(--vscode-input-background);
            outline: none;
            -webkit-appearance: none;
            appearance: none;
            border-radius: 2px;
        }
        
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            background: var(--vscode-button-background);
            cursor: pointer;
            border-radius: 50%;
        }
        
        input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: var(--vscode-button-background);
            cursor: pointer;
            border-radius: 50%;
            border: none;
        }
        
        select {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 14px;
        }
        
        .play-button {
            width: 100%;
            padding: 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: background 0.2s;
        }
        
        .play-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .play-button.playing {
            background: var(--vscode-errorForeground);
        }
        
        #visualizer {
            width: 100%;
            height: 100px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            margin-top: 20px;
        }
        
        .value-display {
            float: right;
            font-size: 12px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="control-group">
        <button id="playButton" class="play-button">
            <span id="playIcon">▶</span>
            <span id="playText">Play</span>
        </button>
    </div>
    
    <div class="control-group" id="nowPlaying" style="display: none;">
        <label>Now Playing</label>
        <div style="font-size: 12px; opacity: 0.8; word-break: break-all;" id="currentFile">-</div>
    </div>
    
    <div class="control-group">
        <label for="tempo">
            Tempo
            <span class="value-display" id="tempoValue">${tempo} BPM</span>
        </label>
        <input type="range" id="tempo" min="60" max="180" value="${tempo}" />
    </div>
    
    <div class="control-group">
        <label for="volume">
            Volume
            <span class="value-display" id="volumeValue">${Math.round(volume * 100)}%</span>
        </label>
        <input type="range" id="volume" min="0" max="1" step="0.01" value="${volume}" />
    </div>
    
    <div class="control-group">
        <label for="genre">Genre</label>
        <select id="genre">
            <option value="Electronic" ${genre === 'Electronic' ? 'selected' : ''}>Electronic</option>
            <option value="Jazz" ${genre === 'Jazz' as string ? 'selected' : ''}>Jazz</option>
            <option value="Ambient" ${genre === 'Ambient' as string ? 'selected' : ''}>Ambient</option>
            <option value="Classical" ${genre === 'Classical' as string ? 'selected' : ''}>Classical</option>
        </select>
    </div>
    
    <div class="control-group">
        <label for="scale">Musical Scale</label>
        <select id="scale">
            <option value="pentatonic">Pentatonic (Happy)</option>
            <option value="major">Major (Bright)</option>
            <option value="minor">Minor (Sad)</option>
            <option value="dorian">Dorian (Jazzy)</option>
            <option value="chromatic">Chromatic (Complex)</option>
        </select>
    </div>
    
    <canvas id="visualizer"></canvas>
    
    <script>
        const vscode = acquireVsCodeApi();
        let isPlaying = false;
        let animationId = null;
        let audioContext = null;
        let masterGain = null;
        let currentAudioSources = [];
        let currentTempo = 120;
        let currentVolume = 0.7;
        let currentScale = [0, 2, 4, 7, 9]; // Major pentatonic
        let playbackTimer = null;
        
        const playButton = document.getElementById('playButton');
        const playIcon = document.getElementById('playIcon');
        const playText = document.getElementById('playText');
        const tempo = document.getElementById('tempo');
        const volume = document.getElementById('volume');
        const genre = document.getElementById('genre');
        const scale = document.getElementById('scale');
        const canvas = document.getElementById('visualizer');
        const ctx = canvas.getContext('2d');
        
        // Canvas setup
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        // Initialize audio context on first user interaction
        async function initAudio() {
            if (!audioContext) {
                try {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    masterGain = audioContext.createGain();
                    masterGain.gain.value = parseFloat(volume.value);
                    masterGain.connect(audioContext.destination);
                    
                    vscode.postMessage({ type: 'audioInitialized' });
                } catch (error) {
                    console.error('Failed to create audio context:', error);
                    vscode.postMessage({ type: 'audioError', error: error.message });
                }
            }
            
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }
        }
        
        playButton.addEventListener('click', async () => {
            await initAudio();
            
            if (isPlaying) {
                // Stop current playback
                stopAllAudio();
                vscode.postMessage({ type: 'stop' });
            } else {
                // Start playback
                vscode.postMessage({ type: 'play' });
            }
            
            isPlaying = !isPlaying;
            updatePlayButton();
            
            if (isPlaying) {
                startVisualization();
            } else {
                stopVisualization();
            }
        });
        
        function stopAllAudio() {
            // Stop all current audio sources
            currentAudioSources.forEach(source => {
                try {
                    source.stop();
                } catch (e) {
                    // Source might already be stopped
                }
            });
            currentAudioSources = [];
        }
        
        tempo.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            currentTempo = value;
            document.getElementById('tempoValue').textContent = value + ' BPM';
            
            // Update master gain volume immediately
            if (masterGain) {
                masterGain.gain.value = currentVolume;
            }
            
            // If playing, restart with new tempo
            if (isPlaying) {
                restartPlaybackWithNewSettings();
            }
            
            vscode.postMessage({ type: 'tempo', value });
        });
        
        volume.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            currentVolume = value;
            document.getElementById('volumeValue').textContent = Math.round(value * 100) + '%';
            
            // Update volume immediately
            if (masterGain) {
                masterGain.gain.setValueAtTime(value, audioContext.currentTime);
            }
            
            vscode.postMessage({ type: 'volume', value });
        });
        
        genre.addEventListener('change', (e) => {
            const newGenre = e.target.value;
            
            // Update scale based on genre
            switch(newGenre) {
                case 'Jazz':
                    currentScale = [0, 2, 3, 5, 6, 8, 10]; // Dorian
                    break;
                case 'Ambient':
                    currentScale = [0, 2, 4, 5, 7, 9, 11]; // Major
                    break;
                case 'Classical':
                    currentScale = [0, 2, 4, 5, 7, 9, 11]; // Major
                    break;
                default:
                    currentScale = [0, 2, 4, 7, 9]; // Pentatonic
            }
            
            // If playing, restart with new genre
            if (isPlaying) {
                restartPlaybackWithNewSettings();
            }
            
            vscode.postMessage({ type: 'genre', value: newGenre });
        });
        
        scale.addEventListener('change', (e) => {
            const newScale = e.target.value;
            
            // Update scale immediately
            switch(newScale) {
                case 'major':
                    currentScale = [0, 2, 4, 5, 7, 9, 11];
                    break;
                case 'minor':
                    currentScale = [0, 2, 3, 5, 7, 8, 10];
                    break;
                case 'dorian':
                    currentScale = [0, 2, 3, 5, 6, 8, 10];
                    break;
                case 'chromatic':
                    currentScale = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
                    break;
                default: // pentatonic
                    currentScale = [0, 2, 4, 7, 9];
            }
            
            // If playing, restart with new scale
            if (isPlaying) {
                restartPlaybackWithNewSettings();
            }
        });
        
        function restartPlaybackWithNewSettings() {
            // Stop current playback
            stopAllAudio();
            
            // Request new playback with updated settings
            vscode.postMessage({ type: 'updateAndPlay' });
        }
        
        function updatePlayButton() {
            if (isPlaying) {
                playIcon.textContent = '⏸';
                playText.textContent = 'Pause';
                playButton.classList.add('playing');
            } else {
                playIcon.textContent = '▶';
                playText.textContent = 'Play';
                playButton.classList.remove('playing');
            }
        }
        
        function startVisualization() {
            let analyser = null;
            let waveformData = null;
            
            // Set up real audio analysis
            if (audioContext && masterGain) {
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.8;
                waveformData = new Uint8Array(analyser.frequencyBinCount);
                
                // Connect analyser to the audio graph
                masterGain.connect(analyser);
            }
            
            function draw() {
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background');
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Get real audio data if available
                if (analyser && waveformData) {
                    analyser.getByteFrequencyData(waveformData);
                } else {
                    // Fallback to minimal animation when no audio
                    if (!waveformData) {
                        waveformData = new Uint8Array(128);
                    }
                    waveformData.fill(0);
                }
                
                // Draw frequency spectrum visualization
                ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--vscode-button-background');
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--vscode-button-background');
                ctx.lineWidth = 2;
                
                const barWidth = canvas.width / waveformData.length;
                let x = 0;
                
                for (let i = 0; i < waveformData.length; i++) {
                    // Convert to 0-1 range and apply scaling
                    const barHeight = (waveformData[i] / 255) * canvas.height * 0.8;
                    
                    // Draw frequency bar
                    ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
                    
                    x += barWidth;
                }
                
                ctx.stroke();
                
                // Draw beat grid
                ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--vscode-panel-border');
                ctx.lineWidth = 1;
                const beatWidth = canvas.width / 16;
                
                for (let i = 0; i <= 16; i++) {
                    const x = i * beatWidth;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                    ctx.stroke();
                }
                
                animationId = requestAnimationFrame(draw);
            }
            
            draw();
        }
        
        function stopVisualization() {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
                
                // Clear canvas
                ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background');
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        });
        
        // Simple sound generation functions
        function playKick(time) {
            if (!audioContext) return;
            
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(60, time);
            osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
            
            // Apply current volume
            const volume = currentVolume * 0.8;
            gain.gain.setValueAtTime(volume, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            currentAudioSources.push(osc);
            osc.start(time);
            osc.stop(time + 0.5);
        }
        
        function playHihat(time) {
            if (!audioContext) return;
            
            const bufferSize = audioContext.sampleRate * 0.05;
            const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 10);
            }
            
            const noise = audioContext.createBufferSource();
            noise.buffer = buffer;
            
            const filter = audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = 7000;
            
            noise.connect(filter);
            filter.connect(masterGain);
            
            currentAudioSources.push(noise);
            noise.start(time);
        }
        
        function playSnare(time) {
            if (!audioContext) return;
            
            playHihat(time); // Simple snare using hihat
        }
        
        function playSynth(time, frequency, noteIndex) {
            if (!audioContext) return;
            
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            // Use current scale if noteIndex provided, otherwise use frequency
            let finalFrequency = frequency || 440;
            if (noteIndex !== undefined && currentScale.length > 0) {
                const scaleNote = currentScale[noteIndex % currentScale.length];
                finalFrequency = 440 * Math.pow(2, scaleNote / 12); // Convert to frequency
            }
            
            osc.type = 'sawtooth';
            osc.frequency.value = finalFrequency;
            
            // Apply current volume
            const volume = currentVolume * 0.4;
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(volume, time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
            
            osc.connect(gain);
            gain.connect(masterGain);
            
            currentAudioSources.push(osc);
            osc.start(time);
            osc.stop(time + 0.25);
        }
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'playEvents' && audioContext) {
                // Stop any currently playing audio first
                stopAllAudio();
                
                const events = message.events;
                const startTime = audioContext.currentTime + 0.1; // Small delay for responsiveness
                
                // Calculate tempo scaling factor (120 BPM = 1.0)
                const tempoScale = 120 / currentTempo;
                
                // Show the file being played
                document.getElementById('nowPlaying').style.display = 'block';
                document.getElementById('currentFile').textContent = message.fileName || 'Unknown';
                
                events.forEach((event, index) => {
                    // Apply tempo scaling to timing
                    const time = startTime + (event.time * tempoScale);
                    
                    switch (event.instrument) {
                        case 'kick':
                            playKick(time);
                            break;
                        case 'hihat':
                            playHihat(time);
                            break;
                        case 'snare':
                            playSnare(time);
                            break;
                        case 'synth':
                            // Pass note index for scale-based melody
                            playSynth(time, event.pitch, index % currentScale.length);
                            break;
                    }
                });
            }
        });
    </script>
</body>
</html>`;
    }
}