import * as vscode from 'vscode';
import { AudioEngine } from '../audio/audioEngine';
import { ASTParser } from '../analysis/astParser';
import { SoundMapper } from '../mapping/soundMapper';
import { MusicalEvent, SoundEvent } from '../types';

export class NavigationMode {
    private disposables: vscode.Disposable[] = [];
    private lastPosition: vscode.Position | null = null;
    private currentEvents: MusicalEvent[] = [];
    private isActive: boolean = false;

    constructor(
        private audioEngine: AudioEngine,
        private astParser: ASTParser,
        private soundMapper: SoundMapper
    ) {}

    async activate() {
        this.isActive = true;
        
        const onCursorChange = vscode.window.onDidChangeTextEditorSelection(async (e) => {
            if (!this.isActive) {return;}
            
            const editor = e.textEditor;
            const position = e.selections[0].active;
            
            if (this.lastPosition && this.detectJump(this.lastPosition, position)) {
                await this.playTransition(this.lastPosition, position);
            } else {
                await this.playCurrentLineSound(editor, position);
            }
            
            this.lastPosition = position;
        });

        this.disposables.push(onCursorChange);

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            this.currentEvents = await this.astParser.parse(editor.document);
        }
    }

    deactivate() {
        this.isActive = false;
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    private detectJump(oldPos: vscode.Position, newPos: vscode.Position): boolean {
        const lineDiff = Math.abs(newPos.line - oldPos.line);
        return lineDiff > 5;
    }

    private async playCurrentLineSound(editor: vscode.TextEditor, position: vscode.Position) {
        const lineNumber = position.line;
        const eventsOnLine = this.currentEvents.filter(event => 
            event.startLine <= lineNumber && event.endLine >= lineNumber
        );

        if (eventsOnLine.length === 0) {return;}

        const sounds: SoundEvent[] = [];
        const currentTime = 0;

        eventsOnLine.forEach((event, index) => {
            const delay = index * 0.1;
            const pitch = this.calculatePitchForLine(lineNumber, event);
            
            switch (event.type) {
                case 'function':
                    sounds.push({
                        time: currentTime + delay,
                        duration: 0.2,
                        instrument: 'kick',
                        velocity: 0.6,
                        pattern: 'navigation'
                    });
                    break;
                    
                case 'variable':
                    sounds.push({
                        time: currentTime + delay,
                        duration: 0.15,
                        instrument: 'synth',
                        pitch,
                        velocity: 0.5,
                        pattern: 'navigation'
                    });
                    break;
                    
                case 'loop':
                case 'conditional':
                    sounds.push({
                        time: currentTime + delay,
                        duration: 0.1,
                        instrument: event.type === 'loop' ? 'hihat' : 'snare',
                        velocity: 0.4,
                        pattern: 'navigation'
                    });
                    break;
            }
        });

        if (sounds.length > 0) {
            this.audioEngine.updateEvents(sounds);
            await this.audioEngine.play(sounds);
            
            setTimeout(() => {
                this.audioEngine.stop();
            }, 500);
        }
    }

    private async playTransition(oldPos: vscode.Position, newPos: vscode.Position) {
        const direction = newPos.line > oldPos.line ? 'down' : 'up';
        const distance = Math.abs(newPos.line - oldPos.line);
        const intensity = Math.min(1, distance / 50);

        const fillSounds: SoundEvent[] = [];
        const numNotes = Math.min(16, Math.floor(distance / 5) + 3);
        
        for (let i = 0; i < numNotes; i++) {
            const progress = i / numNotes;
            const time = progress * 0.3;
            
            fillSounds.push({
                time,
                duration: 0.05,
                instrument: 'hihat',
                velocity: 0.3 + progress * intensity * 0.4,
                pattern: 'jump-fill'
            });

            if (i % 4 === 0) {
                fillSounds.push({
                    time,
                    duration: 0.1,
                    instrument: 'snare',
                    velocity: 0.5 * intensity,
                    pattern: 'jump-accent'
                });
            }
        }

        fillSounds.push({
            time: 0.3,
            duration: 0.2,
            instrument: 'kick',
            velocity: 0.8,
            pattern: 'jump-landing'
        });

        this.audioEngine.updateEvents(fillSounds);
        await this.audioEngine.play(fillSounds);
        
        setTimeout(() => {
            this.audioEngine.stop();
        }, 500);
    }

    private calculatePitchForLine(lineNumber: number, event: MusicalEvent): number {
        const baseNote = 60; // Middle C
        const scale = [0, 2, 4, 5, 7, 9, 11]; // Major scale
        
        const relativePosition = (lineNumber - event.startLine) / 
                                (event.endLine - event.startLine + 1);
        const scaleIndex = Math.floor(relativePosition * scale.length);
        const octaveOffset = Math.floor(event.depth / 2);
        
        const midiNote = baseNote + scale[scaleIndex] + (octaveOffset * 12);
        return 440 * Math.pow(2, (midiNote - 69) / 12);
    }

    updateDocument(document: vscode.TextDocument) {
        this.astParser.parse(document).then(events => {
            this.currentEvents = events;
        });
    }
}