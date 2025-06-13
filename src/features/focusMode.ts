import { AudioEngine } from '../audio/audioEngine';

export class FocusMode {
    private binauralBeat: BinauralBeatGenerator | null = null;
    private metronome: TypingMetronome | null = null;
    private pomodoroTimer: PomodoroTimer | null = null;
    private flowDetector: FlowStateDetector;
    private isActive: boolean = false;

    constructor(private audioEngine: AudioEngine) {
        this.flowDetector = new FlowStateDetector();
    }

    activate(mode: 'alpha' | 'theta' | 'gamma' = 'alpha') {
        this.isActive = true;
        
        // Start binaural beats
        this.binauralBeat = new BinauralBeatGenerator(this.audioEngine);
        this.binauralBeat.start(mode);
        
        // Start typing metronome
        this.metronome = new TypingMetronome(this.audioEngine);
        this.metronome.start();
        
        // Start flow detection
        this.flowDetector.start();
        this.flowDetector.onFlowStateChange((inFlow) => {
            if (inFlow) {
                this.binauralBeat?.adjustIntensity(0.3);
                this.metronome?.mute();
            } else {
                this.binauralBeat?.adjustIntensity(0.6);
                this.metronome?.unmute();
            }
        });
    }

    deactivate() {
        this.isActive = false;
        this.binauralBeat?.stop();
        this.metronome?.stop();
        this.pomodoroTimer?.stop();
        this.flowDetector.stop();
    }

    startPomodoro(workMinutes: number = 25, breakMinutes: number = 5) {
        this.pomodoroTimer = new PomodoroTimer(
            this.audioEngine,
            workMinutes,
            breakMinutes
        );
        
        this.pomodoroTimer.onPhaseChange((phase) => {
            if (phase === 'work') {
                this.binauralBeat?.setMode('theta');
            } else {
                this.binauralBeat?.setMode('alpha');
            }
        });
        
        this.pomodoroTimer.start();
    }
}

class BinauralBeatGenerator {
    private leftOscillator: OscillatorNode | null = null;
    private rightOscillator: OscillatorNode | null = null;
    private leftGain: GainNode | null = null;
    private rightGain: GainNode | null = null;
    private merger: ChannelMergerNode | null = null;
    private baseFrequency = 200;
    private beatFrequencies = {
        delta: 2,    // Deep sleep
        theta: 6,    // Deep meditation, creativity
        alpha: 10,   // Relaxation, focus
        beta: 20,    // Active thinking
        gamma: 40    // High-level cognitive processing
    };

    constructor(private audioEngine: any) {}

    start(mode: keyof typeof this.beatFrequencies) {
        const audioContext = (this.audioEngine as any).audioContext;
        if (!audioContext) {return;}

        // Create stereo setup
        this.merger = audioContext.createChannelMerger(2);
        this.leftGain = audioContext.createGain();
        this.rightGain = audioContext.createGain();
        
        this.leftOscillator = audioContext.createOscillator();
        this.rightOscillator = audioContext.createOscillator();
        
        if (!this.leftOscillator || !this.rightOscillator || !this.leftGain || !this.rightGain || !this.merger) {
            return;
        }
        
        // Set frequencies for binaural beat
        const beatFreq = this.beatFrequencies[mode];
        this.leftOscillator.frequency.value = this.baseFrequency;
        this.rightOscillator.frequency.value = this.baseFrequency + beatFreq;
        
        // Use sine waves for smooth sound
        this.leftOscillator.type = 'sine';
        this.rightOscillator.type = 'sine';
        
        // Set initial volume
        this.leftGain.gain.value = 0.3;
        this.rightGain.gain.value = 0.3;
        
        // Connect audio graph
        this.leftOscillator.connect(this.leftGain);
        this.rightOscillator.connect(this.rightGain);
        this.leftGain.connect(this.merger, 0, 0);
        this.rightGain.connect(this.merger, 0, 1);
        this.merger.connect(audioContext.destination);
        
        // Start oscillators
        this.leftOscillator.start();
        this.rightOscillator.start();
        
        // Add subtle modulation
        this.addModulation(audioContext);
    }

    private addModulation(audioContext: AudioContext) {
        const lfo = audioContext.createOscillator();
        const lfoGain = audioContext.createGain();
        
        lfo.frequency.value = 0.1; // Very slow modulation
        lfoGain.gain.value = 2; // ±2Hz modulation
        
        lfo.connect(lfoGain);
        if (this.leftOscillator && this.rightOscillator) {
            lfoGain.connect(this.leftOscillator.frequency);
            lfoGain.connect(this.rightOscillator.frequency);
        }
        
        lfo.start();
    }

    setMode(mode: keyof typeof this.beatFrequencies) {
        if (!this.rightOscillator) {return;}
        
        const beatFreq = this.beatFrequencies[mode];
        this.rightOscillator.frequency.exponentialRampToValueAtTime(
            this.baseFrequency + beatFreq,
            (this.audioEngine as any).audioContext.currentTime + 2
        );
    }

    adjustIntensity(level: number) {
        const clampedLevel = Math.max(0, Math.min(1, level));
        
        if (this.leftGain && this.rightGain) {
            const audioContext = (this.audioEngine as any).audioContext;
            const time = audioContext.currentTime;
            
            this.leftGain.gain.exponentialRampToValueAtTime(clampedLevel, time + 0.5);
            this.rightGain.gain.exponentialRampToValueAtTime(clampedLevel, time + 0.5);
        }
    }

    stop() {
        this.leftOscillator?.stop();
        this.rightOscillator?.stop();
        this.leftOscillator = null;
        this.rightOscillator = null;
    }
}

class TypingMetronome {
    private clickBuffer: AudioBuffer | null = null;
    private nextClickTime = 0;
    private isRunning = false;
    private tempo = 120;
    private isMuted = false;
    private typingSpeed = 0;
    private lastTypeTime = 0;
    private adaptiveTempo = true;

    constructor(private audioEngine: any) {
        this.createClickSound();
        this.setupTypingListener();
    }

    private createClickSound() {
        const audioContext = (this.audioEngine as any).audioContext;
        if (!audioContext) {return;}

        const duration = 0.05;
        const sampleRate = audioContext.sampleRate;
        this.clickBuffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        
        if (!this.clickBuffer) {return;}
        
        const data = this.clickBuffer.getChannelData(0);
        
        // Create a soft click sound
        for (let i = 0; i < data.length; i++) {
            const envelope = Math.exp(-i / (data.length * 0.1));
            data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }
    }

    private setupTypingListener() {
        // Listen to VS Code document changes for typing rhythm
        if (typeof window !== 'undefined' && (window as any).vscode) {
            // In webview context - would need to receive typing events from extension
            return;
        }
        
        // In extension context - monitor document changes
        const vscode = require('vscode');
        const disposable = vscode.workspace.onDidChangeTextDocument((event: any) => {
            const now = Date.now();
            const timeSinceLastType = now - this.lastTypeTime;
            
            if (timeSinceLastType < 2000) { // Within 2 seconds
                // Calculate typing speed
                const charactersPerSecond = event.contentChanges[0]?.text?.length || 1;
                this.typingSpeed = charactersPerSecond * 60; // Convert to CPM
                
                if (this.adaptiveTempo && this.typingSpeed > 0) {
                    const targetTempo = Math.min(180, Math.max(60, this.typingSpeed * 2));
                    this.tempo = this.tempo * 0.9 + targetTempo * 0.1;
                }
            }
            
            this.lastTypeTime = now;
        });
    }

    start() {
        if (!this.clickBuffer) {return;}
        
        this.isRunning = true;
        const audioContext = (this.audioEngine as any).audioContext;
        this.nextClickTime = audioContext.currentTime;
        
        this.schedule();
    }

    private schedule() {
        if (!this.isRunning) {return;}

        const audioContext = (this.audioEngine as any).audioContext;
        if (!audioContext) {return;}
        
        const secondsPerBeat = 60 / this.tempo;
        
        while (this.nextClickTime < audioContext.currentTime + 0.1) {
            if (!this.isMuted) {
                this.playClick(this.nextClickTime);
            }
            this.nextClickTime += secondsPerBeat;
        }
        
        setTimeout(() => this.schedule(), 25);
    }

    private playClick(time: number) {
        const audioContext = (this.audioEngine as any).audioContext;
        if (!audioContext || !this.clickBuffer) {return;}
        
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        
        source.buffer = this.clickBuffer;
        gain.gain.value = 0.1;
        
        source.connect(gain);
        gain.connect(audioContext.destination);
        
        source.start(time);
    }

    mute() {
        this.isMuted = true;
    }

    unmute() {
        this.isMuted = false;
    }

    stop() {
        this.isRunning = false;
    }

    updateTypingSpeed(charactersPerMinute: number) {
        this.typingSpeed = charactersPerMinute;
        this.lastTypeTime = Date.now();
    }
}

class FlowStateDetector {
    private metrics = {
        typingConsistency: 0,
        errorRate: 0,
        pauseFrequency: 0,
        editDistance: 0
    };
    private isInFlow = false;
    private callbacks: ((inFlow: boolean) => void)[] = [];
    private checkInterval: NodeJS.Timer | null = null;

    start() {
        this.checkInterval = setInterval(() => {
            this.updateFlowState();
        }, 5000);
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    private updateFlowState() {
        // Calculate flow score based on metrics
        const consistencyScore = this.metrics.typingConsistency;
        const errorScore = 1 - this.metrics.errorRate;
        const pauseScore = 1 - Math.min(1, this.metrics.pauseFrequency / 10);
        const editScore = 1 - Math.min(1, this.metrics.editDistance / 100);
        
        const flowScore = (consistencyScore + errorScore + pauseScore + editScore) / 4;
        const wasInFlow = this.isInFlow;
        
        this.isInFlow = flowScore > 0.7;
        
        if (wasInFlow !== this.isInFlow) {
            this.callbacks.forEach(cb => cb(this.isInFlow));
        }
    }

    updateMetrics(metrics: Partial<typeof this.metrics>) {
        Object.assign(this.metrics, metrics);
    }

    onFlowStateChange(callback: (inFlow: boolean) => void) {
        this.callbacks.push(callback);
    }
}

class PomodoroTimer {
    private currentPhase: 'work' | 'break' = 'work';
    private timeRemaining: number;
    private timer: NodeJS.Timer | null = null;
    private callbacks: ((phase: 'work' | 'break') => void)[] = [];
    private chimeBuffer: AudioBuffer | null = null;

    constructor(
        private audioEngine: any,
        private workMinutes: number,
        private breakMinutes: number
    ) {
        this.timeRemaining = workMinutes * 60;
        this.createChimeSound();
    }

    private createChimeSound() {
        const audioContext = (this.audioEngine as any).audioContext;
        if (!audioContext) {return;}

        const duration = 1;
        const sampleRate = audioContext.sampleRate;
        this.chimeBuffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        
        if (!this.chimeBuffer) {return;}
        
        const data = this.chimeBuffer.getChannelData(0);
        const frequencies = [523.25, 659.25, 783.99]; // C, E, G
        
        for (let i = 0; i < data.length; i++) {
            const t = i / sampleRate;
            const envelope = Math.exp(-t * 3);
            
            let sample = 0;
            frequencies.forEach((freq, index) => {
                sample += Math.sin(2 * Math.PI * freq * t) * envelope / frequencies.length;
            });
            
            data[i] = sample * 0.5;
        }
    }

    start() {
        this.timer = setInterval(() => {
            this.timeRemaining--;
            
            if (this.timeRemaining <= 0) {
                this.switchPhase();
            }
        }, 1000);
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private switchPhase() {
        this.playChime();
        
        if (this.currentPhase === 'work') {
            this.currentPhase = 'break';
            this.timeRemaining = this.breakMinutes * 60;
        } else {
            this.currentPhase = 'work';
            this.timeRemaining = this.workMinutes * 60;
        }
        
        this.callbacks.forEach(cb => cb(this.currentPhase));
    }

    private playChime() {
        const audioContext = (this.audioEngine as any).audioContext;
        if (!audioContext || !this.chimeBuffer) {return;}
        
        const source = audioContext.createBufferSource();
        const gain = audioContext.createGain();
        
        source.buffer = this.chimeBuffer;
        gain.gain.value = 0.6;
        
        source.connect(gain);
        gain.connect(audioContext.destination);
        
        source.start();
    }

    onPhaseChange(callback: (phase: 'work' | 'break') => void) {
        this.callbacks.push(callback);
    }

    getTimeRemaining(): { minutes: number, seconds: number } {
        return {
            minutes: Math.floor(this.timeRemaining / 60),
            seconds: this.timeRemaining % 60
        };
    }
}