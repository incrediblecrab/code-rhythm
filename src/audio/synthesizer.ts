export class Synthesizer {
    private audioContext: AudioContext;

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;
    }

    createEnvelope(param: AudioParam, time: number, attack: number, decay: number, sustain: number, release: number, peakValue: number) {
        param.cancelScheduledValues(time);
        param.setValueAtTime(0, time);
        param.linearRampToValueAtTime(peakValue, time + attack);
        param.linearRampToValueAtTime(sustain * peakValue, time + attack + decay);
        return time + attack + decay;
    }

    createADSR(gain: GainNode, time: number, duration: number, attack = 0.01, decay = 0.1, sustain = 0.7, release = 0.2) {
        const sustainTime = Math.max(0, duration - attack - decay - release);
        
        gain.gain.cancelScheduledValues(time);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(1, time + attack);
        gain.gain.linearRampToValueAtTime(sustain, time + attack + decay);
        gain.gain.setValueAtTime(sustain, time + attack + decay + sustainTime);
        gain.gain.linearRampToValueAtTime(0, time + attack + decay + sustainTime + release);
    }

    createPad(time: number, frequency: number, duration: number, intensity: number = 0.5): OscillatorNode[] {
        const oscillators: OscillatorNode[] = [];
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.value = frequency * 2;
        filter.Q.value = 2;

        for (let i = 0; i < 3; i++) {
            const osc = this.audioContext.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = frequency * (1 + i * 0.01);
            osc.connect(filter);
            osc.start(time);
            osc.stop(time + duration);
            oscillators.push(osc);
        }

        this.createADSR(gain, time, duration, 0.5, 0.2, 0.6, 0.5);
        gain.gain.value = intensity * 0.3;

        filter.connect(gain);
        
        return oscillators;
    }

    createBass(time: number, frequency: number, duration: number, intensity: number = 0.8): OscillatorNode {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = frequency;

        filter.type = 'lowpass';
        filter.frequency.value = frequency * 3;
        filter.Q.value = 10;

        this.createEnvelope(filter.frequency, time, 0.01, 0.2, 0.3, duration - 0.21, frequency * 8);
        this.createADSR(gain, time, duration, 0.01, 0.1, 0.7, 0.1);
        gain.gain.value = intensity;

        osc.connect(filter);
        filter.connect(gain);

        osc.start(time);
        osc.stop(time + duration);

        return osc;
    }

    createLead(time: number, frequency: number, duration: number, intensity: number = 0.7): OscillatorNode {
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        const vibrato = this.audioContext.createOscillator();
        const vibratoGain = this.audioContext.createGain();

        osc.type = 'square';
        osc.frequency.value = frequency;

        vibrato.frequency.value = 5;
        vibratoGain.gain.value = 3;

        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        this.createADSR(gain, time, duration, 0.05, 0.1, 0.8, 0.3);
        gain.gain.value = intensity;

        osc.connect(gain);

        vibrato.start(time);
        osc.start(time);
        vibrato.stop(time + duration);
        osc.stop(time + duration);

        return osc;
    }

    createPercussion(time: number, type: 'conga' | 'cowbell' | 'clap', intensity: number = 0.7): AudioBufferSourceNode {
        const noise = this.audioContext.createBufferSource();
        const noiseBuffer = this.audioContext.createBuffer(1, 4096, this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        
        for (let i = 0; i < 4096; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = noiseBuffer;

        const filter = this.audioContext.createBiquadFilter();
        const gain = this.audioContext.createGain();

        switch (type) {
            case 'conga':
                filter.type = 'bandpass';
                filter.frequency.value = 400;
                filter.Q.value = 10;
                gain.gain.setValueAtTime(intensity, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
                break;
            case 'cowbell':
                filter.type = 'bandpass';
                filter.frequency.value = 800;
                filter.Q.value = 5;
                gain.gain.setValueAtTime(intensity, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
                break;
            case 'clap':
                filter.type = 'highpass';
                filter.frequency.value = 1500;
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(intensity, time + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);
                break;
        }

        noise.connect(filter);
        filter.connect(gain);

        noise.start(time);
        noise.stop(time + 0.2);

        return noise;
    }
}