// m_boss32.c -- pending port
//
// Second half of the two-stage "Jorg" boss fight (paired with m_boss31.c,
// which owns the SP_monster_jorg spawn function). Everything m_boss32.c
// defines is called directly from m_boss31.c via that file's own internal
// forward declarations, not via g_local.h, g_spawn.c, or g_items.c extern
// declarations -- so this stub pass (scoped to those three attribution
// sources) has no function to attribute here. Placeholder file for the
// future monster-porting unit that ports m_boss31.c/m_boss32.c together.
