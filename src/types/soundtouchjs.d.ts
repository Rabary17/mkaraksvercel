declare module "soundtouchjs" {
  export interface PlayDetail {
    timePlayed: number;
    formattedTimePlayed: string;
    percentagePlayed: number;
  }
  export class PitchShifter {
    constructor(context: AudioContext, buffer: AudioBuffer, bufferSize: number, onEnd?: () => void);
    pitchSemitones: number;
    tempo: number;
    percentagePlayed: number;
    readonly duration: number;
    readonly formattedDuration: string;
    readonly timePlayed: number;
    connect(node: AudioNode): void;
    disconnect(): void;
    on(event: "play", cb: (detail: PlayDetail) => void): void;
    off(event?: "play"): void;
  }
}
