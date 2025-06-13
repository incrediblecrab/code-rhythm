import * as vscode from 'vscode';
import { AudioEngine } from './audio/audioEngine';
import { ASTParser } from './analysis/astParser';
import { SoundMapper } from './mapping/soundMapper';
import { WebviewProvider } from './ui/webviewProvider';
import { StatusBar } from './ui/statusBar';
import { CodeHighlighter } from './features/codeHighlighter';

let audioEngine: AudioEngine;
let astParser: ASTParser;
let soundMapper: SoundMapper;
let webviewProvider: WebviewProvider;
let statusBar: StatusBar;
let codeHighlighter: CodeHighlighter;

export function activate(context: vscode.ExtensionContext) {
    console.log('Code Rhythm extension is now active!');

    audioEngine = new AudioEngine();
    astParser = new ASTParser();
    soundMapper = new SoundMapper();
    statusBar = new StatusBar();
    codeHighlighter = new CodeHighlighter();

    webviewProvider = new WebviewProvider(context, audioEngine, soundMapper);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codeRhythm.controlPanel', webviewProvider)
    );

    const togglePlaybackCommand = vscode.commands.registerCommand('codeRhythm.togglePlayback', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor found');
            return;
        }

        // Check if we have the webview open
        if (!webviewProvider.isReady()) {
            vscode.window.showInformationMessage(
                'Code Rhythm: Opening control panel. Click Play in the panel to start!',
                'Open Panel'
            ).then(selection => {
                if (selection === 'Open Panel') {
                    vscode.commands.executeCommand('codeRhythm.controlPanel.focus');
                }
            });
            return;
        }

        if (audioEngine.isPlaying()) {
            audioEngine.stop();
            statusBar.updateStatus('stopped');
        } else {
            const document = editor.document;
            const events = await astParser.parse(document);
            const soundEvents = soundMapper.mapToSounds(events);
            
            await audioEngine.play(soundEvents);
            statusBar.updateStatus('playing');
        }
    });

    const openPanelCommand = vscode.commands.registerCommand('codeRhythm.openPanel', () => {
        vscode.commands.executeCommand('codeRhythm.controlPanel.focus');
    });

    const changeModeCommand = vscode.commands.registerCommand('codeRhythm.changeMode', async () => {
        const mode = await vscode.window.showQuickPick(['Navigation', 'Overview', 'Diff', 'Focus'], {
            placeHolder: 'Select playback mode'
        });

        if (mode) {
            audioEngine.setMode(mode.toLowerCase());
            vscode.window.showInformationMessage(`Changed to ${mode} mode`);
        }
    });

    context.subscriptions.push(togglePlaybackCommand, openPanelCommand, changeModeCommand);
    context.subscriptions.push(statusBar);

    const onDidChangeActiveEditor = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
        if (editor && audioEngine.isPlaying()) {
            const events = await astParser.parse(editor.document);
            const soundEvents = soundMapper.mapToSounds(events);
            audioEngine.updateEvents(soundEvents);
        }
    });

    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (audioEngine.isPlaying() && event.document === vscode.window.activeTextEditor?.document) {
            const events = await astParser.parse(event.document);
            const soundEvents = soundMapper.mapToSounds(events);
            audioEngine.updateEvents(soundEvents);
        }
    });

    context.subscriptions.push(onDidChangeActiveEditor, onDidChangeTextDocument);
}

export function deactivate() {
    if (audioEngine) {
        audioEngine.dispose();
    }
}