// g_items.c -- pending port

import { PendingPort } from "../qcommon/pending";
import type { CplaneT, CsurfaceT } from "../shared/q_shared";
import type { EdictT, GItemT } from "./g_local";

export function PrecacheItem(it: GItemT): void {
  throw new PendingPort("g_items.c:PrecacheItem");
}

export function InitItems(): void {
  throw new PendingPort("g_items.c:InitItems");
}

export function SetItemNames(): void {
  throw new PendingPort("g_items.c:SetItemNames");
}

export function FindItem(pickup_name: string): GItemT | null {
  throw new PendingPort("g_items.c:FindItem");
}

export function FindItemByClassname(classname: string): GItemT | null {
  throw new PendingPort("g_items.c:FindItemByClassname");
}

export function Drop_Item(ent: EdictT, item: GItemT): EdictT {
  throw new PendingPort("g_items.c:Drop_Item");
}

export function SetRespawn(ent: EdictT, delay: number): void {
  throw new PendingPort("g_items.c:SetRespawn");
}

export function ChangeWeapon(ent: EdictT): void {
  throw new PendingPort("g_items.c:ChangeWeapon");
}

export function SpawnItem(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:SpawnItem");
}

export function Think_Weapon(ent: EdictT): void {
  throw new PendingPort("g_items.c:Think_Weapon");
}

export function ArmorIndex(ent: EdictT): number {
  throw new PendingPort("g_items.c:ArmorIndex");
}

export function PowerArmorType(ent: EdictT): number {
  throw new PendingPort("g_items.c:PowerArmorType");
}

export function GetItemByIndex(index: number): GItemT | null {
  throw new PendingPort("g_items.c:GetItemByIndex");
}

export function Add_Ammo(ent: EdictT, item: GItemT, count: number): boolean {
  throw new PendingPort("g_items.c:Add_Ammo");
}

export function Touch_Item(
  ent: EdictT,
  other: EdictT,
  plane: CplaneT | null,
  surf: CsurfaceT | null,
): void {
  throw new PendingPort("g_items.c:Touch_Item");
}

export function SP_item_health(self: EdictT): void {
  throw new PendingPort("g_items.c:SP_item_health");
}

export function SP_item_health_small(self: EdictT): void {
  throw new PendingPort("g_items.c:SP_item_health_small");
}

export function SP_item_health_large(self: EdictT): void {
  throw new PendingPort("g_items.c:SP_item_health_large");
}

export function SP_item_health_mega(self: EdictT): void {
  throw new PendingPort("g_items.c:SP_item_health_mega");
}

export function Pickup_Adrenaline(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Adrenaline");
}

export function Pickup_AncientHead(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_AncientHead");
}

export function Pickup_Armor(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Armor");
}

export function Pickup_Bandolier(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Bandolier");
}

export function Pickup_Health(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Health");
}

export function Pickup_Key(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Key");
}

export function Pickup_Pack(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Pack");
}

export function Pickup_PowerArmor(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_PowerArmor");
}

export function Pickup_Powerup(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Powerup");
}

export function Pickup_Ammo(ent: EdictT, other: EdictT): boolean {
  throw new PendingPort("g_items.c:Pickup_Ammo");
}

export function Drop_Ammo(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Drop_Ammo");
}

export function Drop_General(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Drop_General");
}

export function Drop_PowerArmor(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Drop_PowerArmor");
}

export function Use_Breather(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Use_Breather");
}

export function Use_Envirosuit(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Use_Envirosuit");
}

export function Use_Invulnerability(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Use_Invulnerability");
}

export function Use_PowerArmor(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Use_PowerArmor");
}

export function Use_Quad(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Use_Quad");
}

export function Use_Silencer(ent: EdictT, item: GItemT): void {
  throw new PendingPort("g_items.c:Use_Silencer");
}

// `gitem_t itemlist[]` -- the full item table (weapons, ammo, armor,
// powerups, keys). Stubbed as a loud accessor per PORTING.md's data-table
// stub guidance rather than an empty array, since any real use of this
// table before the port lands is a bug, not a legitimate "no items" state.
export function itemlist(): readonly GItemT[] {
  throw new PendingPort("g_items.c:itemlist");
}

// `#define ITEM_INDEX(x) ((x)-itemlist)` -- C pointer subtraction against
// the itemlist array. Reshaped into an index lookup over the real
// `itemlist()` table; the real port replaces this body with
// `itemlist().indexOf(item)` (or an equivalent direct index computation).
export function ITEM_INDEX(item: GItemT): number {
  throw new PendingPort("g_items.c:ITEM_INDEX");
}
