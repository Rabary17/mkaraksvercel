/** Format des fichiers chiffrés : [IV 12 octets][ciphertext AES-256-GCM + tag 16 octets]. */
export async function decryptMedia(data: ArrayBuffer, keyB64: string): Promise<ArrayBuffer> {
  const raw = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const bytes = new Uint8Array(data);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, key, bytes.slice(12));
}

/** Paroles et accords : gzip (nouveau format) ou JSON brut (ancien), détecté automatiquement. */
export async function decryptJson<T>(data: ArrayBuffer, keyB64: string): Promise<T> {
  const plain = await decryptMedia(data, keyB64);
  const head = new Uint8Array(plain, 0, 2);
  let text: string;
  if (head[0] === 0x1f && head[1] === 0x8b) {
    const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"));
    text = await new Response(stream).text();
  } else {
    text = new TextDecoder().decode(plain);
  }
  return JSON.parse(text) as T;
}

/** Le navigateur sait-il lire l'Opus tout seul ? (faux sur les anciens iPhone) */
export function hasNativeOpus() {
  try {
    return new Audio().canPlayType('audio/ogg; codecs="opus"') !== "";
  } catch {
    return false;
  }
}

/**
 * À appeler avant un téléchargement hors ligne : si l'Opus n'est pas lu nativement,
 * on charge le décodeur WebAssembly (≈ 4 Mo) pour que le service worker le mette en cache.
 * Sans ça, un titre téléchargé ne pourrait pas être décodé une fois hors ligne.
 */
export async function ensureOfflineDecoder() {
  if (hasNativeOpus()) return;
  await import("ogg-opus-decoder");
}

/**
 * Décode l'audio en AudioBuffer.
 * 1. décodeur natif du navigateur (Opus OK sur Chrome, Firefox, Android, Safari récent)
 * 2. si échec et fichier Ogg/Opus : décodeur WebAssembly (anciens iPhone), chargé à la demande
 */
export async function decodeAudio(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  try {
    return await ctx.decodeAudioData(data.slice(0)); // copie : decodeAudioData détache le buffer
  } catch (nativeError) {
    const b = new Uint8Array(data, 0, 4);
    const isOgg = b[0] === 0x4f && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53; // "OggS"
    if (!isOgg) throw nativeError;

    const { OggOpusDecoder } = await import("ogg-opus-decoder");
    const decoder = new OggOpusDecoder();
    try {
      await decoder.ready;
      const { channelData, samplesDecoded, sampleRate } = await decoder.decodeFile(new Uint8Array(data));
      const buf = ctx.createBuffer(channelData.length, samplesDecoded, sampleRate);
      channelData.forEach((ch, i) => buf.copyToChannel(new Float32Array(ch), i));
      return buf;
    } finally {
      decoder.free();
    }
  }
}
