/*
CD audio backend over Ogg Vorbis track files -- the bun equivalent of
linux/cd_linux.c. The C backend ioctl()s a physical CD drive; no such
device exists here, so the same six-entry cdaudio.h interface plays
`music/NN.ogg` rips instead (the long-standing community convention for
CD-less Quake 2 installs), decoded via the system libvorbisfile through
bun:ffi and streamed into the engine mixer's raw-sample ring -- the same
path cinematic soundtracks take, so music mixes with game audio and obeys
the engine's pacing. cd_nocd (the cvar the options menu's "CD music"
toggle drives) disables it, matching the C, as does nocdaudio (the earlier,
coarser "don't even try" switch CDAudio_Init checks first). cd_volume scales
the decoded samples in place -- the software-gain stand-in for the C
backend's CDROMVOLCTRL ioctl. cd_dev/cd_loopcount/cd_looptrack are
registered only (see CDAudio_Init): they name a physical device path and an
MCI loop-track scheme this file-based backend has no use for.

src/null/cd_null.ts remains the silent backend for builds/hosts without
libvorbisfile: this module degrades to exactly cd_null behaviour when the
library cannot be loaded.
*/

import { dlopen, ptr, read as ffiRead, type Library, type Pointer } from "bun:ffi";
import { Com_DPrintf, Com_Printf } from "../qcommon/common";
import { Cmd_AddCommand, Cmd_Argc, Cmd_Argv } from "../qcommon/cmd";
import { Cvar_Get, Cvar_Set } from "../qcommon/cvar";
import { FS_Gamedir } from "../qcommon/files";
import { S_RawSamples } from "../client/snd_dma";
import { dma, paintedtime, s_rawend } from "../client/snd_loc";
import { CVAR_ARCHIVE, CVAR_NOSET, type CvarT } from "../shared/q_shared";

const vorbisSymbols = {
  ov_fopen: { args: ["cstring", "ptr"], returns: "i32" },
  ov_read: { args: ["ptr", "ptr", "i32", "i32", "i32", "i32", "ptr"], returns: "i64" },
  ov_info: { args: ["ptr", "i32"], returns: "ptr" },
  ov_clear: { args: ["ptr"], returns: "i32" },
  ov_pcm_seek: { args: ["ptr", "i64"], returns: "i32" },
} as const;

type VorbisLib = Library<typeof vorbisSymbols>;

let vorbis: VorbisLib | null = null;
let vorbisTried = false;

function lib(): VorbisLib | null {
  if (vorbisTried) return vorbis;
  vorbisTried = true;
  const names =
    process.platform === "win32"
      ? ["libvorbisfile-3.dll", "vorbisfile.dll", "libvorbisfile.dll"]
      : process.platform === "darwin"
        ? ["libvorbisfile.3.dylib", "libvorbisfile.dylib"]
        : ["libvorbisfile.so.3", "libvorbisfile.so"];
  for (const name of names) {
    try {
      vorbis = dlopen(name, vorbisSymbols);
      return vorbis;
    } catch {
      // try the next name
    }
  }
  Com_DPrintf("cd_ogg: libvorbisfile not available; CD audio is silent (cd_null behaviour)\n");
  return null;
}

// OggVorbis_File is ~944 bytes on x86-64; over-allocate for safety. The
// struct is opaque to us -- only libvorbisfile reads it.
const OV_FILE_SIZE = 2048;

function cstr(s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  const out = new Uint8Array(bytes.length + 1);
  out.set(bytes);
  return out;
}

let cd_nocd: CvarT | null = null;
let nocdaudio: CvarT | null = null;
let cd_volume: CvarT | null = null;

let vf: Uint8Array | null = null; // live OggVorbis_File storage
let trackRate = 0;
let trackChannels = 0;
let looping = false;
let currentTrack = 0;

const bitstream = new Int32Array(1);
const decodeBuf = new Uint8Array(8192);

// feed until this much audio (in output sample frames) is buffered ahead of
// the mixer -- a quarter second, comfortably past s_mixahead
function feedTarget(): number {
  return (dma.speed / 4) | 0;
}

function closeTrack(): void {
  const l = lib();
  if (l && vf) l.symbols.ov_clear(ptr(vf));
  vf = null;
  currentTrack = 0;
}

export function CDAudio_Play(track: number, loop: boolean): void {
  const l = lib();
  if (!l) return;
  if (!cd_nocd) cd_nocd = Cvar_Get("cd_nocd", "0", CVAR_ARCHIVE);
  if (cd_nocd && cd_nocd.value) return;

  if (currentTrack === track && vf) {
    looping = loop;
    return;
  }
  closeTrack();

  if (track <= 0) return; // track 0/1 = data track / silence, like the CD

  const pad = track < 10 ? `0${track}` : `${track}`;
  const candidates = [`${FS_Gamedir()}/music/${pad}.ogg`, `${FS_Gamedir()}/music/track${pad}.ogg`];

  const storage = new Uint8Array(OV_FILE_SIZE);
  let opened = false;
  for (const path of candidates) {
    if (l.symbols.ov_fopen(cstr(path), ptr(storage)) === 0) {
      opened = true;
      break;
    }
  }
  if (!opened) {
    Com_DPrintf(`cd_ogg: no music file for track ${track}\n`);
    return;
  }

  const info = l.symbols.ov_info(ptr(storage), -1);
  // bun:ffi ptr returns can be bigint for high addresses; vorbis_info lives
  // in normal heap on every platform bun targets, narrowed like qglGetString
  if (info === null || typeof info === "bigint") {
    l.symbols.ov_clear(ptr(storage));
    return;
  }
  // vorbis_info: int version; int channels; long rate; (LP64: rate at +8)
  trackChannels = readI32(info, 4);
  trackRate = Number(readI64(info, 8));
  if (trackChannels < 1 || trackChannels > 2 || trackRate <= 0) {
    l.symbols.ov_clear(ptr(storage));
    Com_Printf(`cd_ogg: unsupported format for track ${track} (${trackChannels}ch @ ${trackRate})\n`);
    return;
  }

  vf = storage;
  looping = loop;
  currentTrack = track;
}

function readI32(p: Pointer, off: number): number {
  return ffiRead.i32(p, off);
}
function readI64(p: Pointer, off: number): bigint {
  return ffiRead.i64(p, off);
}

export function CDAudio_Stop(): void {
  closeTrack();
}

export function CDAudio_Resume(): void {
  // the CD backend resumes the paused drive; the stream just keeps feeding
}

export function CDAudio_Update(): void {
  const l = lib();
  if (!l || !vf) return;
  if (cd_nocd && cd_nocd.value) {
    closeTrack();
    return;
  }
  if (!dma.speed) return;

  // keep the raw ring feedTarget() output frames ahead of the mixer
  while (s_rawend - paintedtime < feedTarget()) {
    const n = Number(l.symbols.ov_read(ptr(vf), ptr(decodeBuf), decodeBuf.length, 0, 2, 1, ptr(bitstream)));
    if (n > 0) {
      const frames = (n / (2 * trackChannels)) | 0;
      applyCdVolume(decodeBuf, n);
      S_RawSamples(frames, trackRate, 2, trackChannels, decodeBuf.subarray(0, n));
      continue;
    }
    if (n === 0) {
      // end of track
      if (looping && l.symbols.ov_pcm_seek(ptr(vf), 0n) === 0) continue;
      closeTrack();
      return;
    }
    // decode error (OV_HOLE etc): skip and keep going, like every player does
    if (n === -3) continue; // OV_HOLE
    Com_DPrintf(`cd_ogg: decode error ${n} on track ${currentTrack}\n`);
    closeTrack();
    return;
  }
}

// linux/cd_linux.c:352-355's decoded 16-bit PCM samples are scaled in place
// by cd_volume before reaching the mixer -- the software-gain equivalent of
// the C backend's CDROMVOLCTRL ioctl (there is no hardware volume knob to
// point at here).
function applyCdVolume(buf: Uint8Array, byteLen: number): void {
  if (!cd_volume) return;
  const vol = cd_volume.value;
  if (vol === 1) return;
  const samples = new Int16Array(buf.buffer, buf.byteOffset, byteLen >> 1);
  for (let i = 0; i < samples.length; i++) {
    let s = samples[i]! * vol;
    if (s > 32767) s = 32767;
    else if (s < -32768) s = -32768;
    samples[i] = s;
  }
}

/*
CD_f -- win32/cd_win.c:257-366 and linux/cd_linux.c:198-314's identical "cd"
console command. play/loop/stop/resume/info map onto this OGG-file backend's
real state; on/off/reset are approximated through the cd_nocd cvar (the
mechanism CDAudio_Play/CDAudio_Update already check), which is the practical
equivalent of the C static `enabled` flag this port has no other home for.
remap/close/eject drive a physical CD-ROM tray or table of contents that
does not exist here, and pause has no counterpart in the six-function
cdaudio.h interface this file implements (see this file's header comment,
and note CDAudio_Resume above is also a no-op for the same reason) -- all
four print an explanation instead of silently doing nothing.
*/
function CD_f(): void {
  if (Cmd_Argc() < 2) return;
  const command = Cmd_Argv(1).toLowerCase();

  if (command === "on" || command === "reset") {
    if (command === "reset" && vf) CDAudio_Stop();
    Cvar_Set("cd_nocd", "0");
    return;
  }
  if (command === "off") {
    if (vf) CDAudio_Stop();
    Cvar_Set("cd_nocd", "1");
    return;
  }
  if (command === "remap" || command === "close" || command === "eject" || command === "pause") {
    Com_Printf(
      `cd ${command}: not available -- this port has no physical CD-ROM device (win32/cd_win.c:257-366, linux/cd_linux.c:198-314)\n`,
    );
    return;
  }
  if (command === "play") {
    CDAudio_Play(parseInt(Cmd_Argv(2), 10) || 0, false);
    return;
  }
  if (command === "loop") {
    CDAudio_Play(parseInt(Cmd_Argv(2), 10) || 0, true);
    return;
  }
  if (command === "stop") {
    CDAudio_Stop();
    return;
  }
  if (command === "resume") {
    CDAudio_Resume();
    return;
  }
  if (command === "info") {
    // win32/cd_win.c:358-364, linux/cd_linux.c:304-313 also print "%u
    // tracks" (the disc's table of contents) and a "Paused ..." branch --
    // this backend has no TOC (there is no disc, only whichever
    // music/NN.ogg files happen to exist) and no paused state (see the
    // remap/close/eject/pause branch above), so only the play/loop state
    // that genuinely exists here is reported.
    if (vf) Com_Printf(`Currently ${looping ? "looping" : "playing"} track ${currentTrack}\n`);
    else Com_Printf("Not playing.\n");
    return;
  }
}

export function CDAudio_Init(): number {
  // linux/cd_linux.c:363-365: nocdaudio is checked before anything else, and
  // short-circuits CD audio entirely (distinct from cd_nocd, which is the
  // options-menu toggle checked per-play/per-update below).
  nocdaudio = Cvar_Get("nocdaudio", "0", CVAR_NOSET);
  if (nocdaudio && nocdaudio.value) return -1;

  cd_nocd = Cvar_Get("cd_nocd", "0", CVAR_ARCHIVE);
  cd_volume = Cvar_Get("cd_volume", "1", CVAR_ARCHIVE);

  // linux/cd_linux.c:373's device path and win32/cd_win.c:443-444's MCI loop
  // controls have no counterpart here -- there is no physical CD/MCI device
  // to point at or loop against, only `music/NN.ogg` files. Registered (not
  // consumed) so `set cd_dev ...`/`set cd_loopcount ...`/`set cd_looptrack
  // ...` do not fail as unknown commands.
  Cvar_Get("cd_dev", "/dev/cdrom", CVAR_ARCHIVE);
  Cvar_Get("cd_loopcount", "4", 0);
  Cvar_Get("cd_looptrack", "11", 0);

  const ok = lib() !== null;
  // win32/cd_win.c:477, linux/cd_linux.c:398: both register "cd" only after
  // the device open succeeds -- if there is nothing to control, the command
  // does not exist at all in the reference engine either.
  if (ok) Cmd_AddCommand("cd", CD_f);

  return ok ? 0 : -1; // C: 0 = ok; init failure leaves the null behaviour
}

export function CDAudio_Shutdown(): void {
  closeTrack();
}
