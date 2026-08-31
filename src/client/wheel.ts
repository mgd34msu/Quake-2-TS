// wheel.c -- q2repro's client-side weapon-wheel state machine
// (/home/buzzkill/Projects/qsrc/q2repro/src/client/wheel.c, 623 lines), ported
// for the +wheel/-wheel/+wheel2/-wheel2 KEX default bindings (see
// input.c:433-436,737-742). cl_input.ts's IN_WeapNext/IN_WeapPrev is the
// port of wheel.c's other two bindings (cl_weapnext/cl_weapprev); see that
// file's banner for why they don't call CL_Wheel_Cycle below.
//
// This port has no rerelease/KEX game_api at all: no cgame host, no
// cl.wheel_data configstring block, no BUTTON_HOLSTER usercmd bit, no
// wheel/carousel HUD pics. Everything that leans on that machinery is
// substituted or cut, and is called out at each point below rather than
// silently dropped:
//
//   - cl.wheel_data / cgame->GetOwnedWeaponWheelWeapons / GetWeaponWheelAmmoCount
//     / GetPowerupWheelCount (client.h:157-192,404-414; wheel.c:59-69,257-298):
//     this client never receives a weapon-wheel data block from the server.
//     Substituted with the same data cl_inv.ts's CL_DrawInventory already
//     reads -- cl.inventory (svc_inventory quantities) and
//     cl.configstrings[CS_ITEMS + i] (item display names) -- as the wheel's
//     slot source. Every inventory item with a positive count becomes a
//     slot, in configstring-index order, not just weapons: this port has no
//     client-side IT_WEAPON/IT_POWERUP classification table (itemlist lives
//     only in src/game/g_items.ts and the mission-pack siblings, server-side
//     only) to filter or sort (wheel.c:244-253 wheel_slot_compare, cut) by.
//   - is_powerup_wheel / a separate powerup slot list (wheel.c:266-277,
//     300-302): cut for the same reason. CL_Wheel_Open(true) (+wheel2) opens
//     the same generic inventory-derived wheel as CL_Wheel_Open(false).
//   - `use_index_only <index>` (wheel.c:199,332): this port's game modules
//     (src/game/g_cmds.ts and its mission-pack siblings) only implement
//     `use <item name>` (Cmd_Use_f -> FindItem(gi.args())). Substituted with
//     `use "<configstring name>"`, the exact string cl_inv.ts's
//     CL_DrawInventory already builds for keybinding lookup (just never
//     executes it).
//   - BUTTON_HOLSTER while the wheel is open (wheel.c:188,360-361): cut.
//     src/shared/q_shared.ts's UsercmdT only carries BUTTON_ATTACK/USE/ANY;
//     adding a holster bit would mean changing the usercmd wire format
//     (net_chan delta encoding) and what the server does with it -- well
//     outside a client input-layer port. +holster/-holster (cl_input.ts) is
//     registered as a plain kbutton_t for parity/testability only.
//   - get_wheel_draw_size() (wheel.c:335-352) and CL_Wheel_Draw /
//     CL_Wheel_Precache / the carousel's CL_Carousel_Draw (wheel.c:46-204,
//     527-611): this port's basedir has none of the rerelease wheel pics
//     ("/gfx/weaponwheel.png", "carousel/selected", "/gfx/wheelbutton.png")
//     or per-item wheel icon configstrings, so there is nothing to draw.
//     Cut entirely, along with the always-on quick-select carousel itself
//     (CL_Carousel_Open/Close/Populate/Input/Draw) -- it isn't bound to any
//     of the six commands this port is short, so it's out of scope for the
//     reported defect. The open/close/select state machine below is fully
//     functional and independently testable without a screen presence.
//   - wc_timeout/wc_lock_time/ww_timer_speed and the open/close tween timer
//     (cl.wheel.timer/timescale, wheel.c:391-447 CL_Wheel_Update's timer
//     half, CL_Wheel_Init's cvars): cut along with the drawing they exist to
//     animate. Selection is derived directly from the current mouse
//     position each time input arrives instead of a per-frame tick, so
//     wheel.c:438-446's "deselect a short delay after leaving every slice"
//     grace period is also cut -- selection here just reflects the
//     instantaneous direction/distance.
//
// CL_Wheel_Cycle (wheel.c:206-236) needs none of the above -- only "does
// this slot have ammo" and "which item is currently selected" -- so it is
// ported verbatim below as a pure function over an abstract slot list, and
// wired into this module's own selection stepping. It is intentionally NOT
// used by cl_input.ts's cl_weapnext/cl_weapprev handlers; see that file.

import { cl } from "./client";
import { Cbuf_AddText } from "../qcommon/cmd";
import { CS_ITEMS, MAX_ITEMS } from "../shared/q_shared";

// wheel.c:188-192 cl_wheel_state_t, minus WHEEL_CLOSED's "release holster"
// and WHEEL_OPEN's "+ holster" annotations (BUTTON_HOLSTER is cut, see banner).
export const enum WheelStateT {
  CLOSED = 0, // not open, no input processed
  CLOSING = 1, // released this frame; one more send-cmd tick clears it
  OPEN = 2, // open and tracking mouse input
}

// wheel.c:194-207 cl_wheel_slot_t, trimmed to the fields this port can
// actually populate (see banner: no icons/sort_id/ammo/powerup data).
export interface WheelSlotT {
  readonly itemIndex: number; // index into cl.configstrings[CS_ITEMS + ...] / cl.inventory
}

// wheel.c:430-447's `cl.wheel` struct, minus the drawing/timer fields cut above.
class WheelT {
  state: WheelStateT = WheelStateT.CLOSED;
  isPowerupWheel = false;

  positionX = 0;
  positionY = 0;
  distance = 0;
  dirX = 0;
  dirY = 0;

  slots: WheelSlotT[] = [];
  selected = -1; // index into `slots`, -1 = no selection
}

export const wheel = new WheelT();

// Deviation: q2repro derives both the wheel's clamp radius (wheel.c:376,
// `inner_size = get_wheel_draw_size() / hud_scale * 0.64f`) and its
// selection threshold (wheel.c:426's literal `distance > 140`) from the
// registered size of the wheel_circle pic (wheel.c:335-352
// get_wheel_draw_size); this port has no such pic (see banner), so fixed,
// screen-independent numbers stand in instead, keeping the same relation
// the original has between them (the mouse can travel out to half of
// WHEEL_OUTER_RADIUS, and a slot commits once past WHEEL_SELECT_DISTANCE,
// which must stay below that clamp or nothing could ever be selected).
const WHEEL_OUTER_RADIUS = 200;
const WHEEL_SELECT_DISTANCE = 70;

// wheel.c:257-298 CL_Wheel_Populate, minus the powerup/weapon split and
// icons/sort_id/ammo bookkeeping (see banner). Runs when the wheel opens and
// again on every mouse-input tick while open, same as the original.
function CL_Wheel_Populate(): boolean {
  wheel.slots = [];
  for (let i = 0; i < MAX_ITEMS; i++) {
    if (cl.inventory[i] > 0) {
      wheel.slots.push({ itemIndex: i });
    }
  }
  return wheel.slots.length > 0;
}

// wheel.c:300-311 CL_Wheel_Open. `powerup` selects the +wheel2 binding
// (input.c:435); see banner for why it doesn't change the populated slots.
export function CL_Wheel_Open(powerup: boolean): void {
  wheel.isPowerupWheel = powerup;
  wheel.selected = -1;

  if (!CL_Wheel_Populate()) return;

  wheel.state = WheelStateT.OPEN;
  wheel.positionX = 0;
  wheel.positionY = 0;
  wheel.distance = 0;
  wheel.dirX = 0;
  wheel.dirY = 0;
}

// wheel.c:324-333 CL_Wheel_Close. `released` matches the C parameter: true
// for -wheel/-wheel2 (send the current selection), false when the wheel
// closes itself because it ran out of slots to show (CL_Wheel_Input below).
export function CL_Wheel_Close(released: boolean): void {
  if (wheel.state !== WheelStateT.OPEN) return;

  wheel.state = WheelStateT.CLOSING;

  if (released && wheel.selected !== -1) {
    const slot = wheel.slots[wheel.selected];
    if (slot) {
      // Substituted for wheel.c:332's `use_index_only %i` -- see banner.
      // Unquoted, matching cl_inv.ts:99's `Com_sprintf("use %s", ...)` --
      // the exact string that file already builds (for keybinding lookup)
      // from this same cl.configstrings[CS_ITEMS + ...] name.
      Cbuf_AddText(`use ${cl.configstrings[CS_ITEMS + slot.itemIndex]}\n`);
    }
  }
}

// wheel.c:318-322 CL_Wheel_ClearInput, called once per sent usercmd
// (cl_input.ts's CL_SendCmd, mirroring input.c:1278-1279) to finish the
// CLOSING -> CLOSED transition one tick after release.
export function CL_Wheel_ClearInput(): void {
  if (wheel.state === WheelStateT.CLOSING) wheel.state = WheelStateT.CLOSED;
}

// wheel.c:414-437's per-slot angle/dot-product selection math, split out of
// CL_Wheel_Update (which also drove the drawing timer this port cuts, see
// banner) since this port recomputes selection immediately on every input
// tick instead of once per frame.
function CL_Wheel_UpdateSelection(): void {
  const numSlots = wheel.slots.length;
  if (numSlots === 0) {
    wheel.selected = -1;
    return;
  }

  if (wheel.distance <= WHEEL_SELECT_DISTANCE) {
    wheel.selected = -1;
    return;
  }

  const sliceDeg = (Math.PI * 2) / numSlots;
  // wheel.c:293 names this slice_sin despite it being a cosine (half-slice
  // angular tolerance); kept as a plain local, no need for the C name here.
  const sliceCos = Math.cos(sliceDeg / 2);

  for (let i = 0; i < numSlots; i++) {
    const angle = sliceDeg * i;
    const dirX = Math.sin(angle);
    const dirY = -Math.cos(angle);
    const dot = dirX * wheel.dirX + dirY * wheel.dirY;

    if (dot > sliceCos) {
      // Deviation: wheel.c's loop keeps scanning every slot and lets the
      // last match win (wheel.c:429-437); non-overlapping slices mean at
      // most one can ever match, so breaking here is behavior-equivalent.
      wheel.selected = i;
      return;
    }
  }
}

// wheel.c:354-389 CL_Wheel_Input. `dx`/`dy` are the raw per-frame mouse
// delta, tapped in src/platform/sdl.ts's IN_Move before it's accumulated/
// filtered/scaled for view-angle turning, same point q2repro's CL_MouseMove
// (input.c:521-524) reads it from. BUTTON_HOLSTER (wheel.c:360-361) is cut,
// see banner.
export function CL_Wheel_Input(dx: number, dy: number): void {
  if (wheel.state !== WheelStateT.OPEN) return;

  if (!CL_Wheel_Populate()) {
    CL_Wheel_Close(false);
    return;
  }

  wheel.positionX += dx;
  wheel.positionY += dy;

  wheel.distance = Math.sqrt(wheel.positionX * wheel.positionX + wheel.positionY * wheel.positionY);

  wheel.dirX = 0;
  wheel.dirY = 0;

  if (wheel.distance) {
    const invDistance = 1 / wheel.distance;
    wheel.dirX = wheel.positionX * invDistance;
    wheel.dirY = wheel.positionY * invDistance;

    const innerHalf = WHEEL_OUTER_RADIUS / 2;
    if (wheel.distance > innerHalf) {
      wheel.distance = innerHalf;
      wheel.positionX = wheel.dirX * innerHalf;
      wheel.positionY = wheel.dirY * innerHalf;
    }
  }

  CL_Wheel_UpdateSelection();
}

// wheel.c:206-236 CL_Wheel_Cycle's inner slot-stepping loop, ported verbatim
// as a pure function since it needs none of the rerelease-only data cut
// above -- only each slot's ammo flag and which item_index is selected.
// Given the slot list in populate order and the currently-selected
// item_index, steps `offset` slots (+1/-1), wrapping around and skipping
// any slot without ammo, exactly like the original. Returns the newly
// selected item_index, or `selected` unchanged if it isn't found in `slots`
// or no other slot has ammo.
//
// Not called by cl_input.ts's cl_weapnext/cl_weapprev (see this file's
// banner and cl_input.ts's IN_WeapNext/IN_WeapPrev): kept here for the
// generic wheel's own scroll-to-select use and so the real q2repro
// algorithm has direct unit coverage.
export interface WheelCycleSlotT {
  readonly itemIndex: number;
  readonly hasAmmo: boolean;
}

export function CL_Wheel_Cycle(slots: readonly WheelCycleSlotT[], selected: number, offset: number): number {
  const numSlots = slots.length;
  if (numSlots === 0) return selected;

  let i = -1;
  for (let k = 0; k < numSlots; k++) {
    if (slots[k].itemIndex === selected) {
      i = k;
      break;
    }
  }
  if (i === -1) return selected;

  let result = selected;
  let o = i + offset;
  for (let n = 0; n < numSlots - 1; n++, o += offset) {
    if (o < 0) o = numSlots - 1;
    else if (o >= numSlots) o = 0;

    if (!slots[o].hasAmmo) continue;

    result = slots[o].itemIndex;
    break;
  }
  return result;
}
