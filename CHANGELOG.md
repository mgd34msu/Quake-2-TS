# Changelog

## v1.2.1 — 2026-09-01

### Video UX patch
- Every menu slider shows a live value readout (resolution scale marks
  "1.00x (native)").
- New "scale to fullscreen" toggle (vid_scale_fit, default on), plus
  the underlying fix: fullscreen blit geometry used the requested mode
  size while the window silently resized to desktop-native (the
  corner-anchored small-image bug).
- Fullscreen renders at the selected mode and fills the display; no
  physical mode switching.
- Mode list shows aspect ratios on every entry and 720p/1080p/1440p/
  2160p names where standard.
- Video settings (fullscreen included) persist across restarts;
  gl_mode/sw_mode were missing the archive flag in one path.

## v1.2.0 — 2026-09-01

### Features
- Video: one flat, strictly ascending mode table from 320x240 through
  3840x2160 (adds 1280x720, 1366x768, 1440x900, 1600x900, 1920x1080,
  1920x1200, 2560x1080, 2560x1440, 3440x1440, 4K), with custom
  resolution fields (r_customwidth/r_customheight) and render-resolution
  scaling (vid_scale) in the video menu.
- Console/menu version banner ("Quake 2 Typescript v1.2.0").
- QBSP extended-format maps load in collision and both renderers.

### Fixes
- FS_NextPath infinite hang (pointer-identity porting bug): Player Setup
  and no-match `dir` commands no longer freeze on pak-only installs.
- Cvar parity restored against vanilla 3.21 (missing cvars registered,
  defaults verified against the C source).
- Command parity: `download` is registered.
- QBSP work surfaced two genuine fixes: signed-to-unsigned
  face/marksurface reads and a software-renderer surface-extents clamp.

### Fidelity
- Reverted an accidental port of re-release wheel machinery; this tree
  matches vanilla 3.21 behavior exactly, with vanilla's own original
  quirks preserved on purpose.

### Testing
- Sky-rotation angle math pinned against time-unit regressions.
- Full-suite order-independence: 1385/1385 across three forward runs and
  one reversed-order run.
