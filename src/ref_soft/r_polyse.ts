/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_soft/r_polyse.c (GNU GPL v2 or later) -- pending. Every
function r_local.h attributes to r_polyse.c throws PendingPort until the
real module lands. This module is the intended future caller of
adivtab.ts/rand1k.ts. The many `R_Polyset*`/`R_Rasterize*` internals not
declared in r_local.h (`R_PolysetScanLeftEdge_C`, `R_PolysetSetUpForLineScan`
-- itself a mismatch against r_local.h's differently-named
`extern void SetUpForLineScan(...)` declaration, `R_PolysetCalcGradients`,
`R_PolysetDrawSpans8*`, `R_PolysetFillSpans8`, `R_RasterizeAliasPolySmooth`,
`R_PolysetSetEdgeTable`) are not stubbed individually.
*/

import { PendingPort } from "../qcommon/pending";

export function R_PolysetUpdateTables(): void {
  throw new PendingPort("R_PolysetUpdateTables");
}

export function R_DrawTriangle(): void {
  throw new PendingPort("R_DrawTriangle");
}
