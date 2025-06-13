import { MusicalEvent, SoundEvent } from '../types';

export class RhythmGenerator {
    private patterns = {
        electronic: {
            kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
            snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        },
        jazz: {
            kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
            snare: [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
            hihat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0]
        },
        ambient: {
            kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            snare: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
            hihat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        classical: {
            kick: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
            snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
            hihat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        }
    };

    generateRhythm(
        events: MusicalEvent[], 
        genre: 'Electronic' | 'Jazz' | 'Ambient' | 'Classical',
        measures: number = 4
    ): SoundEvent[] {
        const rhythmEvents: SoundEvent[] = [];
        const pattern = this.patterns[genre.toLowerCase() as keyof typeof this.patterns];
        const stepsPerMeasure = 16;
        const totalSteps = stepsPerMeasure * measures;
        
        // Generate base rhythm
        for (let step = 0; step < totalSteps; step++) {
            const patternIndex = step % stepsPerMeasure;
            const time = step / stepsPerMeasure;
            
            if (pattern.kick[patternIndex]) {
                rhythmEvents.push({
                    time,
                    duration: 0.1,
                    instrument: 'kick',
                    velocity: 0.8,
                    pattern: 'base-rhythm'
                });
            }
            
            if (pattern.snare[patternIndex]) {
                rhythmEvents.push({
                    time,
                    duration: 0.05,
                    instrument: 'snare',
                    velocity: 0.7,
                    pattern: 'base-rhythm'
                });
            }
            
            if (pattern.hihat[patternIndex]) {
                rhythmEvents.push({
                    time,
                    duration: 0.03,
                    instrument: 'hihat',
                    velocity: 0.5,
                    pattern: 'base-rhythm'
                });
            }
        }
        
        // Add variations based on code complexity
        return this.addComplexityVariations(rhythmEvents, events);
    }

    generateAdaptiveRhythm(events: MusicalEvent[]): SoundEvent[] {
        const rhythmEvents: SoundEvent[] = [];
        const density = this.calculateEventDensity(events);
        
        // Create rhythm that matches code density
        const pattern = this.createDensityBasedPattern(density);
        const measures = Math.ceil(events.length / 10);
        
        for (let measure = 0; measure < measures; measure++) {
            const measureEvents = events.slice(measure * 10, (measure + 1) * 10);
            const localDensity = this.calculateEventDensity(measureEvents);
            
            for (let step = 0; step < 16; step++) {
                const time = measure + step / 16;
                const velocity = 0.3 + localDensity * 0.5;
                
                if (pattern[step] && Math.random() < localDensity) {
                    rhythmEvents.push({
                        time,
                        duration: 0.05,
                        instrument: this.selectInstrumentByStep(step),
                        velocity,
                        pattern: 'adaptive'
                    });
                }
            }
        }
        
        return rhythmEvents;
    }

    generatePolyrhythm(basePattern: number, overlayPattern: number, measures: number = 4): SoundEvent[] {
        const events: SoundEvent[] = [];
        const lcm = this.lcm(basePattern, overlayPattern);
        const totalSteps = lcm * measures;
        
        for (let step = 0; step < totalSteps; step++) {
            const time = step / lcm;
            
            if (step % (lcm / basePattern) === 0) {
                events.push({
                    time,
                    duration: 0.1,
                    instrument: 'kick',
                    velocity: 0.8,
                    pattern: `poly-${basePattern}`
                });
            }
            
            if (step % (lcm / overlayPattern) === 0) {
                events.push({
                    time,
                    duration: 0.05,
                    instrument: 'hihat',
                    velocity: 0.6,
                    pattern: `poly-${overlayPattern}`
                });
            }
        }
        
        return events;
    }

    generateEuclideanRhythm(pulses: number, steps: number, rotation: number = 0): SoundEvent[] {
        const pattern = this.calculateEuclideanPattern(pulses, steps);
        const events: SoundEvent[] = [];
        
        for (let i = 0; i < steps; i++) {
            const index = (i + rotation) % steps;
            if (pattern[index]) {
                events.push({
                    time: i / steps,
                    duration: 0.05,
                    instrument: 'kick',
                    velocity: 0.7,
                    pattern: `euclidean-${pulses}-${steps}`
                });
            }
        }
        
        return events;
    }

    generateFillPattern(startTime: number, duration: number, intensity: number = 0.5): SoundEvent[] {
        const events: SoundEvent[] = [];
        const subdivisions = Math.floor(duration * 16 * intensity);
        
        for (let i = 0; i < subdivisions; i++) {
            const progress = i / subdivisions;
            const time = startTime + (duration * progress);
            
            events.push({
                time,
                duration: 0.03,
                instrument: this.selectFillInstrument(progress),
                velocity: 0.4 + progress * 0.4,
                pattern: 'fill'
            });
        }
        
        return events;
    }

    private addComplexityVariations(baseRhythm: SoundEvent[], codeEvents: MusicalEvent[]): SoundEvent[] {
        const variations: SoundEvent[] = [...baseRhythm];
        
        for (const event of codeEvents) {
            if (event.complexity > 0.7) {
                // Add ghost notes for complex code
                const ghostTime = event.startLine / 10 + 0.03;
                variations.push({
                    time: ghostTime,
                    duration: 0.02,
                    instrument: 'snare',
                    velocity: 0.3,
                    pattern: 'ghost-note'
                });
            }
            
            if (event.type === 'loop' && event.depth > 2) {
                // Add rapid hi-hats for deeply nested loops
                const startTime = event.startLine / 10;
                const endTime = event.endLine / 10;
                const steps = Math.floor((endTime - startTime) * 32);
                
                for (let i = 0; i < steps; i++) {
                    variations.push({
                        time: startTime + i / 32,
                        duration: 0.02,
                        instrument: 'hihat',
                        velocity: 0.4,
                        pattern: 'nested-loop'
                    });
                }
            }
        }
        
        return variations;
    }

    private calculateEventDensity(events: MusicalEvent[]): number {
        if (events.length === 0) {return 0;}
        
        const totalLines = events.reduce((sum, e) => 
            sum + (e.endLine - e.startLine + 1), 0
        );
        const avgLinesPerEvent = totalLines / events.length;
        
        return Math.min(1, events.length / (avgLinesPerEvent * 5));
    }

    private createDensityBasedPattern(density: number): boolean[] {
        const pattern: boolean[] = new Array(16).fill(false);
        const numHits = Math.floor(density * 16);
        
        // Distribute hits evenly
        for (let i = 0; i < numHits; i++) {
            const index = Math.floor((i / numHits) * 16);
            pattern[index] = true;
        }
        
        return pattern;
    }

    private selectInstrumentByStep(step: number): 'kick' | 'snare' | 'hihat' {
        if (step % 4 === 0) {return 'kick';}
        if (step % 4 === 2) {return 'snare';}
        return 'hihat';
    }

    private selectFillInstrument(progress: number): 'kick' | 'snare' | 'hihat' {
        if (progress < 0.3) {return 'hihat';}
        if (progress < 0.7) {return 'snare';}
        return 'kick';
    }

    private calculateEuclideanPattern(pulses: number, steps: number): boolean[] {
        const pattern: boolean[] = new Array(steps).fill(false);
        const groups: boolean[][] = [];
        
        for (let i = 0; i < pulses; i++) {
            groups.push([true]);
        }
        
        for (let i = 0; i < steps - pulses; i++) {
            groups.push([false]);
        }
        
        while (groups.length > 1) {
            const newGroups: boolean[][] = [];
            const pairs = Math.floor(groups.length / 2);
            
            for (let i = 0; i < pairs; i++) {
                newGroups.push([...groups[i], ...groups[groups.length - 1 - i]]);
            }
            
            if (groups.length % 2 === 1) {
                newGroups.push(groups[pairs]);
            }
            
            groups.length = 0;
            groups.push(...newGroups);
        }
        
        let index = 0;
        for (const group of groups) {
            for (const value of group) {
                pattern[index++] = value;
            }
        }
        
        return pattern;
    }

    private lcm(a: number, b: number): number {
        return (a * b) / this.gcd(a, b);
    }

    private gcd(a: number, b: number): number {
        while (b !== 0) {
            const temp = b;
            b = a % b;
            a = temp;
        }
        return a;
    }
}