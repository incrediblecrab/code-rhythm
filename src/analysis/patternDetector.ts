import { MusicalEvent } from '../types';

export class PatternDetector {
    detectMotifs(events: MusicalEvent[]): Motif[] {
        const motifs: Motif[] = [];
        
        const sequences = this.findSequences(events);
        const variations = this.findVariations(sequences);
        const rhythmicPatterns = this.analyzeRhythmicStructure(events);
        
        for (const seq of sequences) {
            motifs.push({
                type: 'sequence',
                events: seq.events,
                occurrences: seq.count,
                confidence: seq.count / events.length
            });
        }
        
        for (const variation of variations) {
            motifs.push({
                type: 'variation',
                events: variation.events,
                occurrences: variation.instances.length,
                confidence: variation.similarity
            });
        }
        
        return motifs;
    }

    private findSequences(events: MusicalEvent[]): Sequence[] {
        const sequences: Map<string, Sequence> = new Map();
        
        for (let length = 2; length <= Math.min(8, events.length / 2); length++) {
            for (let i = 0; i <= events.length - length; i++) {
                const subSequence = events.slice(i, i + length);
                const hash = this.hashSequence(subSequence);
                
                if (!sequences.has(hash)) {
                    sequences.set(hash, {
                        events: subSequence,
                        positions: [i],
                        count: 1
                    });
                } else {
                    const seq = sequences.get(hash)!;
                    seq.positions.push(i);
                    seq.count++;
                }
            }
        }
        
        return Array.from(sequences.values())
            .filter(seq => seq.count > 1)
            .sort((a, b) => b.count * b.events.length - a.count * a.events.length);
    }

    private findVariations(sequences: Sequence[]): Variation[] {
        const variations: Variation[] = [];
        
        for (let i = 0; i < sequences.length; i++) {
            for (let j = i + 1; j < sequences.length; j++) {
                const similarity = this.calculateSimilarity(sequences[i].events, sequences[j].events);
                
                if (similarity > 0.7 && similarity < 1.0) {
                    variations.push({
                        events: sequences[i].events,
                        instances: [sequences[i].events, sequences[j].events],
                        similarity
                    });
                }
            }
        }
        
        return variations;
    }

    private analyzeRhythmicStructure(events: MusicalEvent[]): RhythmicPattern[] {
        const patterns: RhythmicPattern[] = [];
        const groupedByType = this.groupEventsByType(events);
        
        for (const [type, typeEvents] of groupedByType) {
            const intervals = this.calculateIntervals(typeEvents);
            const regularity = this.measureRegularity(intervals);
            
            if (regularity > 0.6) {
                patterns.push({
                    type,
                    averageInterval: intervals.reduce((a, b) => a + b, 0) / intervals.length,
                    regularity,
                    events: typeEvents
                });
            }
        }
        
        return patterns;
    }

    private hashSequence(events: MusicalEvent[]): string {
        return events.map(e => `${e.type}:${e.depth}:${Math.round(e.complexity * 10)}`).join('|');
    }

    private calculateSimilarity(seq1: MusicalEvent[], seq2: MusicalEvent[]): number {
        if (seq1.length !== seq2.length) {return 0;}
        
        let matches = 0;
        for (let i = 0; i < seq1.length; i++) {
            if (seq1[i].type === seq2[i].type) {
                matches += 0.5;
                if (Math.abs(seq1[i].depth - seq2[i].depth) <= 1) {
                    matches += 0.3;
                }
                if (Math.abs(seq1[i].complexity - seq2[i].complexity) <= 0.2) {
                    matches += 0.2;
                }
            }
        }
        
        return matches / seq1.length;
    }

    private groupEventsByType(events: MusicalEvent[]): Map<MusicalEvent['type'], MusicalEvent[]> {
        const grouped = new Map<MusicalEvent['type'], MusicalEvent[]>();
        
        for (const event of events) {
            if (!grouped.has(event.type)) {
                grouped.set(event.type, []);
            }
            grouped.get(event.type)!.push(event);
        }
        
        return grouped;
    }

    private calculateIntervals(events: MusicalEvent[]): number[] {
        const intervals: number[] = [];
        
        for (let i = 1; i < events.length; i++) {
            intervals.push(events[i].startLine - events[i - 1].startLine);
        }
        
        return intervals;
    }

    private measureRegularity(intervals: number[]): number {
        if (intervals.length < 2) {return 0;}
        
        const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const variance = intervals.reduce((sum, interval) => 
            sum + Math.pow(interval - mean, 2), 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        return Math.max(0, 1 - (stdDev / mean));
    }

    generateMusicalStructure(events: MusicalEvent[], motifs: Motif[]): MusicalStructure {
        const sections = this.identifySections(events);
        const form = this.determineForm(sections);
        const dynamics = this.analyzeDynamics(events);
        
        return {
            intro: sections.find(s => s.type === 'intro'),
            verses: sections.filter(s => s.type === 'verse'),
            choruses: sections.filter(s => s.type === 'chorus'),
            bridge: sections.find(s => s.type === 'bridge'),
            outro: sections.find(s => s.type === 'outro'),
            form,
            dynamics,
            motifs
        };
    }

    private identifySections(events: MusicalEvent[]): Section[] {
        const sections: Section[] = [];
        const classEvents = events.filter(e => e.type === 'class');
        
        if (classEvents.length === 0) {
            return this.identifySectionsByDensity(events);
        }
        
        for (let i = 0; i < classEvents.length; i++) {
            const start = classEvents[i].startLine;
            const end = i < classEvents.length - 1 ? 
                classEvents[i + 1].startLine - 1 : events[events.length - 1].endLine;
            
            const sectionEvents = events.filter(e => 
                e.startLine >= start && e.endLine <= end
            );
            
            sections.push({
                type: this.classifySectionType(sectionEvents, i, classEvents.length),
                startLine: start,
                endLine: end,
                events: sectionEvents
            });
        }
        
        return sections;
    }

    private identifySectionsByDensity(events: MusicalEvent[]): Section[] {
        const sections: Section[] = [];
        const windowSize = 20;
        const densities: number[] = [];
        
        for (let i = 0; i < events.length; i += windowSize) {
            const windowEvents = events.slice(i, i + windowSize);
            densities.push(windowEvents.length);
        }
        
        const avgDensity = densities.reduce((a, b) => a + b, 0) / densities.length;
        
        let currentSection: Section | null = null;
        for (let i = 0; i < densities.length; i++) {
            const density = densities[i];
            const type = density > avgDensity * 1.2 ? 'chorus' : 
                        density < avgDensity * 0.8 ? 'bridge' : 'verse';
            
            if (!currentSection || currentSection.type !== type) {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    type: i === 0 ? 'intro' : type,
                    startLine: i * windowSize,
                    endLine: (i + 1) * windowSize,
                    events: []
                };
            }
        }
        
        if (currentSection) {
            currentSection.type = 'outro';
            sections.push(currentSection);
        }
        
        return sections;
    }

    private classifySectionType(events: MusicalEvent[], index: number, total: number): SectionType {
        if (index === 0) {return 'intro';}
        if (index === total - 1) {return 'outro';}
        
        const functionCount = events.filter(e => e.type === 'function').length;
        const avgComplexity = events.reduce((sum, e) => sum + e.complexity, 0) / events.length;
        
        if (functionCount > events.length * 0.3 && avgComplexity > 0.6) {
            return 'chorus';
        } else if (avgComplexity < 0.3) {
            return 'bridge';
        } else {
            return 'verse';
        }
    }

    private determineForm(sections: Section[]): string {
        const pattern = sections.map(s => s.type[0].toUpperCase()).join('');
        
        if (pattern.match(/I.*V.*C.*V.*C.*O/)) {return 'ABABCB';}
        if (pattern.match(/I.*A.*B.*A/)) {return 'ABA';}
        if (pattern.match(/I.*A.*A.*B.*A/)) {return 'AABA';}
        
        return pattern;
    }

    private analyzeDynamics(events: MusicalEvent[]): DynamicCurve {
        const windowSize = 10;
        const curve: number[] = [];
        
        for (let i = 0; i < events.length; i += windowSize) {
            const window = events.slice(i, i + windowSize);
            const avgComplexity = window.reduce((sum, e) => sum + e.complexity, 0) / window.length;
            curve.push(avgComplexity);
        }
        
        return {
            values: curve,
            peak: Math.max(...curve),
            average: curve.reduce((a, b) => a + b, 0) / curve.length
        };
    }
}

interface Motif {
    type: 'sequence' | 'variation';
    events: MusicalEvent[];
    occurrences: number;
    confidence: number;
}

interface Sequence {
    events: MusicalEvent[];
    positions: number[];
    count: number;
}

interface Variation {
    events: MusicalEvent[];
    instances: MusicalEvent[][];
    similarity: number;
}

interface RhythmicPattern {
    type: MusicalEvent['type'];
    averageInterval: number;
    regularity: number;
    events: MusicalEvent[];
}

interface Section {
    type: SectionType;
    startLine: number;
    endLine: number;
    events: MusicalEvent[];
}

type SectionType = 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro';

interface MusicalStructure {
    intro?: Section;
    verses: Section[];
    choruses: Section[];
    bridge?: Section;
    outro?: Section;
    form: string;
    dynamics: DynamicCurve;
    motifs: Motif[];
}

interface DynamicCurve {
    values: number[];
    peak: number;
    average: number;
}