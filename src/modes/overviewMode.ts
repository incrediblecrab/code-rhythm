import * as vscode from 'vscode';
import { AudioEngine } from '../audio/audioEngine';
import { ASTParser } from '../analysis/astParser';
import { SoundMapper } from '../mapping/soundMapper';
import { PatternDetector } from '../analysis/patternDetector';
import { MusicalEvent, SoundEvent } from '../types';

export class OverviewMode {
    private patternDetector: PatternDetector;
    
    constructor(
        private audioEngine: AudioEngine,
        private astParser: ASTParser,
        private soundMapper: SoundMapper
    ) {
        this.patternDetector = new PatternDetector();
    }

    async generateOverview(document: vscode.TextDocument): Promise<SoundEvent[]> {
        const events = await this.astParser.parse(document);
        const motifs = this.patternDetector.detectMotifs(events);
        const structure = this.patternDetector.generateMusicalStructure(events, motifs);
        
        const targetDuration = 30; // 30 seconds
        const measures = 32; // 32 measures total
        const soundEvents: SoundEvent[] = [];
        
        // Intro (4 measures)
        if (structure.intro) {
            soundEvents.push(...this.generateSection(
                structure.intro.events,
                0,
                4,
                'intro'
            ));
        }
        
        // Verse-Chorus structure (24 measures)
        let currentMeasure = 4;
        const verseDuration = 4;
        const chorusDuration = 4;
        
        for (let i = 0; i < 3; i++) {
            // Verse
            if (structure.verses[i % structure.verses.length]) {
                soundEvents.push(...this.generateSection(
                    structure.verses[i % structure.verses.length].events,
                    currentMeasure,
                    verseDuration,
                    'verse'
                ));
            }
            currentMeasure += verseDuration;
            
            // Chorus
            if (structure.choruses[i % Math.max(1, structure.choruses.length)]) {
                soundEvents.push(...this.generateSection(
                    structure.choruses[i % structure.choruses.length].events,
                    currentMeasure,
                    chorusDuration,
                    'chorus'
                ));
            }
            currentMeasure += chorusDuration;
        }
        
        // Bridge (2 measures)
        if (structure.bridge) {
            soundEvents.push(...this.generateSection(
                structure.bridge.events,
                currentMeasure,
                2,
                'bridge'
            ));
            currentMeasure += 2;
        }
        
        // Outro (2 measures)
        if (structure.outro) {
            soundEvents.push(...this.generateSection(
                structure.outro.events,
                30,
                2,
                'outro'
            ));
        }
        
        // Add recurring motifs
        for (const motif of motifs) {
            if (motif.confidence > 0.5) {
                soundEvents.push(...this.createMotifSounds(motif, measures));
            }
        }
        
        return this.compressToTargetDuration(soundEvents, targetDuration);
    }

    private generateSection(
        events: MusicalEvent[], 
        startMeasure: number,
        duration: number,
        sectionType: string
    ): SoundEvent[] {
        const sounds: SoundEvent[] = [];
        const eventsPerMeasure = Math.ceil(events.length / duration);
        
        for (let measure = 0; measure < duration; measure++) {
            const measureEvents = events.slice(
                measure * eventsPerMeasure,
                (measure + 1) * eventsPerMeasure
            );
            
            const measureTime = startMeasure + measure;
            
            // Add section marker
            if (measure === 0) {
                sounds.push(this.createSectionMarker(measureTime, sectionType));
            }
            
            // Compress events into this measure
            measureEvents.forEach((event, index) => {
                const relativeTime = index / eventsPerMeasure;
                const time = measureTime + relativeTime;
                
                const mappedSounds = this.soundMapper.mapToSounds([event]);
                mappedSounds.forEach(sound => {
                    sounds.push({
                        ...sound,
                        time: time,
                        pattern: `${sectionType}-${sound.pattern}`
                    });
                });
            });
        }
        
        return sounds;
    }

    private createSectionMarker(time: number, sectionType: string): SoundEvent {
        const markers = {
            intro: { pitch: 220, velocity: 0.6 },
            verse: { pitch: 330, velocity: 0.5 },
            chorus: { pitch: 440, velocity: 0.8 },
            bridge: { pitch: 350, velocity: 0.6 },
            outro: { pitch: 220, velocity: 0.4 }
        };
        
        const marker = markers[sectionType as keyof typeof markers] || markers.verse;
        
        return {
            time,
            duration: 0.5,
            instrument: 'synth',
            pitch: marker.pitch,
            velocity: marker.velocity,
            pattern: `${sectionType}-marker`
        };
    }

    private createMotifSounds(motif: any, totalMeasures: number): SoundEvent[] {
        const sounds: SoundEvent[] = [];
        const motifInterval = Math.floor(totalMeasures / (motif.occurrences + 1));
        
        for (let i = 1; i <= motif.occurrences; i++) {
            const measure = i * motifInterval;
            
            motif.events.forEach((event: MusicalEvent, index: number) => {
                sounds.push({
                    time: measure + index * 0.125,
                    duration: 0.1,
                    instrument: 'synth',
                    pitch: 440 * (1 + index * 0.1),
                    velocity: 0.4 * motif.confidence,
                    pattern: `motif-${i}`
                });
            });
        }
        
        return sounds;
    }

    private compressToTargetDuration(events: SoundEvent[], targetDuration: number): SoundEvent[] {
        if (events.length === 0) {return events;}
        
        const maxTime = Math.max(...events.map(e => e.time + e.duration));
        const scaleFactor = targetDuration / maxTime;
        
        return events.map(event => ({
            ...event,
            time: event.time * scaleFactor,
            duration: event.duration * scaleFactor
        }));
    }

    async exportAsMidi(events: SoundEvent[]): Promise<ArrayBuffer> {
        // Simple MIDI file structure
        const header = new Uint8Array([
            0x4D, 0x54, 0x68, 0x64, // "MThd"
            0x00, 0x00, 0x00, 0x06, // Header length
            0x00, 0x00, // Format type 0
            0x00, 0x01, // Number of tracks
            0x00, 0x60  // Ticks per quarter note
        ]);
        
        const trackEvents: number[] = [];
        
        // Convert sound events to MIDI events
        for (const event of events) {
            const tick = Math.floor(event.time * 96);
            const pitch = event.pitch ? this.frequencyToMidi(event.pitch) : 60;
            const velocity = Math.floor(event.velocity * 127);
            
            // Note on
            trackEvents.push(...this.encodeVariableLength(tick));
            trackEvents.push(0x90, pitch, velocity);
            
            // Note off
            const duration = Math.floor(event.duration * 96);
            trackEvents.push(...this.encodeVariableLength(duration));
            trackEvents.push(0x80, pitch, 0);
        }
        
        // End of track
        trackEvents.push(0x00, 0xFF, 0x2F, 0x00);
        
        const track = new Uint8Array([
            0x4D, 0x54, 0x72, 0x6B, // "MTrk"
            ...this.encodeInt32(trackEvents.length),
            ...trackEvents
        ]);
        
        // Combine header and track
        const midi = new Uint8Array(header.length + track.length);
        midi.set(header, 0);
        midi.set(track, header.length);
        
        return midi.buffer;
    }

    private frequencyToMidi(frequency: number): number {
        return Math.round(69 + 12 * Math.log2(frequency / 440));
    }

    private encodeVariableLength(value: number): number[] {
        const bytes: number[] = [];
        
        do {
            bytes.unshift(value & 0x7F);
            value >>= 7;
        } while (value > 0);
        
        for (let i = 0; i < bytes.length - 1; i++) {
            bytes[i] |= 0x80;
        }
        
        return bytes;
    }

    private encodeInt32(value: number): number[] {
        return [
            (value >> 24) & 0xFF,
            (value >> 16) & 0xFF,
            (value >> 8) & 0xFF,
            value & 0xFF
        ];
    }
}