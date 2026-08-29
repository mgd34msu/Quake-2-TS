/*
Copyright (C) 1997-2001 Id Software, Inc.
Ported from ref_gl/qgl.h (GNU GPL v2 or later) plus linux/qgl_linux.c's
dlsym-based loading of the same table (also GPL v2 or later; win32/qgl_win.c
and irix/qgl_irix.c are the per-OS alternates for the same table and are not
separately ported, per PORTING.md's platform mapping -- one bun implementation
covers all three).

qgl.h declares one function-pointer variable per OpenGL 1.1 entry point plus
a handful of vendor extensions (~340 total: every overload of qglColor*,
qglVertex*, qglRasterPos*, etc, most never called by this game's renderer).
QGL below is narrowed to exactly the qgl* names the ref_gl/gl_*.c tree calls
(grepped across gl_draw.c, gl_image.c, gl_light.c, gl_mesh.c, gl_model.c,
gl_rmain.c, gl_rmisc.c, gl_rsurf.c, gl_warp.c: 59 entry points). A future unit
porting one of those .c files for real that turns out to need an additional
qgl* entry point extends this interface and both implementations below --
same shape as PORTING.md's "report the mismatch" idiom for header
placement, applied to an interface surface instead of a file.

`QGL_Init(dllname)` / `QGL_Shutdown()` (the two actual function prototypes
qgl.h declares, as opposed to the function-pointer table) become
`loadQGLFromSystem()` below; there is no `QGL_Shutdown` counterpart because
nothing in this scaffold's reachable call graph invokes it yet (reported
gap -- add one alongside GLimp_Shutdown when gl_rmain.ts's real R_Shutdown
lands).
*/

import { dlopen, FFIType, type Library, type Pointer } from "bun:ffi";

// GL entry points that take `const GLfloat *` / `const GLuint *` / `const
// GLvoid *` etc pass a small fixed-size C array in every call site this
// port will ever make (a color, a 4x4 matrix, a texture's pixel buffer) --
// never an opaque heap pointer manufactured elsewhere. bun:ffi accepts
// either a raw `Pointer` or the backing TypedArray directly for an
// `FFIType.ptr` parameter, so QGL's pointer-taking members accept either,
// matching this unit's brief ("pointers as `Pointer | TypedArray` where the
// C passes arrays").
export type GLArray = Float32Array | Uint8Array | Uint32Array | Int32Array | Uint16Array;
export type GLPointer = Pointer | GLArray | null;

// The typed function-pointer table qgl_linux.c/qgl_win.c populate at
// runtime. Every member name and parameter list matches qgl.h's extern
// declaration for that entry point exactly (GLenum/GLbitfield/GLint/
// GLsizei/GLuint -> number, GLboolean -> boolean, GLfloat/GLclampf/
// GLdouble/GLclampd -> number, pointers -> GLPointer).
export interface QGL {
  qglAlphaFunc(func: number, ref: number): void;
  qglArrayElement(i: number): void;
  qglBegin(mode: number): void;
  qglBindTexture(target: number, texture: number): void;
  qglBlendFunc(sfactor: number, dfactor: number): void;
  qglClear(mask: number): void;
  qglClearColor(red: number, green: number, blue: number, alpha: number): void;
  qglColor3f(red: number, green: number, blue: number): void;
  qglColor3fv(v: GLPointer): void;
  qglColor4f(red: number, green: number, blue: number, alpha: number): void;
  qglColor4fv(v: GLPointer): void;
  qglColor4ubv(v: GLPointer): void;
  qglColorPointer(size: number, type: number, stride: number, pointer: GLPointer): void;
  qglColorTableEXT(target: number, internalformat: number, width: number, format: number, type: number, table: GLPointer): void;
  qglCullFace(mode: number): void;
  qglDeleteTextures(n: number, textures: GLPointer): void;
  qglDepthFunc(func: number): void;
  qglDepthMask(flag: boolean): void;
  qglDepthRange(zNear: number, zFar: number): void;
  qglDisable(cap: number): void;
  qglDrawBuffer(mode: number): void;
  qglEnable(cap: number): void;
  qglEnableClientState(array: number): void;
  qglEnd(): void;
  qglFinish(): void;
  qglFrustum(left: number, right: number, bottom: number, top: number, zNear: number, zFar: number): void;
  qglGetError(): number;
  qglGetFloatv(pname: number, params: GLPointer): void;
  qglGetString(name: number): Pointer | null;
  qglLoadIdentity(): void;
  qglLoadMatrixf(m: GLPointer): void;
  qglLockArraysEXT(first: number, count: number): void;
  qglMatrixMode(mode: number): void;
  qglMTexCoord2fSGIS(target: number, s: number, t: number): void;
  qglOrtho(left: number, right: number, bottom: number, top: number, zNear: number, zFar: number): void;
  qglPointParameterfEXT(param: number, value: number): void;
  qglPointParameterfvEXT(param: number, value: GLPointer): void;
  qglPointSize(size: number): void;
  qglPolygonMode(face: number, mode: number): void;
  qglPopMatrix(): void;
  qglPushMatrix(): void;
  qglReadPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: GLPointer): void;
  qglRotatef(angle: number, x: number, y: number, z: number): void;
  qglScalef(x: number, y: number, z: number): void;
  qglScissor(x: number, y: number, width: number, height: number): void;
  qglSelectTextureSGIS(target: number): void;
  qglShadeModel(mode: number): void;
  qglTexCoord2f(s: number, t: number): void;
  qglTexEnvf(target: number, pname: number, param: number): void;
  qglTexImage2D(target: number, level: number, internalformat: number, width: number, height: number, border: number, format: number, type: number, pixels: GLPointer): void;
  qglTexParameterf(target: number, pname: number, param: number): void;
  qglTexSubImage2D(target: number, level: number, xoffset: number, yoffset: number, width: number, height: number, format: number, type: number, pixels: GLPointer): void;
  qglTranslatef(x: number, y: number, z: number): void;
  qglUnlockArraysEXT(): void;
  qglVertex2f(x: number, y: number): void;
  qglVertex3f(x: number, y: number, z: number): void;
  qglVertex3fv(v: GLPointer): void;
  qglVertexPointer(size: number, type: number, stride: number, pointer: GLPointer): void;
  qglViewport(x: number, y: number, width: number, height: number): void;
}

export interface QGLCall {
  readonly name: string;
  readonly args: readonly unknown[];
}

// The test seam this unit's brief asks for: a QGL implementation that does
// no real GL work and instead records every call, in order. Once a real
// gl_*.ts unit lands, its tests assert against `.calls` the same way a
// mocked import boundary would in a non-FFI codebase -- "GL correctness" for
// this renderer becomes "the recorded qgl* call sequence matches the
// sequence R_RenderView/R_DrawWorld/etc make in the original C".
export class QGLRecording implements QGL {
  readonly calls: QGLCall[] = [];

  clear(): void {
    this.calls.length = 0;
  }

  private record(name: string, args: readonly unknown[]): void {
    this.calls.push({ name, args });
  }

  qglAlphaFunc(func: number, ref: number): void {
    this.record("qglAlphaFunc", [func, ref]);
  }
  qglArrayElement(i: number): void {
    this.record("qglArrayElement", [i]);
  }
  qglBegin(mode: number): void {
    this.record("qglBegin", [mode]);
  }
  qglBindTexture(target: number, texture: number): void {
    this.record("qglBindTexture", [target, texture]);
  }
  qglBlendFunc(sfactor: number, dfactor: number): void {
    this.record("qglBlendFunc", [sfactor, dfactor]);
  }
  qglClear(mask: number): void {
    this.record("qglClear", [mask]);
  }
  qglClearColor(red: number, green: number, blue: number, alpha: number): void {
    this.record("qglClearColor", [red, green, blue, alpha]);
  }
  qglColor3f(red: number, green: number, blue: number): void {
    this.record("qglColor3f", [red, green, blue]);
  }
  qglColor3fv(v: GLPointer): void {
    this.record("qglColor3fv", [v]);
  }
  qglColor4f(red: number, green: number, blue: number, alpha: number): void {
    this.record("qglColor4f", [red, green, blue, alpha]);
  }
  qglColor4fv(v: GLPointer): void {
    this.record("qglColor4fv", [v]);
  }
  qglColor4ubv(v: GLPointer): void {
    this.record("qglColor4ubv", [v]);
  }
  qglColorPointer(size: number, type: number, stride: number, pointer: GLPointer): void {
    this.record("qglColorPointer", [size, type, stride, pointer]);
  }
  qglColorTableEXT(target: number, internalformat: number, width: number, format: number, type: number, table: GLPointer): void {
    this.record("qglColorTableEXT", [target, internalformat, width, format, type, table]);
  }
  qglCullFace(mode: number): void {
    this.record("qglCullFace", [mode]);
  }
  qglDeleteTextures(n: number, textures: GLPointer): void {
    this.record("qglDeleteTextures", [n, textures]);
  }
  qglDepthFunc(func: number): void {
    this.record("qglDepthFunc", [func]);
  }
  qglDepthMask(flag: boolean): void {
    this.record("qglDepthMask", [flag]);
  }
  qglDepthRange(zNear: number, zFar: number): void {
    this.record("qglDepthRange", [zNear, zFar]);
  }
  qglDisable(cap: number): void {
    this.record("qglDisable", [cap]);
  }
  qglDrawBuffer(mode: number): void {
    this.record("qglDrawBuffer", [mode]);
  }
  qglEnable(cap: number): void {
    this.record("qglEnable", [cap]);
  }
  qglEnableClientState(array: number): void {
    this.record("qglEnableClientState", [array]);
  }
  qglEnd(): void {
    this.record("qglEnd", []);
  }
  qglFinish(): void {
    this.record("qglFinish", []);
  }
  qglFrustum(left: number, right: number, bottom: number, top: number, zNear: number, zFar: number): void {
    this.record("qglFrustum", [left, right, bottom, top, zNear, zFar]);
  }
  qglGetError(): number {
    this.record("qglGetError", []);
    return 0; // GL_NO_ERROR
  }
  qglGetFloatv(pname: number, params: GLPointer): void {
    this.record("qglGetFloatv", [pname, params]);
  }
  qglGetString(name: number): Pointer | null {
    this.record("qglGetString", [name]);
    return null;
  }
  qglLoadIdentity(): void {
    this.record("qglLoadIdentity", []);
  }
  qglLoadMatrixf(m: GLPointer): void {
    this.record("qglLoadMatrixf", [m]);
  }
  qglLockArraysEXT(first: number, count: number): void {
    this.record("qglLockArraysEXT", [first, count]);
  }
  qglMatrixMode(mode: number): void {
    this.record("qglMatrixMode", [mode]);
  }
  qglMTexCoord2fSGIS(target: number, s: number, t: number): void {
    this.record("qglMTexCoord2fSGIS", [target, s, t]);
  }
  qglOrtho(left: number, right: number, bottom: number, top: number, zNear: number, zFar: number): void {
    this.record("qglOrtho", [left, right, bottom, top, zNear, zFar]);
  }
  qglPointParameterfEXT(param: number, value: number): void {
    this.record("qglPointParameterfEXT", [param, value]);
  }
  qglPointParameterfvEXT(param: number, value: GLPointer): void {
    this.record("qglPointParameterfvEXT", [param, value]);
  }
  qglPointSize(size: number): void {
    this.record("qglPointSize", [size]);
  }
  qglPolygonMode(face: number, mode: number): void {
    this.record("qglPolygonMode", [face, mode]);
  }
  qglPopMatrix(): void {
    this.record("qglPopMatrix", []);
  }
  qglPushMatrix(): void {
    this.record("qglPushMatrix", []);
  }
  qglReadPixels(x: number, y: number, width: number, height: number, format: number, type: number, pixels: GLPointer): void {
    this.record("qglReadPixels", [x, y, width, height, format, type, pixels]);
  }
  qglRotatef(angle: number, x: number, y: number, z: number): void {
    this.record("qglRotatef", [angle, x, y, z]);
  }
  qglScalef(x: number, y: number, z: number): void {
    this.record("qglScalef", [x, y, z]);
  }
  qglScissor(x: number, y: number, width: number, height: number): void {
    this.record("qglScissor", [x, y, width, height]);
  }
  qglSelectTextureSGIS(target: number): void {
    this.record("qglSelectTextureSGIS", [target]);
  }
  qglShadeModel(mode: number): void {
    this.record("qglShadeModel", [mode]);
  }
  qglTexCoord2f(s: number, t: number): void {
    this.record("qglTexCoord2f", [s, t]);
  }
  qglTexEnvf(target: number, pname: number, param: number): void {
    this.record("qglTexEnvf", [target, pname, param]);
  }
  qglTexImage2D(target: number, level: number, internalformat: number, width: number, height: number, border: number, format: number, type: number, pixels: GLPointer): void {
    this.record("qglTexImage2D", [target, level, internalformat, width, height, border, format, type, pixels]);
  }
  qglTexParameterf(target: number, pname: number, param: number): void {
    this.record("qglTexParameterf", [target, pname, param]);
  }
  qglTexSubImage2D(target: number, level: number, xoffset: number, yoffset: number, width: number, height: number, format: number, type: number, pixels: GLPointer): void {
    this.record("qglTexSubImage2D", [target, level, xoffset, yoffset, width, height, format, type, pixels]);
  }
  qglTranslatef(x: number, y: number, z: number): void {
    this.record("qglTranslatef", [x, y, z]);
  }
  qglUnlockArraysEXT(): void {
    this.record("qglUnlockArraysEXT", []);
  }
  qglVertex2f(x: number, y: number): void {
    this.record("qglVertex2f", [x, y]);
  }
  qglVertex3f(x: number, y: number, z: number): void {
    this.record("qglVertex3f", [x, y, z]);
  }
  qglVertex3fv(v: GLPointer): void {
    this.record("qglVertex3fv", [v]);
  }
  qglVertexPointer(size: number, type: number, stride: number, pointer: GLPointer): void {
    this.record("qglVertexPointer", [size, type, stride, pointer]);
  }
  qglViewport(x: number, y: number, width: number, height: number): void {
    this.record("qglViewport", [x, y, width, height]);
  }
}

// linux/qgl_linux.c's QGL_Init() dlopen()s `gl_driver`'s value (cvar,
// default "libGL.so.1") and dlsym()s each table entry under its real GL name
// (the "q" prefix is stripped: qglAlphaFunc -> "glAlphaFunc"); qgl_win.c does
// the same against "opengl32.dll"; irix/qgl_irix.c against "libGL.so". This
// is that loader's portable bun:ffi equivalent, minus the per-OS branch (one
// path per PORTING.md's platform-mapping rule) -- the macOS OpenGL framework
// path is included too since Bun runs there, though the original engine
// never shipped a mac ref_gl.
function resolveSystemGLLibraryPath(): string {
  switch (process.platform) {
    case "win32":
      return "opengl32.dll";
    case "darwin":
      return "/System/Library/Frameworks/OpenGL.framework/OpenGL";
    default:
      return "libGL.so.1";
  }
}

const ptr = FFIType.ptr;
const f32 = FFIType.f32;
const f64 = FFIType.f64;
const i32 = FFIType.i32;
const u32 = FFIType.u32;
const bool = FFIType.bool;
const voidType = FFIType.void;

// FFIType symbol table for dlopen(), one entry per QGL member, keyed by the
// real (unprefixed) GL symbol name a dlsym() lookup expects.
const glSymbols = {
  glAlphaFunc: { args: [u32, f32], returns: voidType },
  glArrayElement: { args: [i32], returns: voidType },
  glBegin: { args: [u32], returns: voidType },
  glBindTexture: { args: [u32, u32], returns: voidType },
  glBlendFunc: { args: [u32, u32], returns: voidType },
  glClear: { args: [u32], returns: voidType },
  glClearColor: { args: [f32, f32, f32, f32], returns: voidType },
  glColor3f: { args: [f32, f32, f32], returns: voidType },
  glColor3fv: { args: [ptr], returns: voidType },
  glColor4f: { args: [f32, f32, f32, f32], returns: voidType },
  glColor4fv: { args: [ptr], returns: voidType },
  glColor4ubv: { args: [ptr], returns: voidType },
  glColorPointer: { args: [i32, u32, i32, ptr], returns: voidType },
  glColorTableEXT: { args: [i32, i32, i32, i32, i32, ptr], returns: voidType },
  glCullFace: { args: [u32], returns: voidType },
  glDeleteTextures: { args: [i32, ptr], returns: voidType },
  glDepthFunc: { args: [u32], returns: voidType },
  glDepthMask: { args: [bool], returns: voidType },
  glDepthRange: { args: [f64, f64], returns: voidType },
  glDisable: { args: [u32], returns: voidType },
  glDrawBuffer: { args: [u32], returns: voidType },
  glEnable: { args: [u32], returns: voidType },
  glEnableClientState: { args: [u32], returns: voidType },
  glEnd: { args: [], returns: voidType },
  glFinish: { args: [], returns: voidType },
  glFrustum: { args: [f64, f64, f64, f64, f64, f64], returns: voidType },
  glGetError: { args: [], returns: u32 },
  glGetFloatv: { args: [u32, ptr], returns: voidType },
  glGetString: { args: [u32], returns: ptr },
  glLoadIdentity: { args: [], returns: voidType },
  glLoadMatrixf: { args: [ptr], returns: voidType },
  glLockArraysEXT: { args: [i32, i32], returns: voidType },
  glMatrixMode: { args: [u32], returns: voidType },
  glMTexCoord2fSGIS: { args: [u32, f32, f32], returns: voidType },
  glOrtho: { args: [f64, f64, f64, f64, f64, f64], returns: voidType },
  glPointParameterfEXT: { args: [u32, f32], returns: voidType },
  glPointParameterfvEXT: { args: [u32, ptr], returns: voidType },
  glPointSize: { args: [f32], returns: voidType },
  glPolygonMode: { args: [u32, u32], returns: voidType },
  glPopMatrix: { args: [], returns: voidType },
  glPushMatrix: { args: [], returns: voidType },
  glReadPixels: { args: [i32, i32, i32, i32, u32, u32, ptr], returns: voidType },
  glRotatef: { args: [f32, f32, f32, f32], returns: voidType },
  glScalef: { args: [f32, f32, f32], returns: voidType },
  glScissor: { args: [i32, i32, i32, i32], returns: voidType },
  glSelectTextureSGIS: { args: [u32], returns: voidType },
  glShadeModel: { args: [u32], returns: voidType },
  glTexCoord2f: { args: [f32, f32], returns: voidType },
  glTexEnvf: { args: [u32, u32, f32], returns: voidType },
  glTexImage2D: { args: [u32, i32, i32, i32, i32, i32, u32, u32, ptr], returns: voidType },
  glTexParameterf: { args: [u32, u32, f32], returns: voidType },
  glTexSubImage2D: { args: [u32, i32, i32, i32, i32, i32, u32, u32, ptr], returns: voidType },
  glTranslatef: { args: [f32, f32, f32], returns: voidType },
  glUnlockArraysEXT: { args: [], returns: voidType },
  glVertex2f: { args: [f32, f32], returns: voidType },
  glVertex3f: { args: [f32, f32, f32], returns: voidType },
  glVertex3fv: { args: [ptr], returns: voidType },
  glVertexPointer: { args: [i32, u32, i32, ptr], returns: voidType },
  glViewport: { args: [i32, i32, i32, i32], returns: voidType },
} as const;

// Binds QGL against the real system OpenGL library via bun:ffi's dlopen().
//
// This resolves every symbol with a plain dlsym() against the base library
// handle, exactly like qgl_linux.c. That is faithful for core GL 1.1 entry
// points, but the GLX/WGL spec does not guarantee `*_EXT`/`*_SGIS` extension
// symbols resolve correctly without a *current* GL context -- which this
// function cannot create (there is no window/surface here). The real
// context-aware path is `SDL_GL_GetProcAddress`, to be wired up once the
// sibling src/platform/sdl.ts unit lands and GLimp_Init calls it; until
// then this loader is only safe to call after a GL context has already been
// made current by that future code, and is otherwise gated by whatever
// error dlopen()/dlsym() itself raises for a library with no bound context.
export function loadQGLFromSystem(): QGL {
  const libraryPath = resolveSystemGLLibraryPath();

  let lib: Library<typeof glSymbols>;
  try {
    lib = dlopen(libraryPath, glSymbols);
  } catch (err) {
    throw new Error(
      `loadQGLFromSystem: failed to load ${libraryPath} -- this needs a GL context ` +
        `(a window/surface must exist first; that binding path is src/platform/sdl.ts's ` +
        `SDL_GL_GetProcAddress, not yet wired up here): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const s = lib.symbols;
  return {
    qglAlphaFunc: (func, ref) => s.glAlphaFunc(func, ref),
    qglArrayElement: (i) => s.glArrayElement(i),
    qglBegin: (mode) => s.glBegin(mode),
    qglBindTexture: (target, texture) => s.glBindTexture(target, texture),
    qglBlendFunc: (sfactor, dfactor) => s.glBlendFunc(sfactor, dfactor),
    qglClear: (mask) => s.glClear(mask),
    qglClearColor: (red, green, blue, alpha) => s.glClearColor(red, green, blue, alpha),
    qglColor3f: (red, green, blue) => s.glColor3f(red, green, blue),
    qglColor3fv: (v) => s.glColor3fv(v),
    qglColor4f: (red, green, blue, alpha) => s.glColor4f(red, green, blue, alpha),
    qglColor4fv: (v) => s.glColor4fv(v),
    qglColor4ubv: (v) => s.glColor4ubv(v),
    qglColorPointer: (size, type, stride, pointer) => s.glColorPointer(size, type, stride, pointer),
    qglColorTableEXT: (target, internalformat, width, format, type, table) => s.glColorTableEXT(target, internalformat, width, format, type, table),
    qglCullFace: (mode) => s.glCullFace(mode),
    qglDeleteTextures: (n, textures) => s.glDeleteTextures(n, textures),
    qglDepthFunc: (func) => s.glDepthFunc(func),
    qglDepthMask: (flag) => s.glDepthMask(flag),
    qglDepthRange: (zNear, zFar) => s.glDepthRange(zNear, zFar),
    qglDisable: (cap) => s.glDisable(cap),
    qglDrawBuffer: (mode) => s.glDrawBuffer(mode),
    qglEnable: (cap) => s.glEnable(cap),
    qglEnableClientState: (array) => s.glEnableClientState(array),
    qglEnd: () => s.glEnd(),
    qglFinish: () => s.glFinish(),
    qglFrustum: (left, right, bottom, top, zNear, zFar) => s.glFrustum(left, right, bottom, top, zNear, zFar),
    qglGetError: () => s.glGetError(),
    qglGetFloatv: (pname, params) => s.glGetFloatv(pname, params),
    qglGetString: (name) => {
      // FFIType.ptr's return type is `Pointer | bigint | null`; glGetString
      // never actually returns a bigint (bun:ffi only produces one for a
      // pointer value too large for a safe JS number, which cannot happen
      // for a real C string pointer on any platform Bun targets) -- narrowed
      // with typeof rather than cast, per PORTING.md's "no `as` casts" rule.
      const result = s.glGetString(name);
      return typeof result === "bigint" ? null : result;
    },
    qglLoadIdentity: () => s.glLoadIdentity(),
    qglLoadMatrixf: (m) => s.glLoadMatrixf(m),
    qglLockArraysEXT: (first, count) => s.glLockArraysEXT(first, count),
    qglMatrixMode: (mode) => s.glMatrixMode(mode),
    qglMTexCoord2fSGIS: (target, sVal, tVal) => s.glMTexCoord2fSGIS(target, sVal, tVal),
    qglOrtho: (left, right, bottom, top, zNear, zFar) => s.glOrtho(left, right, bottom, top, zNear, zFar),
    qglPointParameterfEXT: (param, value) => s.glPointParameterfEXT(param, value),
    qglPointParameterfvEXT: (param, value) => s.glPointParameterfvEXT(param, value),
    qglPointSize: (size) => s.glPointSize(size),
    qglPolygonMode: (face, mode) => s.glPolygonMode(face, mode),
    qglPopMatrix: () => s.glPopMatrix(),
    qglPushMatrix: () => s.glPushMatrix(),
    qglReadPixels: (x, y, width, height, format, type, pixels) => s.glReadPixels(x, y, width, height, format, type, pixels),
    qglRotatef: (angle, x, y, z) => s.glRotatef(angle, x, y, z),
    qglScalef: (x, y, z) => s.glScalef(x, y, z),
    qglScissor: (x, y, width, height) => s.glScissor(x, y, width, height),
    qglSelectTextureSGIS: (target) => s.glSelectTextureSGIS(target),
    qglShadeModel: (mode) => s.glShadeModel(mode),
    qglTexCoord2f: (sVal, tVal) => s.glTexCoord2f(sVal, tVal),
    qglTexEnvf: (target, pname, param) => s.glTexEnvf(target, pname, param),
    qglTexImage2D: (target, level, internalformat, width, height, border, format, type, pixels) =>
      s.glTexImage2D(target, level, internalformat, width, height, border, format, type, pixels),
    qglTexParameterf: (target, pname, param) => s.glTexParameterf(target, pname, param),
    qglTexSubImage2D: (target, level, xoffset, yoffset, width, height, format, type, pixels) =>
      s.glTexSubImage2D(target, level, xoffset, yoffset, width, height, format, type, pixels),
    qglTranslatef: (x, y, z) => s.glTranslatef(x, y, z),
    qglUnlockArraysEXT: () => s.glUnlockArraysEXT(),
    qglVertex2f: (x, y) => s.glVertex2f(x, y),
    qglVertex3f: (x, y, z) => s.glVertex3f(x, y, z),
    qglVertex3fv: (v) => s.glVertex3fv(v),
    qglVertexPointer: (size, type, stride, pointer) => s.glVertexPointer(size, type, stride, pointer),
    qglViewport: (x, y, width, height) => s.glViewport(x, y, width, height),
  };
}
