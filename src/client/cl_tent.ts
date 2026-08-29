// cl_tent.c -- pending stub (PORTING.md "Pending stubs"). Temp-entity
// parsing (beams, lightning, sparks, explosions) and their model/sound
// precache. CL_ParseParticles/CL_ParseBeam/CL_ParseBeam2/
// CL_ParsePlayerBeam/CL_ParseLightning/CL_ParseLaser/CL_ParseSteam/
// CL_ParseWidow/CL_ParseNuke/CL_AddBeams/CL_AddPlayerBeams/
// CL_AddExplosions/CL_AddLasers/CL_ProcessSustain are internal to
// cl_tent.c and are not stubbed here.
//
// client.h declares a bare `void SmokeAndFlash(vec3_t origin);` in its
// general section, distinct from `void CL_SmokeAndFlash(vec3_t origin);`
// declared later under this file's own section. Only `CL_SmokeAndFlash` is
// ever defined in cl_tent.c (confirmed by grep) -- the bare `SmokeAndFlash`
// is a dead declaration, dropped and reported.

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";

export function CL_RegisterTEntSounds(): void {
  throw new PendingPort("CL_RegisterTEntSounds");
}

export function CL_RegisterTEntModels(): void {
  throw new PendingPort("CL_RegisterTEntModels");
}

export function CL_SmokeAndFlash(_origin: Vec3): void {
  throw new PendingPort("CL_SmokeAndFlash");
}

export function CL_ParseTEnt(): void {
  throw new PendingPort("CL_ParseTEnt");
}

export function CL_ClearTEnts(): void {
  throw new PendingPort("CL_ClearTEnts");
}

export function CL_AddTEnts(): void {
  throw new PendingPort("CL_AddTEnts");
}
