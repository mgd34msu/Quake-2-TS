// snd_mix.c -- pending stub (PORTING.md "Pending stubs"). The sample
// mixer. S_WriteLinearBlastStereo16/S_TransferStereo16/
// S_TransferPaintBuffer/S_PaintChannelFrom8/S_PaintChannelFrom16 are
// internal to snd_mix.c and are not stubbed here.

import { PendingPort } from "../qcommon/pending";

export function S_InitScaletable(): void {
  throw new PendingPort("S_InitScaletable");
}

export function S_PaintChannels(_endtime: number): void {
  throw new PendingPort("S_PaintChannels");
}
