import { describe, expect, test } from "bun:test";
import { AI_SetSightClient } from "../src/game/g_ai";
import { EdictT, game, GClientT, level } from "../src/game/g_local";
import { PendingPort } from "../src/qcommon/pending";

describe("EdictT defaults", () => {
  test("constructs with C memset-equivalent defaults", () => {
    const e = new EdictT();
    expect(e.s.number).toBe(0);
    expect(e.inuse).toBe(false);
    expect(e.owner).toBeNull();
    expect(e.client).toBeNull();
    // function-pointer fields default to null, matching NULL in C
    expect(e.think).toBeNull();
    expect(e.touch).toBeNull();
    expect(e.use).toBeNull();
    expect(e.pain).toBeNull();
    expect(e.die).toBeNull();
    expect(e.prethink).toBeNull();
    expect(e.blocked).toBeNull();
  });

  test("clear() resets a mutated field back to its constructed default", () => {
    const e = new EdictT();
    e.health = 100;
    e.inuse = true;
    e.classname = "player";
    e.clear();
    expect(e.health).toBe(0);
    expect(e.inuse).toBe(false);
    expect(e.classname).toBeNull();
  });
});

describe("GClientT defaults", () => {
  test("constructs with C memset-equivalent defaults", () => {
    const c = new GClientT();
    expect(c.ping).toBe(0);
    expect(c.newweapon).toBeNull();
    expect(c.chase_target).toBeNull();
    expect(c.pers.weapon).toBeNull();
  });

  test("clear() resets everything except 'pers' (matches the C comment on gclient_s)", () => {
    const c = new GClientT();
    c.pers.netname = "Mike";
    c.ping = 42;
    c.showscores = true;
    c.clear();
    expect(c.ping).toBe(0);
    expect(c.showscores).toBe(false);
    // pers survives PutClientInServer()'s clear, per the C struct comment
    expect(c.pers.netname).toBe("Mike");
  });
});

describe("g_local.ts singletons", () => {
  test("level and game singletons exist", () => {
    expect(level).toBeDefined();
    expect(game).toBeDefined();
  });

  test("level.clear() resets a mutated field", () => {
    level.framenum = 500;
    level.mapname = "base1";
    level.clear();
    expect(level.framenum).toBe(0);
    expect(level.mapname).toBe("");
  });

  test("game.clear() resets a mutated field", () => {
    game.maxclients = 16;
    game.autosaved = true;
    game.clear();
    expect(game.maxclients).toBe(0);
    expect(game.autosaved).toBe(false);
  });
});

describe("pending stubs", () => {
  test("a stub throws PendingPort with its C-source name", () => {
    expect(() => AI_SetSightClient()).toThrow(PendingPort);
    try {
      AI_SetSightClient();
      throw new Error("expected AI_SetSightClient to throw");
    } catch (err) {
      if (!(err instanceof PendingPort)) {
        throw err;
      }
      expect(err.message).toBe("not yet ported: g_ai.c:AI_SetSightClient");
    }
  });
});
