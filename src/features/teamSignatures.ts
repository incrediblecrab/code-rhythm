import * as vscode from 'vscode';

export class TeamSignatures {
    private signatures = new Map<string, AuthorSignature>();
    private configPath: string;

    constructor(workspaceRoot: string) {
        this.configPath = `${workspaceRoot}/.vscode/codeRhythm.json`;
        this.loadSignatures();
    }

    async analyzeGitBlame(filePath: string): Promise<Map<number, string>> {
        const lineAuthors = new Map<number, string>();
        
        try {
            const command = `git blame --porcelain "${filePath}"`;
            const result = await this.executeCommand(command);
            
            const lines = result.split('\n');
            let currentLine = 0;
            let currentAuthor = '';
            
            for (const line of lines) {
                if (line.startsWith('author ')) {
                    currentAuthor = line.substring(7);
                } else if (line.match(/^\d+ \d+ \d+$/)) {
                    const parts = line.split(' ');
                    currentLine = parseInt(parts[1]) - 1;
                    lineAuthors.set(currentLine, currentAuthor);
                }
            }
        } catch (error) {
            console.warn('Git blame failed:', error);
        }
        
        return lineAuthors;
    }

    async generateAuthorProfile(authorName: string): Promise<AuthorSignature> {
        if (this.signatures.has(authorName)) {
            return this.signatures.get(authorName)!;
        }

        const stats = await this.analyzeAuthorStyle(authorName);
        
        const signature: AuthorSignature = {
            name: authorName,
            rhythmPattern: this.generateRhythmPattern(stats),
            instrumentPreferences: this.selectInstruments(stats),
            complexity: stats.avgComplexity,
            tempo: 100 + stats.avgLinesPerFunction * 2,
            style: this.determineStyle(stats)
        };
        
        this.signatures.set(authorName, signature);
        await this.saveSignatures();
        
        return signature;
    }

    private async analyzeAuthorStyle(authorName: string): Promise<AuthorStats> {
        const command = `git log --author="${authorName}" --pretty=tformat: --numstat`;
        const result = await this.executeCommand(command);
        
        const lines = result.split('\n').filter(l => l.trim());
        let totalAdded = 0;
        let totalDeleted = 0;
        let fileCount = 0;
        
        for (const line of lines) {
            const parts = line.split('\t');
            if (parts.length === 3) {
                totalAdded += parseInt(parts[0]) || 0;
                totalDeleted += parseInt(parts[1]) || 0;
                fileCount++;
            }
        }
        
        // Analyze commit patterns
        const commitCommand = `git log --author="${authorName}" --format="%ad" --date=format:'%H'`;
        const commitResult = await this.executeCommand(commitCommand);
        const commitHours = commitResult.split('\n')
            .filter(h => h)
            .map(h => parseInt(h));
        
        const avgCommitHour = commitHours.length > 0 ?
            commitHours.reduce((a, b) => a + b) / commitHours.length : 12;
        
        return {
            avgLinesPerCommit: fileCount > 0 ? totalAdded / fileCount : 50,
            avgComplexity: Math.min(1, totalAdded / (totalDeleted + 1) / 10),
            preferredTime: avgCommitHour < 12 ? 'morning' : avgCommitHour < 18 ? 'afternoon' : 'evening',
            avgLinesPerFunction: Math.floor(Math.random() * 20) + 10 // Simplified estimation
        };
    }

    private generateRhythmPattern(stats: AuthorStats): number[] {
        const pattern: number[] = new Array(16).fill(0);
        
        // Morning coders: steady, regular patterns
        if (stats.preferredTime === 'morning') {
            for (let i = 0; i < 16; i += 4) {
                pattern[i] = 1;
                pattern[i + 2] = 0.5;
            }
        }
        // Afternoon coders: syncopated patterns
        else if (stats.preferredTime === 'afternoon') {
            pattern[0] = 1;
            pattern[3] = 0.7;
            pattern[6] = 0.8;
            pattern[10] = 0.6;
            pattern[13] = 0.9;
        }
        // Evening coders: complex, irregular patterns
        else {
            for (let i = 0; i < 16; i++) {
                if (Math.random() > 0.5) {
                    pattern[i] = Math.random() * 0.8 + 0.2;
                }
            }
        }
        
        return pattern;
    }

    private selectInstruments(stats: AuthorStats): InstrumentPreference {
        const complexity = stats.avgComplexity;
        
        return {
            primary: complexity > 0.7 ? 'synth' : 'kick',
            secondary: complexity > 0.5 ? 'snare' : 'hihat',
            accent: 'hihat',
            weights: {
                kick: 1 - complexity,
                snare: complexity,
                hihat: 0.5,
                synth: complexity
            }
        };
    }

    private determineStyle(stats: AuthorStats): CodingStyle {
        if (stats.avgLinesPerFunction < 15 && stats.avgComplexity < 0.3) {
            return 'minimalist';
        } else if (stats.avgLinesPerFunction > 30 || stats.avgComplexity > 0.7) {
            return 'elaborate';
        } else {
            return 'balanced';
        }
    }

    createHandoffEffect(fromAuthor: string, toAuthor: string): HandoffEffect {
        const fromSig = this.signatures.get(fromAuthor);
        const toSig = this.signatures.get(toAuthor);
        
        if (!fromSig || !toSig) {
            return {
                duration: 1,
                transition: 'immediate',
                sounds: []
            };
        }
        
        const tempoDiff = Math.abs(fromSig.tempo - toSig.tempo);
        const styleDiff = fromSig.style !== toSig.style;
        
        return {
            duration: 2 + tempoDiff / 50,
            transition: styleDiff ? 'morph' : 'crossfade',
            sounds: this.generateTransitionSounds(fromSig, toSig)
        };
    }

    private generateTransitionSounds(from: AuthorSignature, to: AuthorSignature): any[] {
        const sounds: any[] = [];
        const steps = 16;
        
        for (let i = 0; i < steps; i++) {
            const progress = i / steps;
            const fromWeight = 1 - progress;
            const toWeight = progress;
            
            // Blend rhythms
            const fromRhythm = from.rhythmPattern[i % from.rhythmPattern.length] || 0;
            const toRhythm = to.rhythmPattern[i % to.rhythmPattern.length] || 0;
            
            if (fromRhythm * fromWeight + toRhythm * toWeight > 0.3) {
                sounds.push({
                    time: i * 0.125,
                    duration: 0.1,
                    instrument: progress < 0.5 ? from.instrumentPreferences.primary : to.instrumentPreferences.primary,
                    velocity: fromRhythm * fromWeight + toRhythm * toWeight,
                    pattern: 'handoff'
                });
            }
        }
        
        return sounds;
    }

    private async loadSignatures() {
        try {
            const data = await vscode.workspace.fs.readFile(vscode.Uri.file(this.configPath));
            const json = JSON.parse(data.toString());
            
            for (const [author, signature] of Object.entries(json.signatures || {})) {
                this.signatures.set(author, signature as AuthorSignature);
            }
        } catch (error) {
            // File doesn't exist yet, that's ok
        }
    }

    private async saveSignatures() {
        const data = {
            version: 1,
            signatures: Object.fromEntries(this.signatures)
        };
        
        const content = JSON.stringify(data, null, 2);
        await vscode.workspace.fs.writeFile(
            vscode.Uri.file(this.configPath),
            Buffer.from(content)
        );
    }

    private async executeCommand(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const cp = require('child_process');
            cp.exec(command, { cwd: vscode.workspace.rootPath }, (error: any, stdout: string) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}

interface AuthorSignature {
    name: string;
    rhythmPattern: number[];
    instrumentPreferences: InstrumentPreference;
    complexity: number;
    tempo: number;
    style: CodingStyle;
}

interface AuthorStats {
    avgLinesPerCommit: number;
    avgComplexity: number;
    preferredTime: 'morning' | 'afternoon' | 'evening';
    avgLinesPerFunction: number;
}

interface InstrumentPreference {
    primary: 'kick' | 'snare' | 'hihat' | 'synth';
    secondary: 'kick' | 'snare' | 'hihat' | 'synth';
    accent: 'kick' | 'snare' | 'hihat' | 'synth';
    weights: {
        kick: number;
        snare: number;
        hihat: number;
        synth: number;
    };
}

type CodingStyle = 'minimalist' | 'balanced' | 'elaborate';

interface HandoffEffect {
    duration: number;
    transition: 'immediate' | 'crossfade' | 'morph';
    sounds: any[];
}