export interface MusicalEvent {
    type: 'function' | 'loop' | 'conditional' | 'variable' | 'class' | 'comment';
    startLine: number;
    endLine: number;
    depth: number;
    complexity: number;
    metadata: {
        name?: string;
        parameters?: number;
        conditions?: number;
        iterations?: number;
        scope?: 'global' | 'local' | 'block';
    };
}

export interface SoundEvent {
    time: number;
    duration: number;
    instrument: 'kick' | 'snare' | 'hihat' | 'synth';
    pitch?: number;
    velocity: number;
    pattern?: string;
}

export interface AudioConfig {
    tempo: number;
    genre: 'Electronic' | 'Jazz' | 'Ambient' | 'Classical';
    volume: number;
    swing: number;
}

export interface SoundMapping {
    function: {
        instrument: 'kick';
        pitchRange: [number, number];
        dynamics: (params: number) => number;
        duration: (lines: number) => number;
    };
    loop: {
        instrument: 'hihat';
        rate: (depth: number) => number;
        velocity: (iterations: number) => number;
    };
    conditional: {
        instrument: 'snare';
        pitch: (complexity: number) => number;
        pattern: 'if' | 'else' | 'switch';
    };
    variable: {
        instrument: 'synth';
        note: (name: string) => number;
        octave: (scope: 'global' | 'local' | 'block') => number;
    };
}