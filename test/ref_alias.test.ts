/*
Unit tests for the alias (MD2) model drawing pipeline (r_alias.ts/
r_aclip.ts/r_polyse.ts). Exercises the pieces that are exact,
hand-computable math or self-contained algorithms:

- R_AliasClip (r_aclip.ts): the single-plane clip step R_AliasClipTriangle
  orchestrates per plane -- a triangle with exactly one vertex outside the
  left clip boundary clips into 4 vertices, with hand-computed coordinates.
- R_PolysetCalcGradients (r_polyse.ts): s/t/light/zi screen-space gradients
  for a hand-picked triangle where every intermediate product is an exact
  integer.
- R_DrawTriangle (r_polyse.ts): rasterizes a small axis-legged right
  triangle into d_viewbuffer, hitting the exact expected pixel positions
  (a triangular-number pixel count for a right triangle with two
  axis-aligned legs of length 2: 2*3/2 = 3 pixels).
- R_AliasSetUpLerpData (r_alias.ts): frame-vertex lerp coefficients at
  backlerp 0.5, hand-computed.

Each test initializes every global it reads, per PORTING.md/rule 13; none
of them rely on another test file (or another test in this file) having
run first.
*/

import { describe, test, expect } from "bun:test";
import { EntityT } from "../src/client/ref";
import { ALIAS_LEFT_CLIP, FinalvertT, r_refdef } from "../src/ref_soft/r_local";
import { R_AliasClip, R_Alias_clip_left } from "../src/ref_soft/r_aclip";
import { R_AliasSetUpLerpData, r_lerp_backv, r_lerp_frontv, r_lerp_move } from "../src/ref_soft/r_alias";
import {
  R_DrawTriangle,
  R_PolysetCalcGradients,
  R_PolysetGetGradients,
  R_PolysetSetXDenom,
  R_SetDrawSpansFn,
  R_PolysetDrawSpans8_Opaque,
  r_p0,
  r_p1,
  r_p2,
} from "../src/ref_soft/r_polyse";
import { D_SetViewBuffer, D_SetZBuffer } from "../src/ref_soft/r_scan";
import { aliastriangleparms, r_affinetridesc, r_newrefdef, vid } from "../src/ref_soft/r_local";

function makeFinalvert(u: number, v: number, s: number, t: number, l: number, zi: number, flags = 0): FinalvertT {
  const fv = new FinalvertT();
  fv.u = u;
  fv.v = v;
  fv.s = s;
  fv.t = t;
  fv.l = l;
  fv.zi = zi;
  fv.flags = flags;
  return fv;
}

describe("R_AliasClip / R_Alias_clip_left", () => {
  test("clips a triangle with one vertex outside the left plane into 4 vertices", () => {
    // left clip boundary at u=10; generous bounds on every other side so
    // only ALIAS_LEFT_CLIP is ever in play.
    r_refdef.aliasvrect.x = 10;
    r_refdef.aliasvrect.y = -1000;
    r_refdef.aliasvrectright = 1000;
    r_refdef.aliasvrectbottom = 1000;

    const v0 = makeFinalvert(20, 0, 100, 200, 50, 1000, 0); // inside (u=20 > 10)
    const v1 = makeFinalvert(0, 10, 0, 0, 0, 0, ALIAS_LEFT_CLIP); // outside (u=0 < 10)
    const v2 = makeFinalvert(40, 20, 400, 800, 200, 4000, 0); // inside (u=40 > 10)

    const out = [new FinalvertT(), new FinalvertT(), new FinalvertT(), new FinalvertT()];
    const k = R_AliasClip([v0, v1, v2], out, ALIAS_LEFT_CLIP, 3, R_Alias_clip_left);

    expect(k).toBe(4);

    // out[0] = copy of v0 (untouched, first vertex was already inside)
    expect(out[0].u).toBeCloseTo(20);
    expect(out[0].v).toBeCloseTo(0);
    expect(out[0].s).toBeCloseTo(100);

    // out[1] = clip(v0, v1): edge from (20,0) to (0,10) crossing u=10 at scale 0.5
    expect(out[1].u).toBeCloseTo(10.5);
    expect(out[1].v).toBeCloseTo(5.5);
    expect(out[1].s).toBeCloseTo(50.5);
    expect(out[1].t).toBeCloseTo(100.5);
    expect(out[1].l).toBeCloseTo(25.5);
    expect(out[1].zi).toBeCloseTo(500.5);
    expect(out[1].flags).toBe(0);

    // out[2] = clip(v1, v2): edge from (0,10) to (40,20) crossing u=10 at scale 0.75
    expect(out[2].u).toBeCloseTo(10.5);
    expect(out[2].v).toBeCloseTo(13);
    expect(out[2].s).toBeCloseTo(100.5);
    expect(out[2].t).toBeCloseTo(200.5);
    expect(out[2].l).toBeCloseTo(50.5);
    expect(out[2].zi).toBeCloseTo(1000.5);
    expect(out[2].flags).toBe(0);

    // out[3] = copy of v2 (untouched, third vertex was already inside)
    expect(out[3].u).toBeCloseTo(40);
    expect(out[3].v).toBeCloseTo(20);
  });
});

describe("R_PolysetCalcGradients", () => {
  test("computes exact s/t/light/zi gradients for a hand-picked triangle", () => {
    // a=(0,0) b=(4,0) c=(0,4); d_xdenom = dv0_ac*dv1_ab - dv0_ab*dv1_ac
    //   dv0_ab=-4, dv1_ab=0, dv0_ac=0, dv1_ac=-4 -> d_xdenom = 0*0 - (-4)*(-4) = -16
    r_p0[0] = 0;
    r_p0[1] = 0;
    r_p0[2] = 0; // s
    r_p0[3] = 0; // t
    r_p0[4] = 0; // light
    r_p0[5] = 0; // zi

    r_p1[0] = 4;
    r_p1[1] = 0;
    r_p1[2] = 8;
    r_p1[3] = 0;
    r_p1[4] = 0;
    r_p1[5] = 0;

    r_p2[0] = 0;
    r_p2[1] = 4;
    r_p2[2] = 0;
    r_p2[3] = 8;
    r_p2[4] = 16;
    r_p2[5] = 0;

    R_PolysetSetXDenom(-16);
    R_PolysetCalcGradients(4);

    const g = R_PolysetGetGradients();
    expect(g.sstepx).toBe(2);
    expect(g.sstepy).toBe(0);
    expect(g.tstepx).toBe(0);
    expect(g.tstepy).toBe(2);
    expect(g.lstepx).toBe(0);
    expect(g.lstepy).toBe(4);
    expect(g.zistepx).toBe(0);
    expect(g.zistepy).toBe(0);
  });
});

describe("R_DrawTriangle", () => {
  test("rasterizes a small axis-legged right triangle into the expected pixels", () => {
    const screenwidth = 8;
    const height = 8;
    const view = new Uint8Array(screenwidth * height).fill(255); // sentinel
    const zbuf = new Int16Array(screenwidth * height); // zeroed
    D_SetViewBuffer(view, screenwidth);
    D_SetZBuffer(zbuf, screenwidth);

    const colormap = new Uint8Array(256 * 64);
    for (let i = 0; i < 256; i++) colormap[i] = i; // identity for grade 0
    vid.colormap = colormap;

    const skin = new Uint8Array(16).fill(0);
    skin[0] = 200; // marker texel
    r_affinetridesc.pskin = skin;
    r_affinetridesc.skinwidth = 4;
    r_affinetridesc.skinheight = 4;

    r_newrefdef.rdflags = 0; // keep the IR-goggles branch off

    R_SetDrawSpansFn(R_PolysetDrawSpans8_Opaque);

    // right triangle, legs of length 2 along +u and +v from the origin;
    // winding chosen so d_xdenom ends up negative (front-facing).
    aliastriangleparms.a = makeFinalvert(0, 0, 0, 0, 0, 0);
    aliastriangleparms.b = makeFinalvert(2, 0, 0, 0, 0, 0);
    aliastriangleparms.c = makeFinalvert(0, 2, 0, 0, 0, 0);

    R_DrawTriangle();

    // triangular number for leg length 2: 2*3/2 = 3 pixels, at
    // (0,0),(1,0) on the top row and (0,1) on the second row.
    const touched: number[] = [];
    for (let i = 0; i < view.length; i++) {
      if (view[i] !== 255) touched.push(i);
    }
    expect(touched.sort((x, y) => x - y)).toEqual([0, 1, 8]);
    expect(view[0]).toBe(200);
    expect(view[1]).toBe(200);
    expect(view[8]).toBe(200);
  });
});

describe("R_AliasSetUpLerpData", () => {
  test("interpolates frame verts at backlerp 0.5 exactly", () => {
    const entity = new EntityT();
    entity.angles[0] = 0; // PITCH
    entity.angles[1] = 0; // YAW
    entity.angles[2] = 0; // ROLL
    entity.origin[0] = 0;
    entity.origin[1] = 0;
    entity.origin[2] = 0;
    entity.oldorigin[0] = 10;
    entity.oldorigin[1] = 0;
    entity.oldorigin[2] = 0;

    const thisframe = { scale: [2, 4, 6] as [number, number, number], translate: [0, 1, 2] as [number, number, number], name: "", verts: [] };
    const lastframe = { scale: [10, 20, 30] as [number, number, number], translate: [2, 3, 4] as [number, number, number], name: "", verts: [] };

    R_AliasSetUpLerpData(entity, thisframe, lastframe, 0.5);

    // with identity angles: forward=(1,0,0), right=(0,-1,0), up=(0,0,1)
    // translation = oldorigin - origin = (10,0,0)
    // move (pre-lastframe) = (10,0,0); += lastframe.translate(2,3,4) -> (12,3,4)
    // lerp_move[i] = 0.5*move[i] + 0.5*thisframe.translate[i]
    //   -> (0.5*12+0.5*0, 0.5*3+0.5*1, 0.5*4+0.5*2) = (6, 2, 3)
    expect(r_lerp_move[0]).toBeCloseTo(6);
    expect(r_lerp_move[1]).toBeCloseTo(2);
    expect(r_lerp_move[2]).toBeCloseTo(3);

    // frontv = 0.5*thisframe.scale = (1,2,3); backv = 0.5*lastframe.scale = (5,10,15)
    expect(r_lerp_frontv[0]).toBeCloseTo(1);
    expect(r_lerp_frontv[1]).toBeCloseTo(2);
    expect(r_lerp_frontv[2]).toBeCloseTo(3);
    expect(r_lerp_backv[0]).toBeCloseTo(5);
    expect(r_lerp_backv[1]).toBeCloseTo(10);
    expect(r_lerp_backv[2]).toBeCloseTo(15);
  });
});
