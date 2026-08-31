/*
Ported from q2repro's BSPX directory format (GNU GPL v2 or later):
inc/format/bsp.h's BSPXHEADER/xlump_t, src/common/bsp.c's
BSP_ParseExtensionHeader.

BSPX is a small optional trailer directory appended after a BSP file's
normal lump data, used by retail's Call of the Machine maps
(maps/mgu*.bsp, QBSP extended format) to carry extra per-face data
(DECOUPLED_LM et al.) that doesn't fit the classic dlump table. Locating it
works identically for IBSP and QBSP -- the directory starts at the highest
byte offset reached by any of the header's own lumps, 4-byte aligned -- so
this module has no format-specific branch; the caller (cmodel.ts,
gl_model.ts, r_model.ts) just needs to make sure a present-but-unparsed
BSPX trailer never gets misread as map data (it sits past every lump's own
fileofs+filelen, so a loader that only reads the lumps it knows about
already ignores it) and, for the renderers, to look up DECOUPLED_LM.
*/

export interface BspxLump {
  fileofs: number;
  filelen: number;
}

// little-endian "BSPX" (inc/format/bsp.h: MakeLittleLong('B','S','P','X'))
const BSPXHEADER = ("X".charCodeAt(0) << 24) + ("P".charCodeAt(0) << 16) + ("S".charCodeAt(0) << 8) + "B".charCodeAt(0);

const XLUMP_NAME_LEN = 24;
const XLUMP_T_SIZE = XLUMP_NAME_LEN + 4 + 4; // char name[24] + uint32 fileofs + uint32 filelen

function align4(n: number): number {
  return (n + 3) & ~3;
}

function readCString(view: DataView, offset: number, maxLen: number): string {
  let s = "";
  for (let i = 0; i < maxLen; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

/*
findBspxDirectory

`maxpos` is the highest (fileofs + filelen) reached by any of the BSP's own
declared lumps -- the caller computes this the same way bsp.c's BSP_Load
does, folding max(maxpos, ofs + len) over every header lump while validating
the lump table. Returns a name -> {fileofs, filelen} map of every BSPX lump
found in the trailer directory, or null if there is no BSPX directory at all
(the common case: most maps, classic or QBSP, don't carry one).

Ported field-for-field from BSP_ParseExtensionHeader: same alignment, same
"numlumps must fit in the remaining file" bounds check, same per-entry
skip rules (zero-length lump, out-of-bounds lump, duplicate name -- bsp.c
warns and ignores in all three cases, it doesn't fail the whole load).
*/
export function findBspxDirectory(buf: Uint8Array, maxpos: number, filelen: number): Map<string, BspxLump> | null {
  const pos0 = align4(maxpos);
  if (pos0 > filelen - 8) return null;

  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (view.getUint32(pos0, true) !== (BSPXHEADER >>> 0)) return null;

  const numlumps = view.getUint32(pos0 + 4, true);
  const pos = pos0 + 8;
  if (numlumps > (filelen - pos) / XLUMP_T_SIZE) return null; // "Bad BSPX header"

  const out = new Map<string, BspxLump>();
  for (let i = 0; i < numlumps; i++) {
    const base = pos + i * XLUMP_T_SIZE;
    const name = readCString(view, base, XLUMP_NAME_LEN);
    const fileofs = view.getUint32(base + XLUMP_NAME_LEN, true);
    const lumpfilelen = view.getUint32(base + XLUMP_NAME_LEN + 4, true);

    if (lumpfilelen === 0) continue; // "Ignoring empty %s lump"
    if (fileofs + lumpfilelen > filelen) continue; // "Ignoring out of bounds %s lump"
    if (out.has(name)) continue; // "Ignoring duplicate %s lump"

    out.set(name, { fileofs, filelen: lumpfilelen });
  }
  return out;
}

/*
DECOUPLED_LM lump, ported from bsp.c's BSP_ParseDecoupledLM / DECOUPLED_LM_BYTES.
Per-face record, 40 bytes: lm_width(u16) lm_height(u16) offset(u32,
0xFFFFFFFF = no lightmap) lm_axis[2] (vec3 each) lm_offset[2] (float each).
Not consumed by this port yet (see report) -- exported so a future renderer
change can read it without re-deriving the byte layout; findBspxDirectory
above already makes sure its presence in a QBSP map's trailer never breaks
loading.
*/
export const DECOUPLED_LM_BYTES = 40;
export interface DecoupledLmRecord {
  lm_width: number;
  lm_height: number;
  offset: number; // -1 if no lightmap
  lm_axis: [[number, number, number], [number, number, number]];
  lm_offset: [number, number];
}
export function readDecoupledLmRecord(view: DataView, offset: number): DecoupledLmRecord {
  const lm_width = view.getUint16(offset, true);
  const lm_height = view.getUint16(offset + 2, true);
  const rawOfs = view.getUint32(offset + 4, true);
  const lm_axis: [[number, number, number], [number, number, number]] = [
    [view.getFloat32(offset + 8, true), view.getFloat32(offset + 12, true), view.getFloat32(offset + 16, true)],
    [view.getFloat32(offset + 24, true), view.getFloat32(offset + 28, true), view.getFloat32(offset + 32, true)],
  ];
  return {
    lm_width,
    lm_height,
    offset: rawOfs === 0xffffffff ? -1 : rawOfs,
    lm_axis,
    lm_offset: [view.getFloat32(offset + 20, true), view.getFloat32(offset + 36, true)],
  };
}
