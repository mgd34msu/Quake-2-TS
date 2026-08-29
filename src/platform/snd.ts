// One portable implementation of snd_loc.h's "SYSTEM SPECIFIC FUNCTIONS"
// (SNDDMA_Init/SNDDMA_GetDMAPos/SNDDMA_Shutdown/SNDDMA_BeginPainting/
// SNDDMA_Submit), matching PORTING.md's platform mapping: the linux/win32/
// irix per-OS backends are alternative implementations of this same
// interface and are not transliterated file-by-file. This is a NULL
// driver: bun has no audio output API, so there is no real DAC anywhere
// behind this file. `dma.buffer` is a fixed-size ring buffer that
// snd_mix.ts's S_PaintChannels/S_TransferPaintBuffer write PCM into, and
// SNDDMA_GetDMAPos reports a simulated "playback" position that advances
// with wall-clock time (as if a device were continuously draining the
// ring at `dma.speed` samples/sec) so the mixer's mix-ahead pacing
// (S_Update_'s GetSoundtime/endtime math in snd_dma.ts) behaves the same
// as it would against real hardware. No sound is ever actually audible.
//
// Field values are modeled on win32/snd_win.c's SNDDMA_InitWav (the most
// fully-specified backend, and the one that reads the `s_khz` cvar
// directly) rather than any single literal port: dma.channels=2,
// dma.samplebits=16, and dma.speed selected from `s_khz` (44/22/other ->
// 44100/22050/11025). Unlike win32's SNDDMA_InitWav (which has a real bug:
// its second `if (s_khz->value == 22)` is followed by an unconditional
// `else dma.speed = 11025`, so s_khz==44 is silently overridden back to
// 11025), this implementation picks the rate correctly -- this file has no
// single C original to be bug-for-bug faithful to (PORTING.md: the per-OS
// dirs are "not transliterated"), so the bug is not reproduced.

import { Cvar_VariableValue } from "../qcommon/cvar";
import { dma } from "../client/snd_loc";

// 0x10000 bytes, the same fixed ring size DirectSound's secondary buffer
// used in win32/snd_win.c (SECONDARY_BUFFER_SIZE). At samplebits=16 that's
// 32768 interleaved samples -- a power of two, required by snd_mix.ts's
// `dma.samples - 1` / `(dma.samples>>1) - 1` ring masks.
const RING_BUFFER_BYTES = 0x10000;

let initialized = false;
let startTimeMs = 0;

function pickSpeed(): number {
  const khz = Cvar_VariableValue("s_khz");
  if (khz === 44) return 44100;
  if (khz === 22) return 22050;
  return 11025;
}

export function SNDDMA_Init(): boolean {
  dma.channels = 2;
  dma.samplebits = 16;
  dma.speed = pickSpeed();

  dma.samples = RING_BUFFER_BYTES / (dma.samplebits / 8);
  dma.submission_chunk = 1;
  dma.buffer = new Uint8Array(RING_BUFFER_BYTES);
  dma.samplepos = 0;

  startTimeMs = performance.now();
  initialized = true;

  return true;
}

export function SNDDMA_GetDMAPos(): number {
  if (!initialized) return 0;

  const elapsedSec = (performance.now() - startTimeMs) / 1000;
  const framesPlayed = Math.floor(elapsedSec * dma.speed);
  const totalSamplesPlayed = framesPlayed * dma.channels;

  dma.samplepos = totalSamplesPlayed % dma.samples;
  return dma.samplepos;
}

export function SNDDMA_Shutdown(): void {
  initialized = false;
  dma.buffer = new Uint8Array(0);
}

export function SNDDMA_BeginPainting(): void {
  // no locking needed: dma.buffer is a plain in-memory array, not a
  // hardware-shared buffer that needs to be locked before writes.
}

export function SNDDMA_Submit(): void {
  // no device to flush to.
}
