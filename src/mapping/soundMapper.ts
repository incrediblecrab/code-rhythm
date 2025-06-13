import { MusicalEvent, SoundEvent, SoundMapping } from '../types';

export class SoundMapper {
    private genre: 'Electronic' | 'Jazz' | 'Ambient' | 'Classical' = 'Electronic';
    private tempo: number = 120;
    private scale: number[] = [0, 2, 4, 7, 9]; // Major pentatonic
    
    private readonly soundMappings: SoundMapping = {
        function: {
            instrument: 'kick',
            pitchRange: [40, 80],
            dynamics: (params: number) => Math.min(1, 0.6 + params * 0.1),
            duration: (lines: number) => Math.min(2, 0.1 + lines * 0.01)
        },
        loop: {
            instrument: 'hihat',
            rate: (depth: number) => Math.max(1, 4 - depth),
            velocity: (iterations: number) => Math.min(0.8, 0.4 + iterations * 0.05)
        },
        conditional: {
            instrument: 'snare',
            pitch: (complexity: number) => 200 + complexity * 100,
            pattern: 'if'
        },
        variable: {
            instrument: 'synth',
            note: (name: string) => this.stringToNote(name),
            octave: (scope: 'global' | 'local' | 'block') => 
                scope === 'global' ? 3 : scope === 'local' ? 4 : 5
        }
    };

    mapToSounds(events: MusicalEvent[]): SoundEvent[] {
        const soundEvents: SoundEvent[] = [];
        const timePerLine = 4 / 16; // 4 measures of 16th notes
        
        for (const event of events) {
            const mappedEvents = this.mapEventToSounds(event, timePerLine);
            soundEvents.push(...mappedEvents);
        }
        
        return this.adjustForGenre(soundEvents);
    }

    private mapEventToSounds(event: MusicalEvent, timePerLine: number): SoundEvent[] {
        const sounds: SoundEvent[] = [];
        const startTime = event.startLine * timePerLine;
        
        switch (event.type) {
            case 'function':
                sounds.push({
                    time: startTime,
                    duration: this.soundMappings.function.duration(
                        event.endLine - event.startLine
                    ),
                    instrument: 'kick',
                    velocity: this.soundMappings.function.dynamics(
                        event.metadata.parameters || 0
                    ),
                    pattern: `function-line-${event.startLine}`
                });
                
                if (event.complexity > 0.7) {
                    sounds.push({
                        time: startTime + 0.125,
                        duration: 0.05,
                        instrument: 'kick',
                        velocity: 0.4,
                        pattern: 'function-echo'
                    });
                }
                break;
                
            case 'loop':
                const rate = this.soundMappings.loop.rate(event.depth);
                const loopDuration = (event.endLine - event.startLine) * timePerLine;
                const hits = Math.floor(loopDuration * rate * 4);
                
                for (let i = 0; i < hits; i++) {
                    sounds.push({
                        time: startTime + (i / (rate * 4)),
                        duration: 0.05,
                        instrument: 'hihat',
                        velocity: this.soundMappings.loop.velocity(
                            event.metadata.iterations || 1
                        ),
                        pattern: i % 2 === 0 ? `loop-on-line-${event.startLine}` : `loop-off-line-${event.startLine}`
                    });
                }
                break;
                
            case 'conditional':
                sounds.push({
                    time: startTime,
                    duration: 0.1,
                    instrument: 'snare',
                    pitch: this.soundMappings.conditional.pitch(event.complexity),
                    velocity: 0.7,
                    pattern: `if-line-${event.startLine}`
                });
                
                if (event.metadata.conditions && event.metadata.conditions > 1) {
                    for (let i = 1; i < event.metadata.conditions; i++) {
                        sounds.push({
                            time: startTime + i * 0.25,
                            duration: 0.08,
                            instrument: 'snare',
                            pitch: this.soundMappings.conditional.pitch(event.complexity) * (1 + i * 0.1),
                            velocity: 0.5,
                            pattern: `else-if-line-${event.startLine}`
                        });
                    }
                }
                break;
                
            case 'variable':
                const note = this.soundMappings.variable.note(event.metadata.name || 'a');
                const octave = this.soundMappings.variable.octave(
                    event.metadata.scope || 'local'
                );
                
                sounds.push({
                    time: startTime,
                    duration: 0.25,
                    instrument: 'synth',
                    pitch: this.noteToFrequency(note, octave),
                    velocity: 0.6,
                    pattern: `variable-line-${event.startLine}`
                });
                break;
                
            case 'class':
                for (let i = 0; i < 3; i++) {
                    sounds.push({
                        time: startTime + i * 0.5,
                        duration: 0.4,
                        instrument: 'synth',
                        pitch: this.noteToFrequency(this.scale[i], 2),
                        velocity: 0.8 - i * 0.2,
                        pattern: `class-chord-line-${event.startLine}`
                    });
                }
                break;
                
            case 'comment':
                // Comments create silence/rests
                break;
        }
        
        return sounds;
    }

    private stringToNote(str: string): number {
        if (!str) {return 0;}
        
        const hash = str.split('').reduce((acc, char) => 
            acc + char.charCodeAt(0), 0
        );
        
        return this.scale[hash % this.scale.length];
    }

    private noteToFrequency(note: number, octave: number): number {
        // A4 = 440Hz, note 0 = C
        const a4 = 440;
        const c0 = a4 * Math.pow(2, -4.75);
        
        return c0 * Math.pow(2, (octave * 12 + note) / 12);
    }

    private adjustForGenre(events: SoundEvent[]): SoundEvent[] {
        switch (this.genre) {
            case 'Jazz':
                return this.applyJazzTransform(events);
            case 'Ambient':
                return this.applyAmbientTransform(events);
            case 'Classical':
                return this.applyClassicalTransform(events);
            default:
                return events;
        }
    }

    private applyJazzTransform(events: SoundEvent[]): SoundEvent[] {
        return events.map(event => {
            if (event.instrument === 'hihat') {
                // Add swing
                const isOffBeat = Math.floor(event.time * 4) % 2 === 1;
                if (isOffBeat) {
                    event.time += 0.03; // Swing delay
                }
            }
            
            if (event.instrument === 'synth' && event.pitch) {
                // Add blue notes
                const blueNote = Math.random() < 0.3;
                if (blueNote) {
                    event.pitch *= Math.pow(2, -0.5 / 12); // Flatten by half step
                }
            }
            
            // Softer dynamics
            event.velocity *= 0.8;
            
            return event;
        });
    }

    private applyAmbientTransform(events: SoundEvent[]): SoundEvent[] {
        return events.map(event => {
            // Longer durations
            event.duration *= 3;
            
            // Much softer
            event.velocity *= 0.4;
            
            // Remove drums, keep only melodic
            if (event.instrument === 'kick' || event.instrument === 'snare') {
                event.instrument = 'synth';
                event.pitch = this.noteToFrequency(
                    this.scale[Math.floor(Math.random() * this.scale.length)], 
                    2
                );
            }
            
            // Add slight timing variations
            event.time += (Math.random() - 0.5) * 0.05;
            
            return event;
        });
    }

    private applyClassicalTransform(events: SoundEvent[]): SoundEvent[] {
        const transformed: SoundEvent[] = [];
        
        // Group events by time to create chords
        const eventsByTime = new Map<number, SoundEvent[]>();
        
        for (const event of events) {
            const quantizedTime = Math.round(event.time * 4) / 4;
            if (!eventsByTime.has(quantizedTime)) {
                eventsByTime.set(quantizedTime, []);
            }
            eventsByTime.get(quantizedTime)!.push(event);
        }
        
        // Convert to more classical arrangement
        for (const [time, group] of eventsByTime) {
            if (group.some(e => e.instrument === 'kick')) {
                // Bass note
                transformed.push({
                    time,
                    duration: 0.5,
                    instrument: 'synth',
                    pitch: this.noteToFrequency(0, 2),
                    velocity: 0.7,
                    pattern: 'bass'
                });
            }
            
            // Create triads for other events
            const melodicEvents = group.filter(e => 
                e.instrument === 'synth' || e.instrument === 'hihat'
            );
            
            if (melodicEvents.length > 0) {
                const root = this.scale[0];
                const third = this.scale[2];
                const fifth = this.scale[4];
                
                transformed.push(
                    {
                        time,
                        duration: 0.4,
                        instrument: 'synth',
                        pitch: this.noteToFrequency(root, 4),
                        velocity: 0.6,
                        pattern: 'chord-root'
                    },
                    {
                        time: time + 0.01,
                        duration: 0.4,
                        instrument: 'synth',
                        pitch: this.noteToFrequency(third, 4),
                        velocity: 0.5,
                        pattern: 'chord-third'
                    },
                    {
                        time: time + 0.02,
                        duration: 0.4,
                        instrument: 'synth',
                        pitch: this.noteToFrequency(fifth, 4),
                        velocity: 0.4,
                        pattern: 'chord-fifth'
                    }
                );
            }
        }
        
        return transformed;
    }

    setGenre(genre: 'Electronic' | 'Jazz' | 'Ambient' | 'Classical') {
        this.genre = genre;
        
        // Adjust scale based on genre
        switch (genre) {
            case 'Jazz':
                this.scale = [0, 2, 3, 5, 6, 8, 10]; // Dorian mode
                break;
            case 'Ambient':
                this.scale = [0, 2, 4, 5, 7, 9, 11]; // Major scale
                break;
            case 'Classical':
                this.scale = [0, 2, 4, 5, 7, 9, 11]; // Major scale
                break;
            default:
                this.scale = [0, 2, 4, 7, 9]; // Pentatonic
        }
    }

    setTempo(bpm: number) {
        this.tempo = bpm;
    }

    setComplexityMapping(useDissonance: boolean) {
        if (useDissonance) {
            this.scale = [0, 1, 3, 6, 7, 9, 10]; // More dissonant intervals
        } else {
            this.scale = [0, 2, 4, 7, 9]; // Consonant pentatonic
        }
    }
}