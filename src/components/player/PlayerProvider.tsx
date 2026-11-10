"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { PitchShifter as PitchShifterT } from "soundtouchjs";
import type { ChordSegment, LyricLine } from "@/lib/types";
import { decodeAudio, decryptJson, decryptMedia } from "@/lib/client/decrypt";
import { getEncryptedFile, LoginRequiredError, resolveManifest } from "@/lib/client/offline";
import { setResume } from "@/lib/client/prefs";

export interface QueueItem {
  songId: number;
  title: string;
  artist: string;
  artistSlug?: string;
  url?: string;
}

type Status = "idle" | "loading" | "playing" | "paused" | "error" | "login";

interface PlayerState {
  current: QueueItem | null;
  queue: QueueItem[];
  index: number;
  status: Status;
  error: string | null;
  time: number;
  duration: number;
  pitch: number;
  keyName: string | null;
  lyrics: LyricLine[];
  chords: ChordSegment[];
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  play: (item: QueueItem, opts?: { queue?: QueueItem[]; startAt?: number }) => Promise<void>;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  seek: (ratio: number) => void;
  setPitch: (semitones: number) => void;
}

const PlayerCtx = createContext<PlayerState | null>(null);

export function usePlayer() {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer hors de <PlayerProvider>");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioCtx = useRef<AudioContext | null>(null);
  const gain = useRef<GainNode | null>(null);
  const shifter = useRef<PitchShifterT | null>(null);
  const loadToken = useRef(0);
  const pitchRef = useRef(0);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(-1);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pitch, setPitchState] = useState(0);
  const [keyName, setKeyName] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [chords, setChords] = useState<ChordSegment[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [ended, setEnded] = useState(0);

  const current = index >= 0 ? queue[index] ?? null : null;

  const stopCurrent = useCallback(() => {
    const s = shifter.current;
    if (s) {
      s.off();
      s.disconnect();
    }
    shifter.current = null;
  }, []);

  useEffect(() => stopCurrent, [stopCurrent]);

  // Mémorise la position pour la carte « Reprendre » (toutes les ~5 s).
  const lastSaved = useRef(0);
  useEffect(() => {
    if (!current || !duration || Math.abs(time - lastSaved.current) < 5) return;
    lastSaved.current = time;
    setResume({ item: current, time, duration });
  }, [current, time, duration]);

  const load = useCallback(
    async (item: QueueItem, startAt = 0) => {
      const token = ++loadToken.current;
      stopCurrent();
      setStatus("loading");
      setError(null);
      setTime(0);
      setDuration(0);
      setLyrics([]);
      setChords([]);
      lastSaved.current = 0;

      try {
        audioCtx.current ??= new AudioContext();
        if (audioCtx.current.state === "suspended") await audioCtx.current.resume();
        if (!gain.current) {
          gain.current = audioCtx.current.createGain();
          gain.current.connect(audioCtx.current.destination);
        }

        const manifest = await resolveManifest(item.songId);
        const { audio, lyrics: lf, chord } = manifest.files;
        if (!audio) throw new Error("Pas d'audio pour ce titre.");

        const [audioBuf, lyr, chd] = await Promise.all([
          getEncryptedFile(audio.src).then((b) => decryptMedia(b, audio.key)),
          lf ? getEncryptedFile(lf.src).then((b) => decryptJson<LyricLine[]>(b, lf.key)) : [],
          chord ? getEncryptedFile(chord.src).then((b) => decryptJson<ChordSegment[]>(b, chord.key)) : [],
        ]);
        if (token !== loadToken.current) return;

        const decoded = await decodeAudio(audioCtx.current, audioBuf);
        if (token !== loadToken.current) return;

        const { PitchShifter } = await import("soundtouchjs");
        const s = new PitchShifter(audioCtx.current, decoded, 16384, () => {
          if (shifter.current !== s) return;
          setStatus("paused");
          setEnded(token); // l'effet plus bas enchaîne sur le titre suivant
        });
        s.pitchSemitones = pitchRef.current;
        s.on("play", (d) => {
          if (shifter.current === s) setTime(d.timePlayed);
        });
        shifter.current = s;
        setLyrics(lyr);
        setChords(chd);
        setKeyName(manifest.keyName);
        setDuration(s.duration);
        if (startAt > 0 && startAt < s.duration - 2) s.percentagePlayed = startAt / s.duration;
        s.connect(gain.current);
        setStatus("playing");
      } catch (e) {
        if (token !== loadToken.current) return;
        if (e instanceof LoginRequiredError) setStatus("login");
        else {
          setStatus("error");
          setError(navigator.onLine ? "Lecture impossible." : "Hors ligne : ce titre n'est pas téléchargé.");
          console.error(e);
        }
      }
    },
    [stopCurrent],
  );

  // Enchaînement automatique à la fin d'un titre.
  useEffect(() => {
    if (!ended || ended !== loadToken.current) return;
    if (index < queue.length - 1) {
      setIndex(index + 1);
      void load(queue[index + 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended]);

  const play = useCallback(
    async (item: QueueItem, opts?: { queue?: QueueItem[]; startAt?: number }) => {
      const q = opts?.queue?.length ? opts.queue : [item];
      const i = Math.max(0, q.findIndex((x) => x.songId === item.songId));
      setQueue(q);
      setIndex(i);
      await load(q[i], opts?.startAt);
    },
    [load],
  );

  const toggle = useCallback(() => {
    const s = shifter.current;
    if (!s || !gain.current) return;
    if (status === "playing") {
      s.disconnect();
      setStatus("paused");
    } else {
      void audioCtx.current?.resume();
      s.connect(gain.current);
      setStatus("playing");
    }
  }, [status]);

  const stop = useCallback(() => {
    const s = shifter.current;
    if (!s) return;
    s.disconnect();
    s.percentagePlayed = 0;
    setTime(0);
    setStatus("paused");
  }, []);

  const go = useCallback(
    (delta: number) => {
      const i = index + delta;
      if (i < 0 || i >= queue.length) return;
      setIndex(i);
      void load(queue[i]);
    },
    [index, queue, load],
  );

  const seek = useCallback((ratio: number) => {
    const s = shifter.current;
    if (!s) return;
    s.percentagePlayed = Math.min(1, Math.max(0, ratio));
    setTime(s.duration * ratio);
  }, []);

  const setPitch = useCallback((semitones: number) => {
    const v = Math.max(-6, Math.min(6, semitones));
    pitchRef.current = v;
    setPitchState(v);
    if (shifter.current) shifter.current.pitchSemitones = v;
  }, []);

  return (
    <PlayerCtx.Provider
      value={{
        current,
        queue,
        index,
        status,
        error,
        time,
        duration,
        pitch,
        keyName,
        lyrics,
        chords,
        expanded,
        setExpanded,
        play,
        toggle,
        stop,
        next: () => go(1),
        prev: () => go(-1),
        seek,
        setPitch,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}
