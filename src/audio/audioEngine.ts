import { SoundEvent, AudioConfig } from '../types';

export class AudioEngine {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private compressor: DynamicsCompressorNode | null = null;
    private reverb: ConvolverNode | null = null;
    private isPlayingFlag = false;
    private currentEvents: SoundEvent[] = [];
    private startTime = 0;
    private tempo = 120;
    private mode: string = 'overview';
    private schedulerTimer: NodeJS.Timer | null = null;
    private nextNoteTime = 0;
    private lookahead = 25.0; // ms
    private scheduleAheadTime = 0.1; // s

    constructor() {
        this.initializeContext();
    }

    private async initializeContext() {
        // Audio context will be initialized from the webview
        console.log('AudioEngine: Waiting for webview initialization');
    }

    public setAudioContext(audioContext: AudioContext) {
        this.audioContext = audioContext;
        
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.7;

        this.compressor = this.audioContext.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        this.reverb = this.audioContext.createConvolver();
        this.createReverbImpulse();

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.audioContext.destination);
    }

    private async createReverbImpulse() {
        if (!this.audioContext || !this.reverb) {return;}

        const length = this.audioContext.sampleRate * 2;
        const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);

        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }

        this.reverb.buffer = impulse;
    }

    private createKick(time: number, intensity: number = 0.8) {
        if (!this.audioContext || !this.compressor) {return;}

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(intensity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.connect(gain);
        gain.connect(this.compressor);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    private createSnare(time: number, intensity: number = 0.7) {
        if (!this.audioContext || !this.compressor) {return;}

        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, 4096, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 4096; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;

        const noiseGain = this.audioContext.createGain();
        noiseGain.gain.setValueAtTime(intensity * 0.5, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;

        const osc = this.audioContext.createOscillator();
        const oscGain = this.audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 200;
        oscGain.gain.setValueAtTime(intensity * 0.5, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.compressor);

        osc.connect(oscGain);
        oscGain.connect(this.compressor);

        noise.start(time);
        noise.stop(time + 0.2);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    private createHihat(time: number, intensity: number = 0.5, closed: boolean = true) {
        if (!this.audioContext || !this.compressor) {return;}

        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, 4096, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < 4096; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(intensity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + (closed ? 0.05 : 0.3));

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        noise.start(time);
        noise.stop(time + (closed ? 0.05 : 0.3));
    }

    private createSynth(time: number, frequency: number, duration: number, intensity: number = 0.6) {
        if (!this.audioContext || !this.compressor) {return;}

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = frequency;

        filter.type = 'lowpass';
        filter.frequency.value = frequency * 4;
        filter.Q.value = 5;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(intensity, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        osc.start(time);
        osc.stop(time + duration);
    }

    private scheduler() {
        if (!this.audioContext) {return;}

        while (this.nextNoteTime < this.audioContext.currentTime + this.scheduleAheadTime) {
            const currentBeat = (this.nextNoteTime - this.startTime) * (this.tempo / 60);
            
            for (const event of this.currentEvents) {
                if (Math.abs(event.time - currentBeat) < 0.05) {
                    this.scheduleNote(event, this.nextNoteTime);
                }
            }

            const secondsPerBeat = 60.0 / this.tempo;
            this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        }
    }

    private scheduleNote(event: SoundEvent, time: number) {
        switch (event.instrument) {
            case 'kick':
                this.createKick(time, event.velocity);
                break;
            case 'snare':
                this.createSnare(time, event.velocity);
                break;
            case 'hihat':
                this.createHihat(time, event.velocity);
                break;
            case 'synth':
                if (event.pitch) {
                    this.createSynth(time, event.pitch, event.duration, event.velocity);
                }
                break;
        }
    }

    async play(events: SoundEvent[]) {
        if (!this.audioContext) {
            console.warn('AudioContext not initialized. Please open the Code Rhythm panel first.');
            return;
        }

        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        this.currentEvents = events;
        this.isPlayingFlag = true;
        this.startTime = this.audioContext.currentTime;
        this.nextNoteTime = this.startTime;

        this.schedulerTimer = setInterval(() => this.scheduler(), this.lookahead);
    }

    stop() {
        this.isPlayingFlag = false;
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }
    }

    pause() {
        this.audioContext?.suspend();
    }

    resume() {
        this.audioContext?.resume();
    }

    isPlaying(): boolean {
        return this.isPlayingFlag;
    }

    setMode(mode: string) {
        this.mode = mode;
    }

    updateEvents(events: SoundEvent[]) {
        this.currentEvents = events;
    }

    setTempo(bpm: number) {
        this.tempo = Math.max(60, Math.min(180, bpm));
    }

    setVolume(volume: number) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }

    dispose() {
        this.stop();
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}