// cl_view.c -- pending stub (PORTING.md "Pending stubs"). Per-frame scene
// assembly (view weapon, gun frame, refdef construction). V_ClearScene/
// V_TestParticles/V_TestEntities/V_TestLights/CalcFov/V_Gun_Next_f/
// V_Gun_Prev_f/V_Gun_Model_f/SCR_DrawCrosshair/V_Viewpos_f are internal to
// cl_view.c and are not stubbed here. gun_frame/gun_model (extern in
// client.h, defined in this file) are ported in client.ts per that file's
// ownership note.

import { PendingPort } from "../qcommon/pending";
import type { Vec3 } from "../shared/math";
import type { EntityT } from "./ref";

export function V_Init(): void {
  throw new PendingPort("V_Init");
}

export function V_RenderView(_stereo_separation: number): void {
  throw new PendingPort("V_RenderView");
}

export function V_AddEntity(_ent: EntityT): void {
  throw new PendingPort("V_AddEntity");
}

export function V_AddParticle(_org: Vec3, _color: number, _alpha: number): void {
  throw new PendingPort("V_AddParticle");
}

export function V_AddLight(_org: Vec3, _intensity: number, _r: number, _g: number, _b: number): void {
  throw new PendingPort("V_AddLight");
}

export function V_AddLightStyle(_style: number, _r: number, _g: number, _b: number): void {
  throw new PendingPort("V_AddLightStyle");
}

export function CL_PrepRefresh(): void {
  throw new PendingPort("CL_PrepRefresh");
}
