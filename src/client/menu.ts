// menu.c -- pending stub (PORTING.md "Pending stubs"). The full menu tree
// (M_Menu_Game_f, M_Menu_LoadGame_f, M_Menu_SaveGame_f,
// M_Menu_PlayerConfig_f, M_Menu_Multiplayer_f, M_Menu_JoinServer_f,
// M_Menu_AddressBook_f, M_Menu_StartServer_f, M_Menu_DMOptions_f,
// M_Menu_Video_f, M_Menu_Options_f, M_Menu_Keys_f, M_Menu_Quit_f,
// M_Menu_Credits, M_PushMenu, M_PopMenu, Default_MenuKey, and every
// per-screen *_MenuInit/*_MenuDraw/*_MenuKey helper) is internal to menu.c;
// only the functions client.h declares are exported here. There is no
// menu.h in the v3.19 tree, so this basename is free (no collision with a
// header module, unlike console.c/keys.c/qmenu.c).

import { PendingPort } from "../qcommon/pending";
import type { NetadrT } from "../qcommon/qcommon";

export function M_Init(): void {
  throw new PendingPort("M_Init");
}

export function M_Keydown(_key: number): void {
  throw new PendingPort("M_Keydown");
}

export function M_Draw(): void {
  throw new PendingPort("M_Draw");
}

export function M_Menu_Main_f(): void {
  throw new PendingPort("M_Menu_Main_f");
}

export function M_ForceMenuOff(): void {
  throw new PendingPort("M_ForceMenuOff");
}

export function M_AddToServerList(_adr: NetadrT, _info: string): void {
  throw new PendingPort("M_AddToServerList");
}
