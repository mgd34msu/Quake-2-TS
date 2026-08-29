// cl_pred.c -- pending stub (PORTING.md "Pending stubs"). Movement
// prediction against the local Pmove. CL_ClipMoveToEntities/
// CL_PMpointcontents are internal to cl_pred.c (used only as Pmove trace/
// pointcontents callbacks, never extern-declared in any header) and are
// not stubbed here.
//
// client.h also declares `void CL_InitPrediction (void);` and
// `void CL_PredictMove (void);` under this file's section, but neither is
// defined anywhere in the v3.19 client tree (confirmed by grep) -- dead
// declarations, dropped and reported. `CL_PredictMovement` (a distinct,
// real function) is declared separately, later in client.h, and is the one
// exported below.

import { PendingPort } from "../qcommon/pending";

export function CL_CheckPredictionError(): void {
  throw new PendingPort("CL_CheckPredictionError");
}

export function CL_PredictMovement(): void {
  throw new PendingPort("CL_PredictMovement");
}
