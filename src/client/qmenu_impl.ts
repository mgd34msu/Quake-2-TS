// qmenu.c -- pending stub (PORTING.md "Pending stubs"). Named
// qmenu_impl.ts, not qmenu.ts, because qmenu.h's type surface already owns
// that basename (MenuframeworkS/MenuCommonS/etc. in qmenu.ts) -- a
// deliberate exception to PORTING.md's "same basename" rule, reported per
// this unit's brief. Action_DoEnter/Action_Draw/Field_DoEnter/Field_Draw/
// Menu_DrawStatusBar/Menulist_DoEnter/MenuList_Draw/Separator_Draw/
// Slider_DoSlide/Slider_Draw/SpinControl_DoEnter/SpinControl_DoSlide/
// SpinControl_Draw are internal to qmenu.c and are not stubbed here.

import { PendingPort } from "../qcommon/pending";
import type { MenuframeworkS, MenufieldS, MenuItemU } from "./qmenu";

export function Field_Key(_field: MenufieldS, _key: number): boolean {
  throw new PendingPort("Field_Key");
}

export function Menu_AddItem(_menu: MenuframeworkS, _item: MenuItemU): void {
  throw new PendingPort("Menu_AddItem");
}

export function Menu_AdjustCursor(_menu: MenuframeworkS, _dir: number): void {
  throw new PendingPort("Menu_AdjustCursor");
}

export function Menu_Center(_menu: MenuframeworkS): void {
  throw new PendingPort("Menu_Center");
}

export function Menu_Draw(_menu: MenuframeworkS): void {
  throw new PendingPort("Menu_Draw");
}

export function Menu_ItemAtCursor(_m: MenuframeworkS): MenuItemU | null {
  throw new PendingPort("Menu_ItemAtCursor");
}

export function Menu_SelectItem(_s: MenuframeworkS): boolean {
  throw new PendingPort("Menu_SelectItem");
}

export function Menu_SetStatusBar(_s: MenuframeworkS, _string: string | null): void {
  throw new PendingPort("Menu_SetStatusBar");
}

export function Menu_SlideItem(_s: MenuframeworkS, _dir: number): void {
  throw new PendingPort("Menu_SlideItem");
}

export function Menu_TallySlots(_menu: MenuframeworkS): number {
  throw new PendingPort("Menu_TallySlots");
}

export function Menu_DrawString(_x: number, _y: number, _string: string): void {
  throw new PendingPort("Menu_DrawString");
}

export function Menu_DrawStringDark(_x: number, _y: number, _string: string): void {
  throw new PendingPort("Menu_DrawStringDark");
}

export function Menu_DrawStringR2L(_x: number, _y: number, _string: string): void {
  throw new PendingPort("Menu_DrawStringR2L");
}

export function Menu_DrawStringR2LDark(_x: number, _y: number, _string: string): void {
  throw new PendingPort("Menu_DrawStringR2LDark");
}
