// cl_cin.c -- pending stub (PORTING.md "Pending stubs"). .cin cinematic
// playback (Huffman-coded frame decoding, PCX palette loading).
// SCR_LoadPCX/SmallestNode1/Huff1TableInit are internal to cl_cin.c and are
// not stubbed here.
//
// screen.h's "scr_cin.c" comment section is stale: there is no separate
// scr_cin.c file in the v3.19 tree. All five functions it lists
// (SCR_PlayCinematic/SCR_DrawCinematic/SCR_RunCinematic/SCR_StopCinematic/
// SCR_FinishCinematic) are defined in cl_cin.c (confirmed by grep) and are
// ported here instead.

import { PendingPort } from "../qcommon/pending";

export function SCR_PlayCinematic(_name: string): void {
  throw new PendingPort("SCR_PlayCinematic");
}

export function SCR_DrawCinematic(): boolean {
  throw new PendingPort("SCR_DrawCinematic");
}

export function SCR_RunCinematic(): void {
  throw new PendingPort("SCR_RunCinematic");
}

export function SCR_StopCinematic(): void {
  throw new PendingPort("SCR_StopCinematic");
}

export function SCR_FinishCinematic(): void {
  throw new PendingPort("SCR_FinishCinematic");
}
