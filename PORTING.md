# Quake 2 (v3.19 GPL) → TypeScript port conventions

Source tree: `../quake-2-c` (id Software release, readme.txt). Runtime: bun.
Every worker follows this file. It is the contract; the check gate is `bun run check`.

## Directory and file mapping

| C | TS |
|---|---|
| `game/q_shared.h`, `game/q_shared.c` | `src/shared/q_shared.ts` (types + constants) and `src/shared/math.ts` (vector/angle/COM_Parse helpers) |
| `qcommon/*.c` | `src/qcommon/<basename>.ts` |
| `qcommon/qcommon.h`, `qfiles.h` | `src/qcommon/qcommon.ts`, `src/qcommon/qfiles.ts` |
| `server/*.c`, `server/server.h` | `src/server/<basename>.ts`, `src/server/server.ts` |
| `game/*.c`, `game/g_local.h`, `game/game.h` | `src/game/<basename>.ts`, `src/game/g_local.ts`, `src/game/game.ts` |
| `game/m_<monster>.h` (frame indices) | `src/game/m_<monster>_frames.ts` |
| `client/*.c`, headers | `src/client/<basename>.ts` |
| `ref_soft/r_*.c` (C only; `.asm` files are hand-optimized duplicates of the C paths and are not ported) | `src/ref_soft/<basename>.ts` |
| `linux/ win32/ solaris/ irix/` | `src/platform/` — ONE bun implementation of the sys/net/vid/snd interfaces (`sys.ts`, `net_udp.ts`, `vid.ts`, `snd.ts`). The per-OS dirs are alternative implementations of the same interface and are not transliterated. |
| `null/*.c` | `src/null/<basename>.ts` (headless client stubs for the dedicated server) |
| `ctf/` | `src/ctf/` (last track; copies `src/game` structure) |
| `ref_gl/` | not ported (no OpenGL binding under bun); documented here |

Entry point: `src/main.ts` (Qcommon_Init + frame loop, dedicated-server configuration).

## Core data shapes

- `type Vec3 = Float32Array` (length 3), created by `vec3()` in `src/shared/math.ts`. Float32Array keeps C `float` semantics. Vector functions keep C out-param style: `VectorAdd(a, b, out)`. Never return fresh arrays on hot paths.
- C `int` arithmetic truncates: use `| 0` after division/multiplication where C used ints; `>>> 0` where C used unsigned. Bit ops already coerce to int32.
- C structs → `class` with every field initialized in the declaration (no optional fields for always-present data). Structs that are pure data with no methods stay classes anyway, so `new EdictT()` mirrors `memset(ent, 0, ...)` re-init via a `clear()` method when the C code memsets.
- C function pointers → typed function fields, `null` when C uses NULL: `think: ((self: EdictT) => void) | null`. Model callback sets with named type aliases in `g_local.ts`.
- `qboolean` → `boolean`. C truthiness on ints/pointers becomes explicit (`!== 0`, `!== null`).
- C enums → TS `enum` with the same numeric values (they cross the network protocol). `#define` constants → `export const NAME = value as const` (plain `export const NAME = 3;` is fine).
- Fixed-size C arrays → plain `T[]` initialized to length with a fill, or `Float32Array`/`Uint8Array`/`Int32Array` when the C type is numeric and indexed heavily.
- `sizebuf_t` → `SizeBuf` class over a `Uint8Array` + `DataView` in `src/qcommon/sizebuf.ts`; MSG_Write*/MSG_Read* stay byte-exact with the C wire format (little-endian).
- Binary file formats (BSP `qfiles.h`, MD2, WAL, PCX, PAK) → parsed from `ArrayBuffer` with `DataView`, struct-by-struct, offsets matching the C layout.

## Globals and module structure

- Shared mutable globals (`level`, `game`, `sv`, `svs`, `cls`, …) become exported `const` singleton objects mutated in place, declared in the module that owns them in C. They are never reassigned; C code that memsets them calls their `clear()`.
- C globals that are reassigned pointers (`g_edicts`, `currentmove`) become fields on their owning singleton or a small exported holder object.
- The game/engine boundary keeps the DLL shape: `game_import_t` → `interface GameImports`, `game_export_t` → `interface GameExports` in `src/game/game.ts`. The server constructs a `GameImports` object and calls `GetGameAPI(gi)`; nothing else crosses that boundary.
- Header modules (`g_local.ts`, `server.ts`, `client.ts`, `qcommon.ts`) hold shared types, constants, and singletons. Use `import type` for type-only imports. If two modules need each other's values at load time, move the shared value into the header module instead of importing sideways.

## Idiom map

- `Com_Error(ERR_DROP, ...)` / `longjmp` recovery → `class ComError extends Error { constructor(public code: number, message: string) }` thrown, caught by `try/catch` in `Qcommon_Frame`. `Sys_Error` → `class SysError`. Never `throw` bare strings.
- varargs `printf` style → `Com_sprintf(fmt, ...args)` ported in `src/shared/q_shared.ts` supporting `%s %d %i %u %f %g %c %x %%` with width/precision as used by the codebase; `va()` → template literals at call sites are fine when the format is trivial.
- `strcpy/strncpy/Q_strcasecmp/strtok` patterns → string operations; `COM_Parse(data)` keeps its C signature via a parse-state object `{ data: string; index: number }` returning the token.
- `Z_Malloc/Z_Free/Hunk_*/Z_TagMalloc` → plain allocation; tag-freeing loops become explicit list clears. Report any place where tag semantics carry logic.
- `#ifdef WIN32/__linux__/id386/BIG_ENDIAN` → take the portable little-endian C path; list dropped branches in your report. `#if 0` blocks are dropped silently.
- `goto` → restructure with early return, labeled break, or a small state flag; keep the original control flow order.
- `rand()`/`random()`/`crandom()` → helpers in `src/shared/math.ts` using `Math.random()` (determinism across runs is not a goal; determinism within the C algorithms that seed explicitly must be preserved with a ported LCG).
- `Sys_Milliseconds` → monotonic clock in `src/platform/sys.ts`.
- File I/O: `node:fs` sync calls inside `src/platform` and `src/qcommon/files.ts` only. PAK archives are parsed per `qfiles.h`.
- UDP networking: `Bun.udpSocket` inside `src/platform/net_udp.ts`, presenting the `NET_*`/`netadr_t` interface from `qcommon.h`.
- No `console.log` outside `src/platform/sys.ts` (Sys_ConsoleOutput is the one print boundary).

## Type discipline (enforced)

`tsc --strict` with zero `any` (grep-gated, including `as any`, `<any>`, `any[]`). No `as` casts except `as const`; parse external bytes/strings into typed shapes at the boundary and trust the types inside. Discriminated unions where the C code switches on a type tag. Exhaustive switches get `default: { const _exhaustive: never = x; }` only where the input type is closed.

## What "done" means for a unit

`bun run check` passes with the unit's files included, the module exports what its C header exported, and TODOs are absent — a function you cannot port faithfully is a reported deviation, not a `// TODO`.
