import * as vscode from 'vscode';
import { AudioEngine } from '../audio/audioEngine';
import { ASTParser } from '../analysis/astParser';
import { SoundMapper } from '../mapping/soundMapper';
import { MusicalEvent, SoundEvent } from '../types';

export class DiffMode {
    constructor(
        private audioEngine: AudioEngine,
        private astParser: ASTParser,
        private soundMapper: SoundMapper
    ) {}

    async processDiff(
        originalDoc: vscode.TextDocument,
        modifiedDoc: vscode.TextDocument
    ): Promise<{ left: SoundEvent[], right: SoundEvent[] }> {
        const originalEvents = await this.astParser.parse(originalDoc);
        const modifiedEvents = await this.astParser.parse(modifiedDoc);
        
        const changes = this.detectChanges(originalEvents, modifiedEvents);
        
        const leftChannel = this.generateChannelSounds(originalEvents, changes.removed, 'removed');
        const rightChannel = this.generateChannelSounds(modifiedEvents, changes.added, 'added');
        
        // Add crossfade effects for modified elements
        changes.modified.forEach(({ original, modified }) => {
            const fadeOutSounds = this.createFadeEffect(original, 'out');
            const fadeInSounds = this.createFadeEffect(modified, 'in');
            
            leftChannel.push(...fadeOutSounds);
            rightChannel.push(...fadeInSounds);
        });
        
        return { left: leftChannel, right: rightChannel };
    }

    private detectChanges(
        original: MusicalEvent[], 
        modified: MusicalEvent[]
    ): {
        added: MusicalEvent[],
        removed: MusicalEvent[],
        modified: { original: MusicalEvent, modified: MusicalEvent }[]
    } {
        const added: MusicalEvent[] = [];
        const removed: MusicalEvent[] = [];
        const modifiedPairs: { original: MusicalEvent, modified: MusicalEvent }[] = [];
        
        const originalByLine = new Map<number, MusicalEvent[]>();
        const modifiedByLine = new Map<number, MusicalEvent[]>();
        
        original.forEach(event => {
            const key = event.startLine;
            if (!originalByLine.has(key)) {originalByLine.set(key, []);}
            originalByLine.get(key)!.push(event);
        });
        
        modified.forEach(event => {
            const key = event.startLine;
            if (!modifiedByLine.has(key)) {modifiedByLine.set(key, []);}
            modifiedByLine.get(key)!.push(event);
        });
        
        // Find removed events
        for (const [line, events] of originalByLine) {
            if (!modifiedByLine.has(line)) {
                removed.push(...events);
            } else {
                const modEvents = modifiedByLine.get(line)!;
                events.forEach(origEvent => {
                    const match = modEvents.find(m => 
                        m.type === origEvent.type && 
                        m.metadata.name === origEvent.metadata.name
                    );
                    
                    if (!match) {
                        removed.push(origEvent);
                    } else if (this.hasChanged(origEvent, match)) {
                        modifiedPairs.push({ original: origEvent, modified: match });
                    }
                });
            }
        }
        
        // Find added events
        for (const [line, events] of modifiedByLine) {
            if (!originalByLine.has(line)) {
                added.push(...events);
            } else {
                const origEvents = originalByLine.get(line)!;
                events.forEach(modEvent => {
                    const match = origEvents.find(o => 
                        o.type === modEvent.type && 
                        o.metadata.name === modEvent.metadata.name
                    );
                    
                    if (!match) {
                        added.push(modEvent);
                    }
                });
            }
        }
        
        return { added, removed, modified: modifiedPairs };
    }

    private hasChanged(original: MusicalEvent, modified: MusicalEvent): boolean {
        return original.complexity !== modified.complexity ||
               original.endLine !== modified.endLine ||
               original.depth !== modified.depth;
    }

    private generateChannelSounds(
        allEvents: MusicalEvent[],
        highlightEvents: MusicalEvent[],
        changeType: 'added' | 'removed'
    ): SoundEvent[] {
        const sounds: SoundEvent[] = [];
        const highlightSet = new Set(highlightEvents);
        
        // Map all events with different treatment for highlighted ones
        allEvents.forEach(event => {
            const isHighlighted = highlightSet.has(event);
            const baseSounds = this.soundMapper.mapToSounds([event]);
            
            baseSounds.forEach(sound => {
                if (isHighlighted) {
                    // Emphasize changed elements
                    sounds.push({
                        ...sound,
                        velocity: sound.velocity * 1.2,
                        pitch: sound.pitch ? sound.pitch * (changeType === 'added' ? 1.05 : 0.95) : undefined,
                        pattern: `${changeType}-${sound.pattern}`
                    });
                } else {
                    // Reduce volume for unchanged elements
                    sounds.push({
                        ...sound,
                        velocity: sound.velocity * 0.5,
                        pattern: `unchanged-${sound.pattern}`
                    });
                }
            });
        });
        
        return sounds;
    }

    private createFadeEffect(event: MusicalEvent, direction: 'in' | 'out'): SoundEvent[] {
        const sounds: SoundEvent[] = [];
        const steps = 8;
        const duration = 0.5;
        
        for (let i = 0; i < steps; i++) {
            const progress = i / steps;
            const time = event.startLine / 10 + progress * duration;
            const velocity = direction === 'out' ? 
                0.6 * (1 - progress) : 
                0.6 * progress;
            
            sounds.push({
                time,
                duration: duration / steps,
                instrument: 'synth',
                pitch: 440 + progress * 100 * (direction === 'in' ? 1 : -1),
                velocity,
                pattern: `fade-${direction}`
            });
        }
        
        return sounds;
    }

    setupStereoOutput(audioContext: AudioContext): {
        leftGain: GainNode,
        rightGain: GainNode,
        merger: ChannelMergerNode
    } {
        const leftGain = audioContext.createGain();
        const rightGain = audioContext.createGain();
        const merger = audioContext.createChannelMerger(2);
        
        leftGain.connect(merger, 0, 0);
        rightGain.connect(merger, 0, 1);
        
        leftGain.gain.value = 0.7;
        rightGain.gain.value = 0.7;
        
        return { leftGain, rightGain, merger };
    }
}