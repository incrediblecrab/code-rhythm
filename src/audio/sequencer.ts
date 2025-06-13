import { SoundEvent } from '../types';

export class Sequencer {
    private tempo: number = 120;
    private swing: number = 0;
    private currentStep: number = 0;
    private stepTime: number = 0;
    private isRunning: boolean = false;
    private events: SoundEvent[] = [];
    private onStep: ((events: SoundEvent[]) => void) | null = null;

    constructor(tempo: number = 120) {
        this.tempo = tempo;
        this.calculateStepTime();
    }

    private calculateStepTime() {
        const quarterNote = 60 / this.tempo;
        this.stepTime = quarterNote / 4; // 16th notes
    }

    setTempo(bpm: number) {
        this.tempo = Math.max(60, Math.min(180, bpm));
        this.calculateStepTime();
    }

    setSwing(amount: number) {
        this.swing = Math.max(0, Math.min(0.7, amount));
    }

    loadEvents(events: SoundEvent[]) {
        this.events = this.quantizeEvents(events);
    }

    private quantizeEvents(events: SoundEvent[]): SoundEvent[] {
        const quantized: SoundEvent[] = [];
        const grid = 1 / 16; // 16th note grid

        for (const event of events) {
            const quantizedTime = Math.round(event.time / grid) * grid;
            quantized.push({
                ...event,
                time: quantizedTime
            });
        }

        return quantized.sort((a, b) => a.time - b.time);
    }

    getEventsAtStep(step: number): SoundEvent[] {
        const stepTime = step * (1 / 16);
        const swingOffset = step % 2 === 1 ? this.swing * this.stepTime : 0;
        const actualTime = stepTime + swingOffset;

        return this.events.filter(event => 
            Math.abs(event.time - actualTime) < 0.001
        );
    }

    generatePolyrhythm(basePattern: number[], overlayPattern: number[], measures: number = 4): SoundEvent[] {
        const events: SoundEvent[] = [];
        const stepsPerMeasure = 16;
        const totalSteps = stepsPerMeasure * measures;

        for (let step = 0; step < totalSteps; step++) {
            const measureStep = step % stepsPerMeasure;
            
            if (basePattern.includes(measureStep)) {
                events.push({
                    time: step / stepsPerMeasure,
                    duration: 0.1,
                    instrument: 'kick',
                    velocity: 0.8,
                    pattern: 'base'
                });
            }

            const overlayStep = Math.floor((step * overlayPattern.length) / totalSteps);
            if (step % Math.floor(totalSteps / overlayPattern.length) === 0) {
                events.push({
                    time: step / stepsPerMeasure,
                    duration: 0.05,
                    instrument: 'hihat',
                    velocity: 0.6,
                    pattern: 'overlay'
                });
            }
        }

        return events;
    }

    generateEuclidean(pulses: number, steps: number, rotation: number = 0): boolean[] {
        const pattern: boolean[] = new Array(steps).fill(false);
        const spacing = steps / pulses;

        for (let i = 0; i < pulses; i++) {
            const index = Math.floor(i * spacing + rotation) % steps;
            pattern[index] = true;
        }

        return pattern;
    }

    humanize(events: SoundEvent[], timingVariation: number = 0.01, velocityVariation: number = 0.1): SoundEvent[] {
        return events.map(event => ({
            ...event,
            time: event.time + (Math.random() - 0.5) * timingVariation,
            velocity: Math.max(0, Math.min(1, 
                event.velocity + (Math.random() - 0.5) * velocityVariation
            ))
        }));
    }

    start(callback: (events: SoundEvent[]) => void) {
        this.isRunning = true;
        this.onStep = callback;
        this.currentStep = 0;
    }

    stop() {
        this.isRunning = false;
        this.currentStep = 0;
    }

    tick(): SoundEvent[] {
        if (!this.isRunning) {return [];}

        const events = this.getEventsAtStep(this.currentStep);
        this.currentStep = (this.currentStep + 1) % (16 * 4); // 4 measures

        if (this.onStep) {
            this.onStep(events);
        }

        return events;
    }
}