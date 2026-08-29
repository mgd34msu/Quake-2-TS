/*
Platform-side video services that are not part of the SWimp mode/palette
interface in swimp.ts.

PORTING.md restricts `node:fs` to `src/platform` and `src/qcommon/files.ts`,
and `refimport_t` has no file-write entry point, so r_misc.ts's R_ScreenShot_f
builds the PCX in memory and hands it to an injected writer
(`SetScreenshotWriter`). This module is that writer: the one place allowed to
put the bytes on disk. In the C original the equivalent write is
`fopen`/`fwrite` inside R_ScreenShot_f itself.

R_ScreenShot_f never creates its `scrnshot` directory (refimport_t has no
Sys_Mkdir either), so the writer does it here -- the C version relies on the
directory already existing and silently fails when it does not.
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { SetScreenshotWriter } from "../ref_soft/r_misc";

export function VID_WriteScreenshot(path: string, data: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

export function VID_Init(): void {
  SetScreenshotWriter(VID_WriteScreenshot);
}

export function VID_Shutdown(): void {
  SetScreenshotWriter(null);
}
