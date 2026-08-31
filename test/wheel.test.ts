/*
Test for src/client/wheel.ts and the six "Kex stuff" command registrations
it and src/client/cl_input.ts add (input.c:433-436,438-456,737-744):
+holster/-holster, +wheel/-wheel, +wheel2/-wheel2, cl_weapnext, cl_weapprev.

Self-sufficient per PORTING.md rule 13: CL_InitLocal() (called once in
beforeAll, same as test/cl_main.test.ts's group 1) registers all six plus
the "weapnext"/"weapprev"/"use"/"cmd" commands cl_weapnext/cl_weapprev and
the wheel forward to; no other test file's state is relied on.

Three groups:
  - Registration: all six names exist in the command table (Cmd_Exists), so
    none of them can hit "Unknown command" or leak to the server as chat.
  - cl_weapnext/cl_weapprev end-to-end: driving the real command dispatch
    (Cbuf_AddText -> Cbuf_Execute -> the null-registered "weapnext"/
    "weapprev" -> the real "cmd" handler -> the netchan message) and reading
    back the bytes written to the wire, confirming the server sees
    "weapnext"/"weapprev" verbatim and never "cl_weapnext"/"cl_weapprev".
  - wheel.ts unit coverage: CL_Wheel_Cycle's pure slot-stepping algorithm
    against synthetic owned/unowned-gap and wraparound vectors (derived from
    wheel.c:216-233's real loop), and the open/populate/mouse-select/close
    state machine driven off a fabricated cl.inventory + cl.configstrings,
    ending in the same netchan-bytes check for the "use <item>" command
    -wheel's release sends.
*/

import { describe, test, expect, beforeAll } from "bun:test";
import { Cmd_Exists, Cmd_ExecuteString, Cbuf_Init, Cbuf_Execute } from "../src/qcommon/cmd";
import { Com_BeginRedirect, Com_EndRedirect } from "../src/qcommon/common";
import { SZ_Init } from "../src/qcommon/sizebuf";
import { cl, cls, ConnstateT } from "../src/client/client";
import { CL_InitLocal } from "../src/client/cl_main";
import { CS_ITEMS } from "../src/shared/q_shared";
import { wheel, WheelStateT, CL_Wheel_Open, CL_Wheel_Close, CL_Wheel_ClearInput, CL_Wheel_Input, CL_Wheel_Cycle, type WheelCycleSlotT } from "../src/client/wheel";

beforeAll(() => {
  Cbuf_Init(); // cl_weapnext/cl_weapprev/CL_Wheel_Close route through Cbuf_AddText
  CL_InitLocal(); // registers +holster/+wheel/+wheel2/cl_weapnext/etc.
});

// Reads back whatever CL_ForwardToServer_f (cl_main.ts) wrote to the
// netchan message as a clc_stringcmd: a leading opcode byte, then the
// forwarded command text, NUL-terminated. Puts cls into ca_active with a
// real writable netchan buffer first, since CL_ForwardToServer_f refuses to
// forward ("Can't ..., not connected") outside ca_connected/ca_active.
function readForwardedCommand(run: () => void): string {
  cls.state = ConnstateT.ca_active;
  SZ_Init(cls.netchan.message, new Uint8Array(256), 256);

  run();
  Cbuf_Execute();

  const bytes = cls.netchan.message.data.subarray(1, cls.netchan.message.cursize);
  return new TextDecoder().decode(bytes).replace(/\0+$/, "");
}

describe("Kex input command registrations (input.c:737-744)", () => {
  test("all six commands are registered so none hit Unknown command / leak to chat", () => {
    for (const name of ["+holster", "-holster", "+wheel", "-wheel", "+wheel2", "-wheel2", "cl_weapnext", "cl_weapprev"]) {
      expect(Cmd_Exists(name)).toBe(true);
    }
  });

  test("+holster/-holster track a kbutton without printing Unknown command", () => {
    let captured = "";
    Com_BeginRedirect(1, 4096, (_t, buf) => {
      captured += buf;
    });
    Cmd_ExecuteString("+holster 9 1000");
    Cmd_ExecuteString("-holster 9 1500");
    Com_EndRedirect();

    expect(captured).not.toContain("Unknown command");
  });
});

describe("cl_weapnext/cl_weapprev (input.c:438-456)", () => {
  test("cl_weapnext forwards the server's real 'weapnext' command, not the literal 'cl_weapnext'", () => {
    const forwarded = readForwardedCommand(() => Cmd_ExecuteString("cl_weapnext"));
    expect(forwarded).toBe("weapnext");
  });

  test("cl_weapprev forwards 'weapprev'", () => {
    const forwarded = readForwardedCommand(() => Cmd_ExecuteString("cl_weapprev"));
    expect(forwarded).toBe("weapprev");
  });

  test("never reaches chat: forwarded text is exactly the bare weapon command, no leading 'cl_' survives", () => {
    const forwarded = readForwardedCommand(() => Cmd_ExecuteString("cl_weapnext"));
    expect(forwarded.startsWith("cl_")).toBe(false);
    expect(forwarded).not.toContain("say");
  });
});

describe("CL_Wheel_Cycle pure slot-stepping (wheel.c:206-236)", () => {
  const slots = (...pairs: Array<[number, boolean]>): WheelCycleSlotT[] => pairs.map(([itemIndex, hasAmmo]) => ({ itemIndex, hasAmmo }));

  test("steps to the immediate next owned slot", () => {
    const s = slots([10, true], [11, true], [12, true]);
    expect(CL_Wheel_Cycle(s, 10, 1)).toBe(11);
    expect(CL_Wheel_Cycle(s, 11, 1)).toBe(12);
  });

  test("steps to the immediate previous slot with offset -1", () => {
    const s = slots([10, true], [11, true], [12, true]);
    expect(CL_Wheel_Cycle(s, 11, -1)).toBe(10);
  });

  test("wraps around forward past the last slot", () => {
    const s = slots([10, true], [11, true], [12, true]);
    expect(CL_Wheel_Cycle(s, 12, 1)).toBe(10);
  });

  test("wraps around backward past the first slot", () => {
    const s = slots([10, true], [11, true], [12, true]);
    expect(CL_Wheel_Cycle(s, 10, -1)).toBe(12);
  });

  test("skips a no-ammo gap to reach the next owned-with-ammo slot", () => {
    // A(ammo) B(no ammo) C(ammo) D(ammo); from A, +1 must land on C, not B.
    const s = slots([1, true], [2, false], [3, true], [4, true]);
    expect(CL_Wheel_Cycle(s, 1, 1)).toBe(3);
  });

  test("skips multiple consecutive no-ammo gaps", () => {
    const s = slots([1, true], [2, false], [3, false], [4, true]);
    expect(CL_Wheel_Cycle(s, 1, 1)).toBe(4);
  });

  test("stays put when every other slot lacks ammo", () => {
    const s = slots([1, true], [2, false], [3, false]);
    expect(CL_Wheel_Cycle(s, 1, 1)).toBe(1);
  });

  test("returns the selected item unchanged if it isn't in the slot list", () => {
    const s = slots([1, true], [2, true]);
    expect(CL_Wheel_Cycle(s, 999, 1)).toBe(999);
  });

  test("returns the selected item unchanged for an empty slot list", () => {
    expect(CL_Wheel_Cycle([], 5, 1)).toBe(5);
  });

  test("a single-slot list never moves off the only slot", () => {
    const s = slots([7, true]);
    expect(CL_Wheel_Cycle(s, 7, 1)).toBe(7);
  });
});

describe("wheel.ts open/close state machine (wheel.c:300-333)", () => {
  test("CL_Wheel_Open stays CLOSED when nothing is owned (CL_Wheel_Populate fails, wheel.c:305-306)", () => {
    cl.inventory.fill(0);
    CL_Wheel_Open(false);
    expect(wheel.state).toBe(WheelStateT.CLOSED);
  });

  test("CL_Wheel_Open populates slots from cl.inventory and opens (substituted for wheel_data, see wheel.ts banner)", () => {
    cl.inventory.fill(0);
    cl.inventory[5] = 1;
    cl.configstrings[CS_ITEMS + 5] = "Rocket Launcher";

    CL_Wheel_Open(false);

    expect(wheel.state).toBe(WheelStateT.OPEN);
    expect(wheel.slots.map((s) => s.itemIndex)).toEqual([5]);
    expect(wheel.selected).toBe(-1);
  });

  test("CL_Wheel_Input beyond the select-distance threshold selects the only slot", () => {
    cl.inventory.fill(0);
    cl.inventory[5] = 1;
    cl.configstrings[CS_ITEMS + 5] = "Rocket Launcher";
    CL_Wheel_Open(false);

    // slot 0's direction is (0, -1) (straight "up"); moving the mouse up
    // (negative dy) past the selection-distance threshold should select it.
    CL_Wheel_Input(0, -100);

    expect(wheel.selected).toBe(0);
  });

  test("CL_Wheel_Input within the select-distance threshold deselects", () => {
    cl.inventory.fill(0);
    cl.inventory[5] = 1;
    cl.configstrings[CS_ITEMS + 5] = "Rocket Launcher";
    CL_Wheel_Open(false);

    CL_Wheel_Input(0, -5); // small nudge, well under the threshold

    expect(wheel.selected).toBe(-1);
  });

  test("CL_Wheel_Close(true) with a selection sends 'use <item name>' to the server", () => {
    cl.inventory.fill(0);
    cl.inventory[5] = 1;
    cl.configstrings[CS_ITEMS + 5] = "Rocket Launcher";
    CL_Wheel_Open(false);
    CL_Wheel_Input(0, -100);
    expect(wheel.selected).toBe(0);

    const forwarded = readForwardedCommand(() => CL_Wheel_Close(true));

    expect(wheel.state).toBe(WheelStateT.CLOSING);
    expect(forwarded).toBe("use Rocket Launcher");
  });

  test("CL_Wheel_Close(true) with no selection sends nothing", () => {
    cl.inventory.fill(0);
    cl.inventory[5] = 1;
    cl.configstrings[CS_ITEMS + 5] = "Rocket Launcher";
    CL_Wheel_Open(false);
    expect(wheel.selected).toBe(-1); // never moved the mouse

    cls.state = ConnstateT.ca_active;
    SZ_Init(cls.netchan.message, new Uint8Array(256), 256);
    CL_Wheel_Close(true);
    Cbuf_Execute();

    expect(cls.netchan.message.cursize).toBe(0);
  });

  test("CL_Wheel_ClearInput finishes CLOSING -> CLOSED one tick after release", () => {
    cl.inventory.fill(0);
    cl.inventory[5] = 1;
    CL_Wheel_Open(false);
    CL_Wheel_Close(false); // -> CLOSING
    expect(wheel.state).toBe(WheelStateT.CLOSING);

    CL_Wheel_ClearInput();
    expect(wheel.state).toBe(WheelStateT.CLOSED);
  });

  test("CL_Wheel_Close is a no-op when not OPEN", () => {
    cl.inventory.fill(0);
    expect(wheel.state).toBe(WheelStateT.CLOSED);
    CL_Wheel_Close(true); // should not throw or change state
    expect(wheel.state).toBe(WheelStateT.CLOSED);
  });
});
