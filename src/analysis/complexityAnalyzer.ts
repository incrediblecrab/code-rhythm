import { MusicalEvent } from '../types';
import * as vscode from 'vscode';

export class ComplexityAnalyzer {
    analyzeCyclomaticComplexity(events: MusicalEvent[]): number {
        let complexity = 1;
        
        for (const event of events) {
            switch (event.type) {
                case 'conditional':
                    complexity += event.metadata.conditions || 1;
                    break;
                case 'loop':
                    complexity += 1;
                    break;
                case 'function':
                    if (event.metadata.parameters && event.metadata.parameters > 3) {
                        complexity += Math.floor(event.metadata.parameters / 3);
                    }
                    break;
            }
        }
        
        return complexity;
    }

    analyzeNestingDepth(events: MusicalEvent[]): NestingAnalysis {
        const maxDepth = Math.max(...events.map(e => e.depth), 0);
        const avgDepth = events.reduce((sum, e) => sum + e.depth, 0) / events.length;
        
        const depthDistribution = new Map<number, number>();
        for (const event of events) {
            depthDistribution.set(event.depth, (depthDistribution.get(event.depth) || 0) + 1);
        }
        
        return {
            maxDepth,
            avgDepth,
            distribution: depthDistribution,
            deeplyNested: events.filter(e => e.depth > 3)
        };
    }

    analyzeCohesion(events: MusicalEvent[]): CohesionMetrics {
        const functionEvents = events.filter(e => e.type === 'function');
        const variableEvents = events.filter(e => e.type === 'variable');
        
        const functionSizes = functionEvents.map(f => f.endLine - f.startLine + 1);
        const avgFunctionSize = functionSizes.length > 0 ? 
            functionSizes.reduce((a, b) => a + b, 0) / functionSizes.length : 0;
        
        const globalVariables = variableEvents.filter(v => v.metadata.scope === 'global');
        const localVariables = variableEvents.filter(v => v.metadata.scope === 'local');
        
        const cohesionScore = this.calculateCohesionScore(functionEvents, variableEvents);
        
        return {
            avgFunctionSize,
            functionCount: functionEvents.length,
            globalVariableRatio: globalVariables.length / Math.max(variableEvents.length, 1),
            cohesionScore
        };
    }

    analyzeCoupling(document: vscode.TextDocument): CouplingMetrics {
        const text = document.getText();
        
        const imports = this.extractImports(text);
        const exports = this.extractExports(text);
        const dependencies = this.analyzeDependencies(imports);
        
        return {
            importCount: imports.length,
            exportCount: exports.length,
            externalDependencies: dependencies.external,
            internalDependencies: dependencies.internal,
            couplingScore: this.calculateCouplingScore(imports, exports)
        };
    }

    analyzeReadability(document: vscode.TextDocument, events: MusicalEvent[]): ReadabilityMetrics {
        const lines = document.getText().split('\n');
        const nonEmptyLines = lines.filter(line => line.trim().length > 0);
        const commentLines = lines.filter(line => 
            line.trim().startsWith('//') || 
            line.trim().startsWith('/*') || 
            line.trim().startsWith('*')
        );
        
        const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
        const maxLineLength = Math.max(...lines.map(line => line.length));
        
        const identifierLengths = events
            .filter(e => e.metadata.name)
            .map(e => e.metadata.name!.length);
        const avgIdentifierLength = identifierLengths.length > 0 ?
            identifierLengths.reduce((a, b) => a + b, 0) / identifierLengths.length : 0;
        
        return {
            commentRatio: commentLines.length / Math.max(nonEmptyLines.length, 1),
            avgLineLength,
            maxLineLength,
            avgIdentifierLength,
            readabilityScore: this.calculateReadabilityScore(
                avgLineLength, 
                avgIdentifierLength, 
                commentLines.length / nonEmptyLines.length
            )
        };
    }

    private calculateCohesionScore(functions: MusicalEvent[], variables: MusicalEvent[]): number {
        if (functions.length === 0) {return 1;}
        
        let sharedVariableCount = 0;
        for (const variable of variables) {
            const usedInFunctions = functions.filter(f => 
                variable.startLine >= f.startLine && variable.endLine <= f.endLine
            ).length;
            
            if (usedInFunctions > 1) {
                sharedVariableCount++;
            }
        }
        
        return Math.max(0, 1 - (sharedVariableCount / variables.length));
    }

    private extractImports(text: string): string[] {
        const imports: string[] = [];
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
        const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;
        
        let match;
        while ((match = importRegex.exec(text)) !== null) {
            imports.push(match[1]);
        }
        while ((match = requireRegex.exec(text)) !== null) {
            imports.push(match[1]);
        }
        
        return imports;
    }

    private extractExports(text: string): string[] {
        const exports: string[] = [];
        const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+(\w+)/g;
        
        let match;
        while ((match = exportRegex.exec(text)) !== null) {
            exports.push(match[1]);
        }
        
        return exports;
    }

    private analyzeDependencies(imports: string[]): { external: number, internal: number } {
        let external = 0;
        let internal = 0;
        
        for (const imp of imports) {
            if (imp.startsWith('.') || imp.startsWith('/')) {
                internal++;
            } else {
                external++;
            }
        }
        
        return { external, internal };
    }

    private calculateCouplingScore(imports: string[], exports: string[]): number {
        const totalConnections = imports.length + exports.length;
        if (totalConnections === 0) {return 0;}
        
        return Math.min(1, totalConnections / 20);
    }

    private calculateReadabilityScore(avgLineLength: number, avgIdentifierLength: number, commentRatio: number): number {
        const lineLengthScore = Math.max(0, 1 - Math.abs(avgLineLength - 80) / 80);
        const identifierScore = Math.max(0, 1 - Math.abs(avgIdentifierLength - 15) / 15);
        const commentScore = Math.min(1, commentRatio * 5);
        
        return (lineLengthScore + identifierScore + commentScore) / 3;
    }

    generateComplexityReport(
        document: vscode.TextDocument, 
        events: MusicalEvent[]
    ): ComplexityReport {
        return {
            cyclomatic: this.analyzeCyclomaticComplexity(events),
            nesting: this.analyzeNestingDepth(events),
            cohesion: this.analyzeCohesion(events),
            coupling: this.analyzeCoupling(document),
            readability: this.analyzeReadability(document, events),
            overallScore: 0
        };
    }
}

interface NestingAnalysis {
    maxDepth: number;
    avgDepth: number;
    distribution: Map<number, number>;
    deeplyNested: MusicalEvent[];
}

interface CohesionMetrics {
    avgFunctionSize: number;
    functionCount: number;
    globalVariableRatio: number;
    cohesionScore: number;
}

interface CouplingMetrics {
    importCount: number;
    exportCount: number;
    externalDependencies: number;
    internalDependencies: number;
    couplingScore: number;
}

interface ReadabilityMetrics {
    commentRatio: number;
    avgLineLength: number;
    maxLineLength: number;
    avgIdentifierLength: number;
    readabilityScore: number;
}

interface ComplexityReport {
    cyclomatic: number;
    nesting: NestingAnalysis;
    cohesion: CohesionMetrics;
    coupling: CouplingMetrics;
    readability: ReadabilityMetrics;
    overallScore: number;
}