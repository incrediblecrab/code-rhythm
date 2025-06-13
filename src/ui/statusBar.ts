import * as vscode from 'vscode';

export class StatusBar {
    private statusBarItem: vscode.StatusBarItem;
    private playState: 'playing' | 'stopped' = 'stopped';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        
        this.statusBarItem.command = 'codeRhythm.togglePlayback';
        this.updateStatus('stopped');
        this.statusBarItem.show();
    }

    updateStatus(state: 'playing' | 'stopped') {
        this.playState = state;
        
        if (state === 'playing') {
            this.statusBarItem.text = '$(debug-pause) Code Rhythm';
            this.statusBarItem.tooltip = 'Click to pause Code Rhythm';
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        } else {
            this.statusBarItem.text = '$(play) Code Rhythm';
            this.statusBarItem.tooltip = 'Click to play Code Rhythm';
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    updateTempo(bpm: number) {
        const icon = this.playState === 'playing' ? '$(debug-pause)' : '$(play)';
        this.statusBarItem.text = `${icon} Code Rhythm (${bpm} BPM)`;
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}