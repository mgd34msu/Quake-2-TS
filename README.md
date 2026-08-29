# Quake 2 TS

A complete, faithful TypeScript port of the Quake 2 v3.21 GPL source
(id Software, 1997-2001), running on [Bun](https://bun.sh). Every C
subsystem is represented: engine core, server, game DLL (plus ThreeWave
CTF 1.52), full client, the software renderer, and the OpenGL renderer,
with SDL2 (via `bun:ffi`) as the single platform layer for video, audio,
and input.

- Strict TypeScript: zero `any`, no casts (`as const` excepted)
- Bug-for-bug fidelity to the C where observable; deviations documented
  in file headers and `PORTING.md`
- Both renderers selectable at runtime: `vid_ref soft` / `vid_ref gl`

## Running

Requires the original game data (`pak0.pak` etc. from a Quake 2
installation) in `baseq2/` next to the working directory, and libSDL2.

```sh
bun install
bun src/main.ts +set basedir /path/to/gamedir           # software renderer
bun src/main.ts +set basedir /path/to/gamedir +set vid_ref gl +set gl_mode 10
```

Or compile a standalone binary:

```sh
bun build --compile src/main.ts --outfile q2ts
```

`+set vid_fullscreen 0` for windowed; video modes 0-10 (mode 10 =
1920x1080). Dedicated server: `+set dedicated 1`.

## License

GPL v2, same as the original source release this is derived from -- see
`LICENSE`. Quake II is a registered trademark of id Software, Inc. The
game assets are not included and remain under their original terms.
