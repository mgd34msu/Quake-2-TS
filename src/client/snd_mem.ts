// snd_mem.c -- pending stub (PORTING.md "Pending stubs"). WAV loading and
// resampling. ResampleSfx/GetLittleLong/FindNextChunk/FindChunk/DumpChunks
// are internal to snd_mem.c and are not stubbed here.

import { PendingPort } from "../qcommon/pending";
import type { SfxT, SfxcacheT, WavinfoT } from "./snd_loc";

export function S_LoadSound(_s: SfxT): SfxcacheT | null {
  throw new PendingPort("S_LoadSound");
}

export function GetWavinfo(_name: string, _wav: Uint8Array, _wavlength: number): WavinfoT {
  throw new PendingPort("GetWavinfo");
}
