/*
Test support module, not a port of any .c file.

Reads individual entries out of the real retail rerelease install's
baseq2/pak0.pak (classic 'PACK' format -- see src/qcommon/files.ts's own
FS_LoadPackFile for the format this mirrors) directly via Node's fs, without
going through src/qcommon/files.ts's FS_LoadPackFile.

Why not just call FS_SetGamedir against the real retail baseq2 directory:
files.ts's MAX_FILES_IN_PACK is still the original id Software vanilla
value (4096, see files.ts:91); pak0.pak's real directory has 14663 files
and FS_LoadPackFile hard-errors (Com_Error(ERR_FATAL, ...)) past that cap.
q2repro's own real cap is 1<<20 (1048576, inc/format/pak.h) -- files.ts's
constant is stale for a rerelease-targeting engine, but files.ts is outside
this task's territory (src/qcommon/cmodel.ts, qfiles.ts, bspx.ts,
src/ref_gl/gl_model.ts, src/ref_soft/r_model.ts, test/ only), so it isn't
fixed here; reported as a cross-boundary blocker instead. This module reads
the pak directly so retail-gated tests can still exercise real map bytes
without hitting that unrelated cap.
*/

import { readFileSync, existsSync, openSync, readSync, closeSync, fstatSync } from "node:fs";

const IDPAKHEADER = 0x4b434150; // little-endian 'PACK'
const DPACKFILE_SIZE = 56 + 4 + 4; // name[56] + filepos + filelen

export interface RetailPakEntry {
  name: string;
  filepos: number;
  filelen: number;
}

/*
Reads a PACK file's directory only (not its contents) -- cheap even for a
~1.7GB pak, since only the trailing directory blob (a few hundred KB here)
is read into memory.
*/
export function readPakDirectory(pakPath: string): RetailPakEntry[] {
  const fd = openSync(pakPath, "r");
  try {
    const headerBuf = Buffer.alloc(12);
    readSync(fd, headerBuf, 0, 12, 0);
    const ident = headerBuf.readInt32LE(0);
    const dirofs = headerBuf.readInt32LE(4);
    const dirlen = headerBuf.readInt32LE(8);
    if (ident !== IDPAKHEADER) throw new Error(`${pakPath}: not a PACK file`);

    const numfiles = Math.floor(dirlen / DPACKFILE_SIZE);
    const dirBuf = Buffer.alloc(dirlen);
    readSync(fd, dirBuf, 0, dirlen, dirofs);

    const out: RetailPakEntry[] = [];
    for (let i = 0; i < numfiles; i++) {
      const base = i * DPACKFILE_SIZE;
      const nameBuf = dirBuf.subarray(base, base + 56);
      const nul = nameBuf.indexOf(0);
      const name = nameBuf.toString("ascii", 0, nul === -1 ? 56 : nul);
      const filepos = dirBuf.readInt32LE(base + 56);
      const filelen = dirBuf.readInt32LE(base + 60);
      out.push({ name, filepos, filelen });
    }
    return out;
  } finally {
    closeSync(fd);
  }
}

/*
Reads one entry's raw bytes out of the pak at `pakPath`, given the entry's
own {filepos, filelen} (from readPakDirectory).
*/
export function readPakEntry(pakPath: string, entry: RetailPakEntry): Uint8Array {
  const fd = openSync(pakPath, "r");
  try {
    const buf = Buffer.alloc(entry.filelen);
    readSync(fd, buf, 0, entry.filelen, entry.filepos);
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  } finally {
    closeSync(fd);
  }
}

export const RETAIL_ROOT = "/home/buzzkill/q2rets/rerelease";
export const RETAIL_PAK0 = `${RETAIL_ROOT}/baseq2/pak0.pak`;

export function retailAssetsAvailable(): boolean {
  return existsSync(RETAIL_PAK0);
}

/*
Lists every maps/mgu*.bsp entry in the retail pak0.pak's directory (the
"Call of the Machine" campaign maps), sorted by name for stable test output.
*/
export function listMguMapEntries(): RetailPakEntry[] {
  return readPakDirectory(RETAIL_PAK0)
    .filter((e) => /^maps\/mgu.*\.bsp$/i.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}
