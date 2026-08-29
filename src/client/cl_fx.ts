// cl_fx.c -- pending stub (PORTING.md "Pending stubs"). The real unit ports
// the particle/dlight/muzzleflash effect system. Internal helpers
// (CL_ClearLightStyles, CL_NewDlight, CL_ClearDlights, CL_ClearParticles,
// CL_LogoutEffect, CL_ItemRespawnParticles, CL_ExplosionParticles,
// CL_BlasterParticles, MakeNormalVectors, CL_FlyParticles,
// CL_BFGExplosionParticles, CL_TeleportParticles) are internal to cl_fx.c
// and are not stubbed here; only the functions client.h declares are
// exported.

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";
import type { EntityStateT } from "../shared/q_shared";
import type { EntityT } from "./ref";
import type { CentityT, CdlightT } from "./client";

export function CL_TeleporterParticles(_ent: EntityStateT): void {
  throw new PendingPort("CL_TeleporterParticles");
}

export function CL_ParticleEffect(_org: Vec3, _dir: Vec3, _color: number, _count: number): void {
  throw new PendingPort("CL_ParticleEffect");
}

export function CL_ParticleEffect2(_org: Vec3, _dir: Vec3, _color: number, _count: number): void {
  throw new PendingPort("CL_ParticleEffect2");
}

// RAFAEL
export function CL_ParticleEffect3(_org: Vec3, _dir: Vec3, _color: number, _count: number): void {
  throw new PendingPort("CL_ParticleEffect3");
}

export function CL_ClearEffects(): void {
  throw new PendingPort("CL_ClearEffects");
}

export function CL_BlasterTrail(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_BlasterTrail");
}

export function CL_QuadTrail(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_QuadTrail");
}

export function CL_RailTrail(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_RailTrail");
}

export function CL_BubbleTrail(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_BubbleTrail");
}

export function CL_FlagTrail(_start: Vec3, _end: Vec3, _color: number): void {
  throw new PendingPort("CL_FlagTrail");
}

// RAFAEL
export function CL_IonripperTrail(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_IonripperTrail");
}

export function CL_ParseMuzzleFlash(): void {
  throw new PendingPort("CL_ParseMuzzleFlash");
}

export function CL_ParseMuzzleFlash2(): void {
  throw new PendingPort("CL_ParseMuzzleFlash2");
}

export function CL_SetLightstyle(_i: number): void {
  throw new PendingPort("CL_SetLightstyle");
}

export function CL_RunDLights(): void {
  throw new PendingPort("CL_RunDLights");
}

export function CL_RunLightStyles(): void {
  throw new PendingPort("CL_RunLightStyles");
}

export function CL_AddDLights(): void {
  throw new PendingPort("CL_AddDLights");
}

export function CL_AddLightStyles(): void {
  throw new PendingPort("CL_AddLightStyles");
}

export function CL_AllocDlight(_key: number): CdlightT {
  throw new PendingPort("CL_AllocDlight");
}

export function CL_BigTeleportParticles(_org: Vec3): void {
  throw new PendingPort("CL_BigTeleportParticles");
}

export function CL_RocketTrail(_start: Vec3, _end: Vec3, _old: CentityT): void {
  throw new PendingPort("CL_RocketTrail");
}

export function CL_DiminishingTrail(_start: Vec3, _end: Vec3, _old: CentityT, _flags: number): void {
  throw new PendingPort("CL_DiminishingTrail");
}

export function CL_FlyEffect(_ent: CentityT, _origin: Vec3): void {
  throw new PendingPort("CL_FlyEffect");
}

export function CL_BfgParticles(_ent: EntityT): void {
  throw new PendingPort("CL_BfgParticles");
}

export function CL_AddParticles(): void {
  throw new PendingPort("CL_AddParticles");
}

export function CL_EntityEvent(_ent: EntityStateT): void {
  throw new PendingPort("CL_EntityEvent");
}

// RAFAEL
export function CL_TrapParticles(_ent: EntityT): void {
  throw new PendingPort("CL_TrapParticles");
}
