#!/usr/bin/env node
/**
 * Prépare une fois pour toutes les fichiers du bucket pour le nouveau site :
 *   file/<chemin>  (en clair, existant)  →  enc/<chemin>.enc  (AES-256-GCM)
 *
 * Avant chiffrement :
 *   - audio (.mp3…) → réencodé en Opus 48 kbit/s (Ogg) : ~-60 % de taille
 *   - lyrics.json   → champs inutiles retirés + gzip
 *   - chord.json    → seulement start/end/chord_majmin + gzip
 *
 * Les originaux ne sont PAS modifiés ni supprimés. Le script peut être relancé :
 * les fichiers déjà traités sont sautés (sauf --force).
 *
 * Usage :
 *   GOOGLE_APPLICATION_CREDENTIALS=./admin-key.json \
 *   MEDIA_MASTER_KEY=<base64 32 octets> \
 *   node scripts/encrypt-bucket.mjs [--bucket mkaraksbucket] [--src file/] [--dest enc/] [--only "rossy/"]
 *                                   [--bitrate 48k] [--dry-run] [--force] [--concurrency 4]
 *
 * Test local sans bucket (écrit les résultats dans un dossier) :
 *   node scripts/encrypt-bucket.mjs --local-in ./echantillons --local-out ./sortie
 *
 * Le compte utilisé ici doit pouvoir LIRE et ÉCRIRE dans le bucket (ce n'est pas le compte de Vercel,
 * qui lui n'a que la lecture).
 */
import { createCipheriv, hkdfSync, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import ffmpegPath from "ffmpeg-static";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--")) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return acc;
  }, []),
);

const BUCKET = args.bucket || "mkaraksbucket";
const SRC = args.src || "file/";
const DEST = args.dest || "enc/";
const ONLY = typeof args.only === "string" ? args.only : "";
const BITRATE = typeof args.bitrate === "string" ? args.bitrate : "48k";
const DRY = !!args["dry-run"];
const FORCE = !!args.force;
const CONCURRENCY = Number(args.concurrency || 4); // ffmpeg est gourmand : 4 par défaut
const LOCAL_IN = typeof args["local-in"] === "string" ? args["local-in"] : null;
const LOCAL_OUT = typeof args["local-out"] === "string" ? args["local-out"] : null;

const master = Buffer.from(process.env.MEDIA_MASTER_KEY || "", "base64");
if (master.length !== 32) {
  console.error("MEDIA_MASTER_KEY manquante ou invalide (32 octets en base64).");
  process.exit(1);
}

/** DOIT rester identique à deriveFileKey() dans src/lib/media-keys.ts */
const deriveKey = (objectPath) => Buffer.from(hkdfSync("sha256", master, "mkaraks-media-v1", objectPath, 32));

function encrypt(plain, key) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  return Buffer.concat([iv, c.update(plain), c.final(), c.getAuthTag()]);
}

/* ---------------------------------------------------------------- */
/* Transformations                                                   */
/* ---------------------------------------------------------------- */

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|flac)$/i;

/** MP3 → Ogg Opus. Stéréo, métadonnées retirées, mode "audio" (musique). */
function toOpus(input) {
  return new Promise((resolve, reject) => {
    const ff = spawn(
      ffmpegPath,
      ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vn", "-map_metadata", "-1",
       "-c:a", "libopus", "-b:a", BITRATE, "-vbr", "on", "-application", "audio", "-ac", "2", "-f", "ogg", "pipe:1"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    const out = [];
    let err = "";
    ff.stdout.on("data", (d) => out.push(d));
    ff.stderr.on("data", (d) => (err += d));
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`ffmpeg ${code}: ${err.trim()}`))));
    ff.stdin.on("error", () => {}); // ffmpeg peut fermer l'entrée avant la fin en cas d'erreur
    ff.stdin.end(input);
  });
}

/** Ne garde que ce que le lecteur utilise (voir src/lib/types.ts). */
function slimLyrics(json) {
  return json.map((l) => ({
    start: l.start,
    end: l.end,
    text: l.text,
    words: (l.words || []).map((w) => ({ word: w.word, start: w.start, end: w.end })),
  }));
}
function slimChords(json) {
  return json.map((c) => ({ start: c.start, end: c.end, chord_majmin: c.chord_majmin }));
}

async function transform(rel, data) {
  if (AUDIO_EXT.test(rel)) return { body: await toOpus(data), kind: "opus" };
  if (/\.json$/i.test(rel)) {
    const json = JSON.parse(data.toString("utf8"));
    const slim = /chord/i.test(path.basename(rel)) ? slimChords(json) : /lyric/i.test(path.basename(rel)) ? slimLyrics(json) : json;
    return { body: gzipSync(Buffer.from(JSON.stringify(slim)), { level: 9 }), kind: "json.gz" };
  }
  return { body: data, kind: "raw" };
}

/* ---------------------------------------------------------------- */
/* Sources : bucket GCS ou dossier local (test)                      */
/* ---------------------------------------------------------------- */

async function listLocal(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listLocal(p, base)));
    else out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

let io;
if (LOCAL_IN) {
  if (!LOCAL_OUT) throw new Error("--local-out requis avec --local-in");
  io = {
    list: async () => (await listLocal(LOCAL_IN)).filter((r) => r.startsWith(ONLY)),
    read: (rel) => readFile(path.join(LOCAL_IN, rel)),
    exists: async (rel) => !!(await stat(path.join(LOCAL_OUT, `${rel}.enc`)).catch(() => null)),
    write: async (rel, buf) => {
      const p = path.join(LOCAL_OUT, `${rel}.enc`);
      await mkdir(path.dirname(p), { recursive: true });
      await writeFile(p, buf);
    },
  };
} else {
  const { Storage } = await import("@google-cloud/storage");
  const bucket = new Storage().bucket(BUCKET);
  io = {
    list: async () => {
      const [files] = await bucket.getFiles({ prefix: SRC + ONLY });
      return files.filter((f) => !f.name.endsWith("/")).map((f) => f.name.slice(SRC.length));
    },
    read: async (rel) => (await bucket.file(SRC + rel).download())[0],
    exists: async (rel) => (await bucket.file(`${DEST}${rel}.enc`).exists())[0],
    write: (rel, buf) =>
      bucket.file(`${DEST}${rel}.enc`).save(buf, {
        resumable: false,
        contentType: "application/octet-stream",
        metadata: { cacheControl: "private, max-age=0" },
      }),
  };
}

/* ---------------------------------------------------------------- */
/* Traitement                                                        */
/* ---------------------------------------------------------------- */

const todo = await io.list();
console.log(`${todo.length} fichiers${LOCAL_IN ? ` dans ${LOCAL_IN}` : ` sous gs://${BUCKET}/${SRC}${ONLY}`} · audio → Opus ${BITRATE}${DRY ? " (simulation)" : ""}`);

let done = 0, skipped = 0, failed = 0, bytesIn = 0, bytesOut = 0;

async function handle(rel) {
  try {
    if (!FORCE && (await io.exists(rel))) {
      skipped++;
      return;
    }
    if (DRY) {
      console.log(`  ${rel} → ${DEST}${rel}.enc`);
      done++;
      return;
    }
    const data = await io.read(rel);
    const { body, kind } = await transform(rel, data);
    // La clé dérive du chemin d'ORIGINE (celui stocké dans WordPress), quel que soit le nouveau format.
    await io.write(rel, encrypt(body, deriveKey(rel)));
    bytesIn += data.length;
    bytesOut += body.length;
    done++;
    if (LOCAL_IN || todo.length <= 20) console.log(`  ✓ ${rel} (${kind}) ${(data.length / 1e3).toFixed(0)} Ko → ${(body.length / 1e3).toFixed(0)} Ko`);
  } catch (e) {
    failed++;
    console.error(`  ÉCHEC ${rel} : ${e.message}`);
  }
  const n = done + skipped + failed;
  if (n % 100 === 0) console.log(`  ${n}/${todo.length}`);
}

const queue = [...todo];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await handle(queue.shift());
  }),
);

const gain = bytesIn ? Math.round((1 - bytesOut / bytesIn) * 100) : 0;
console.log(
  `Terminé : ${done} traités, ${skipped} déjà présents, ${failed} échecs.` +
    (bytesIn ? ` ${(bytesIn / 1e6).toFixed(1)} Mo → ${(bytesOut / 1e6).toFixed(1)} Mo (−${gain} %).` : ""),
);
process.exit(failed ? 1 : 0);
