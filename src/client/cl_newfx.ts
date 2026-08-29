// cl_newfx.c -- pending stub (PORTING.md "Pending stubs"). Rogue/Xatrix
// particle effects added after the original id release. `vectoangles2` is
// internal to cl_newfx.c and is not stubbed here; only the functions
// client.h declares are exported.

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";
import type { CentityT, ClSustainT } from "./client";

export function CL_Flashlight(_ent: number, _pos: Vec3): void {
  throw new PendingPort("CL_Flashlight");
}

export function CL_ColorFlash(_pos: Vec3, _ent: number, _intensity: number, _r: number, _g: number, _b: number): void {
  throw new PendingPort("CL_ColorFlash");
}

export function CL_DebugTrail(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_DebugTrail");
}

export function CL_SmokeTrail(_start: Vec3, _end: Vec3, _colorStart: number, _colorRun: number, _spacing: number): void {
  throw new PendingPort("CL_SmokeTrail");
}

export function CL_ForceWall(_start: Vec3, _end: Vec3, _color: number): void {
  throw new PendingPort("CL_ForceWall");
}

export function CL_FlameEffects(_ent: CentityT, _origin: Vec3): void {
  throw new PendingPort("CL_FlameEffects");
}

export function CL_GenericParticleEffect(
  _org: Vec3,
  _dir: Vec3,
  _color: number,
  _count: number,
  _numcolors: number,
  _dirspread: number,
  _alphavel: number,
): void {
  throw new PendingPort("CL_GenericParticleEffect");
}

export function CL_BubbleTrail2(_start: Vec3, _end: Vec3, _dist: number): void {
  throw new PendingPort("CL_BubbleTrail2");
}

export function CL_Heatbeam(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_Heatbeam");
}

export function CL_ParticleSteamEffect(_org: Vec3, _dir: Vec3, _color: number, _count: number, _magnitude: number): void {
  throw new PendingPort("CL_ParticleSteamEffect");
}

export function CL_ParticleSteamEffect2(_self: ClSustainT): void {
  throw new PendingPort("CL_ParticleSteamEffect2");
}

export function CL_TrackerTrail(_start: Vec3, _end: Vec3, _particleColor: number): void {
  throw new PendingPort("CL_TrackerTrail");
}

export function CL_Tracker_Shell(_origin: Vec3): void {
  throw new PendingPort("CL_Tracker_Shell");
}

export function CL_MonsterPlasma_Shell(_origin: Vec3): void {
  throw new PendingPort("CL_MonsterPlasma_Shell");
}

export function CL_Widowbeamout(_self: ClSustainT): void {
  throw new PendingPort("CL_Widowbeamout");
}

export function CL_Nukeblast(_self: ClSustainT): void {
  throw new PendingPort("CL_Nukeblast");
}

export function CL_WidowSplash(_org: Vec3): void {
  throw new PendingPort("CL_WidowSplash");
}

export function CL_Tracker_Explode(_origin: Vec3): void {
  throw new PendingPort("CL_Tracker_Explode");
}

export function CL_TagTrail(_start: Vec3, _end: Vec3, _color: number): void {
  throw new PendingPort("CL_TagTrail");
}

export function CL_ColorExplosionParticles(_org: Vec3, _color: number, _run: number): void {
  throw new PendingPort("CL_ColorExplosionParticles");
}

export function CL_ParticleSmokeEffect(_org: Vec3, _dir: Vec3, _color: number, _count: number, _magnitude: number): void {
  throw new PendingPort("CL_ParticleSmokeEffect");
}

export function CL_BlasterParticles2(_org: Vec3, _dir: Vec3, _color: number): void {
  throw new PendingPort("CL_BlasterParticles2");
}

export function CL_BlasterTrail2(_start: Vec3, _end: Vec3): void {
  throw new PendingPort("CL_BlasterTrail2");
}
