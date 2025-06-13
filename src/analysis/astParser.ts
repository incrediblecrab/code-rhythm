import * as vscode from 'vscode';
import { MusicalEvent } from '../types';

export class ASTParser {
    private cache = new Map<string, { events: MusicalEvent[], version: number }>();

    async parse(document: vscode.TextDocument): Promise<MusicalEvent[]> {
        const cacheKey = document.uri.toString();
        const cachedData = this.cache.get(cacheKey);
        
        if (cachedData && cachedData.version === document.version) {
            return cachedData.events;
        }

        const events: MusicalEvent[] = [];
        
        try {
            const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
                'vscode.executeDocumentSymbolProvider',
                document.uri
            );

            if (symbols && symbols.length > 0) {
                this.parseSymbols(symbols, events, 0);
            } else {
                this.fallbackParse(document, events);
            }
        } catch (error) {
            console.warn('Symbol provider failed, using fallback parser:', error);
            this.fallbackParse(document, events);
        }

        this.analyzeComplexity(document, events);
        
        this.cache.set(cacheKey, { events, version: document.version });
        
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        return events;
    }

    private parseSymbols(symbols: vscode.DocumentSymbol[], events: MusicalEvent[], depth: number) {
        for (const symbol of symbols) {
            const event = this.symbolToEvent(symbol, depth);
            if (event) {
                events.push(event);
            }

            if (symbol.children && symbol.children.length > 0) {
                this.parseSymbols(symbol.children, events, depth + 1);
            }
        }
    }

    private symbolToEvent(symbol: vscode.DocumentSymbol, depth: number): MusicalEvent | null {
        let type: MusicalEvent['type'] | null = null;
        const metadata: MusicalEvent['metadata'] = { name: symbol.name };

        switch (symbol.kind) {
            case vscode.SymbolKind.Function:
            case vscode.SymbolKind.Method:
                type = 'function';
                metadata.parameters = this.countParameters(symbol.name);
                break;
            case vscode.SymbolKind.Class:
                type = 'class';
                break;
            case vscode.SymbolKind.Variable:
            case vscode.SymbolKind.Constant:
            case vscode.SymbolKind.Property:
                type = 'variable';
                metadata.scope = depth === 0 ? 'global' : 'local';
                break;
        }

        if (!type) {return null;}

        return {
            type,
            startLine: symbol.range.start.line,
            endLine: symbol.range.end.line,
            depth,
            complexity: 0,
            metadata
        };
    }

    private fallbackParse(document: vscode.TextDocument, events: MusicalEvent[]) {
        const text = document.getText();
        const lines = text.split('\n');

        const functionPattern = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function))/g;
        const classPattern = /class\s+(\w+)/g;
        const loopPattern = /(?:for|while|do)\s*\(/g;
        const conditionalPattern = /(?:if|else\s*if|switch)\s*\(/g;
        const variablePattern = /(?:const|let|var)\s+(\w+)/g;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const depth = this.getIndentationDepth(line);

            let match;
            
            while ((match = functionPattern.exec(line)) !== null) {
                events.push({
                    type: 'function',
                    startLine: i,
                    endLine: i,
                    depth,
                    complexity: 0,
                    metadata: { name: match[1] || match[2], parameters: 0 }
                });
            }

            while ((match = classPattern.exec(line)) !== null) {
                events.push({
                    type: 'class',
                    startLine: i,
                    endLine: i,
                    depth,
                    complexity: 0,
                    metadata: { name: match[1] }
                });
            }

            while ((match = loopPattern.exec(line)) !== null) {
                events.push({
                    type: 'loop',
                    startLine: i,
                    endLine: i,
                    depth,
                    complexity: 0,
                    metadata: {}
                });
            }

            while ((match = conditionalPattern.exec(line)) !== null) {
                events.push({
                    type: 'conditional',
                    startLine: i,
                    endLine: i,
                    depth,
                    complexity: 0,
                    metadata: { conditions: 1 }
                });
            }

            while ((match = variablePattern.exec(line)) !== null) {
                events.push({
                    type: 'variable',
                    startLine: i,
                    endLine: i,
                    depth,
                    complexity: 0,
                    metadata: { 
                        name: match[1], 
                        scope: depth === 0 ? 'global' : 'local' 
                    }
                });
            }

            if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
                events.push({
                    type: 'comment',
                    startLine: i,
                    endLine: i,
                    depth,
                    complexity: 0,
                    metadata: {}
                });
            }
        }
    }

    private analyzeComplexity(document: vscode.TextDocument, events: MusicalEvent[]) {
        for (const event of events) {
            const lineCount = event.endLine - event.startLine + 1;
            const nestingPenalty = event.depth * 0.1;
            
            let baseComplexity = 0;
            
            switch (event.type) {
                case 'function':
                    baseComplexity = Math.min(1, lineCount / 50 + (event.metadata.parameters || 0) * 0.05);
                    break;
                case 'loop':
                    baseComplexity = 0.7 + Math.min(0.3, lineCount / 20);
                    break;
                case 'conditional':
                    baseComplexity = 0.5 + (event.metadata.conditions || 1) * 0.1;
                    break;
                case 'class':
                    baseComplexity = Math.min(1, lineCount / 100);
                    break;
                case 'variable':
                    baseComplexity = 0.2;
                    break;
                case 'comment':
                    baseComplexity = 0;
                    break;
            }
            
            event.complexity = Math.min(1, baseComplexity + nestingPenalty);
        }
    }

    private getIndentationDepth(line: string): number {
        const match = line.match(/^(\s*)/);
        if (!match) {return 0;}
        
        const spaces = match[1].length;
        return Math.floor(spaces / 2);
    }

    private countParameters(functionName: string): number {
        const match = functionName.match(/\(([^)]*)\)/);
        if (!match || !match[1]) {return 0;}
        
        const params = match[1].split(',').filter(p => p.trim().length > 0);
        return params.length;
    }

    detectPatterns(events: MusicalEvent[]): Map<string, MusicalEvent[][]> {
        const patterns = new Map<string, MusicalEvent[][]>();
        const windowSize = 5;
        
        for (let i = 0; i < events.length - windowSize; i++) {
            const window = events.slice(i, i + windowSize);
            const signature = this.getPatternSignature(window);
            
            if (!patterns.has(signature)) {
                patterns.set(signature, []);
            }
            patterns.get(signature)!.push(window);
        }
        
        const repeatedPatterns = new Map<string, MusicalEvent[][]>();
        for (const [signature, instances] of patterns) {
            if (instances.length > 1) {
                repeatedPatterns.set(signature, instances);
            }
        }
        
        return repeatedPatterns;
    }

    private getPatternSignature(events: MusicalEvent[]): string {
        return events.map(e => `${e.type}:${e.depth}`).join('|');
    }
}