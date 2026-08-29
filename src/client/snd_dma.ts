// snd_dma.c -- pending stub (PORTING.md "Pending stubs"). The DMA-backed
// mixer's public surface plus its private channel/playsound bookkeeping
// (S_SoundInfo_f/S_SpatializeOrigin/S_FreePlaysound/S_ClearBuffer/
// S_AddLoopSounds/GetSoundtime/S_Update_/S_Play/S_SoundList are internal to
// snd_dma.c and are not stubbed here). SNDDMA_Init/SNDDMA_GetDMAPos/
// SNDDMA_Shutdown/SNDDMA_BeginPainting/SNDDMA_Submit are platform-owned
// (see snd_loc.ts's banner) and are not called from this stub.

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";
import type { SfxT, ChannelT, PlaysoundT } from "./snd_loc";

export function S_Init(): void {
  throw new PendingPort("S_Init");
}

export function S_Shutdown(): void {
  throw new PendingPort("S_Shutdown");
}

export function S_StartSound(
  _origin: Vec3 | null,
  _entnum: number,
  _entchannel: number,
  _sfx: SfxT | null,
  _fvol: number,
  _attenuation: number,
  _timeofs: number,
): void {
  throw new PendingPort("S_StartSound");
}

export function S_StartLocalSound(_s: string): void {
  throw new PendingPort("S_StartLocalSound");
}

export function S_RawSamples(_samples: number, _rate: number, _width: number, _channels: number, _data: Uint8Array): void {
  throw new PendingPort("S_RawSamples");
}

export function S_StopAllSounds(): void {
  throw new PendingPort("S_StopAllSounds");
}

export function S_Update(_origin: Vec3, _v_forward: Vec3, _v_right: Vec3, _v_up: Vec3): void {
  throw new PendingPort("S_Update");
}

export function S_BeginRegistration(): void {
  throw new PendingPort("S_BeginRegistration");
}

export function S_RegisterSound(_sample: string): SfxT | null {
  throw new PendingPort("S_RegisterSound");
}

export function S_EndRegistration(): void {
  throw new PendingPort("S_EndRegistration");
}

export function S_FindName(_name: string, _create: boolean): SfxT | null {
  throw new PendingPort("S_FindName");
}

export function S_IssuePlaysound(_ps: PlaysoundT): void {
  throw new PendingPort("S_IssuePlaysound");
}

// picks a channel based on priorities, empty slots, number of channels
export function S_PickChannel(_entnum: number, _entchannel: number): ChannelT | null {
  throw new PendingPort("S_PickChannel");
}

// spatializes a channel
export function S_Spatialize(_ch: ChannelT): void {
  throw new PendingPort("S_Spatialize");
}
