import * as vscode from 'vscode';
import { SoundEvent } from '../types';

export class CodeHighlighter {
    private decorationType: vscode.TextEditorDecorationType;
    private currentEditor: vscode.TextEditor | undefined;
    private highlightTimer: NodeJS.Timer | null = null;
    private eventQueue: { event: SoundEvent, time: number }[] = [];

    constructor() {
        // Create decoration type with a pulsing background
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'rgba(0, 255, 0, 0.5)',
            isWholeLine: true,
            overviewRulerColor: 'rgba(0, 255, 0, 0.8)',
            overviewRulerLane: vscode.OverviewRulerLane.Full
        });
    }

    startHighlighting(editor: vscode.TextEditor, events: SoundEvent[]) {
        this.currentEditor = editor;
        this.eventQueue = [];

        // Convert events to queue with absolute times
        const startTime = Date.now();
        events.forEach(event => {
            this.eventQueue.push({
                event,
                time: startTime + event.time * 1000 // Convert to milliseconds
            });
        });

        // Sort by time
        this.eventQueue.sort((a, b) => a.time - b.time);

        // Start highlighting
        this.scheduleNextHighlight();
    }

    private scheduleNextHighlight() {
        if (this.eventQueue.length === 0 || !this.currentEditor) {
            this.stop();
            return;
        }

        const next = this.eventQueue[0];
        const now = Date.now();
        const delay = Math.max(0, next.time - now);

        this.highlightTimer = setTimeout(() => {
            this.highlightEvent(next.event);
            this.eventQueue.shift();
            this.scheduleNextHighlight();
        }, delay);
    }

    private highlightEvent(event: SoundEvent) {
        if (!this.currentEditor) {return;}

        // Get line number from event - try different patterns
        let lineNumber: number | null = null;
        
        // Try to extract line number from pattern
        if (event.pattern) {
            const lineMatch = event.pattern.match(/line-(\d+)/);
            if (lineMatch) {
                lineNumber = parseInt(lineMatch[1]);
            }
        }
        
        // If no line number found, calculate from time
        if (lineNumber === null) {
            // Assuming time maps to line number (simplified)
            lineNumber = Math.floor(event.time * 4); // 4 lines per beat
        }

        const range = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber, Number.MAX_VALUE)
        );

        // Apply decoration
        this.currentEditor.setDecorations(this.decorationType, [range]);

        // Remove decoration after the event duration
        const duration = Math.max(200, event.duration * 1000);
        setTimeout(() => {
            if (this.currentEditor) {
                this.currentEditor.setDecorations(this.decorationType, []);
            }
        }, duration);

        // Reveal the line if it's not visible
        this.currentEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }

    stop() {
        if (this.highlightTimer) {
            clearTimeout(this.highlightTimer);
            this.highlightTimer = null;
        }

        if (this.currentEditor) {
            this.currentEditor.setDecorations(this.decorationType, []);
        }

        this.eventQueue = [];
    }

    dispose() {
        this.stop();
        this.decorationType.dispose();
    }
}