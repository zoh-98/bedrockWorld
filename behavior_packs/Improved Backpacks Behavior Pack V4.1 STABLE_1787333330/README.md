# Improved Backpacks Behavior Pack

A Minecraft Bedrock behavior pack that adds functional backpacks with persistent storage, item recovery, and cross-dimension support.

---

## Features

- **4 Backpack Sizes**: Small (16 slots), Medium (32 slots), Big (42 slots), XL (63 slots)
- **Persistent Storage**: Items are saved when the backpack is closed and restored when reopened
- **Item Recovery**: If a backpack entity is lost, items can be recovered from dynamic property backups
- **Forbidden Item Ejection**: Shulker boxes, bundles, and nested backpacks are automatically ejected
- **Cross-Dimension Support**: Backpacks work in the Overworld, Nether, and End
- **Native Chat Commands**: Custom commands registered via `customCommandRegistry` with proper autocomplete and permission levels
- **Event-Driven Architecture**: Uses native Minecraft events (`entityContainerClosed`) instead of polling loops

---

## Items & Recipes

| Item | Inventory Size | Recipe |
|------|---------------|--------|
| `bps:backpack` | 16 slots | Small Backpack |
| `bps:backpack_medium` | 32 slots | Medium Backpack |
| `bps:backpack_big` | 42 slots | Big Backpack |
| `bps:backpack_xl` | 63 slots | XL Backpack |

Recipes are defined in `recipes/` as standard Minecraft shapeless recipes.

---

## Commands

All commands use the custom command registry. Type `/bps:help` in-game to see available commands.

### Player Commands (Any)

| Command | Description |
|---------|-------------|
| `/bps:reset` | Reset the backpack item you are holding. Clears its lore/ID to create a new backpack. |
| `/bps:help` | Show all available commands based on your permission level. |

### Operator Commands (GameDirectors+)

| Command | Parameters | Description |
|---------|-----------|-------------|
| `/bps:see <ID>` | `id`: Integer | View items inside a specific backpack by its numeric ID. |
| `/bps:retrieve <ID>` | `id`: Integer | Spawn all items from a backpack into the world. |
| `/bps:set <ID>` | `id`: Integer | Manually assign a backpack ID to the held item. |
| `/bps:delete <ID>` | `id`: Integer | Delete a backpack entity and its stored items. |
| `/bps:sudo <Player> <Command>` | `playerName`: String, `commandString`: String | Execute a backpack command as another player. |
| `/bps:clear bp` | `subCommand`: String | Remove ALL backpack entities across all dimensions (frees dynamic property storage). |
| `/bps:clean` | — | Remove all empty backpack entities. |
| `/bps:list` | — | List all backpack IDs visible in your current dimension. |
| `/bps:refresh` | — | Restart the Backpack addon (re-initializes all event subscriptions). |
| `/bps:debug` | — | Show dynamic property byte count (for monitoring storage usage). |

---

## Architecture (src2/)

```
src2/
├── Main.js                  Event wiring, lifecycle initialization
├── Config.js                Constants, backpack type map, dimension offsets
├── Commands.js              Custom command registration (12 commands)
├── BackpackManager.js       Backpack lifecycle: create, open, close, record, recover
├── ItemUtils.js             Item validation, lore formatting, serialization
├── PortalUtils.js           Portal proximity detection
├── WorldManager.js          Singleton: cross-dimension entity queries, player tracking
└── classes/
    └── Enchantments.js      Enchantment utility (add, remove, get)
```

### Key Design Decisions

| Decision | Details |
|----------|---------|
| **Native events** | `entityContainerClosed` replaces the old `BackpackClosing` polling interval |
| **Reduced polling** | Teleport loop runs at 5Hz (every 4 ticks) instead of 20Hz (every tick) |
| **Unified Config** | All constants centralized in `Config.js` — no hardcoded values |
| **Dimension-aware close** | `closeBackpack` uses `DIMENSION_OFFSETS[dimensionId]` instead of hardcoded `-64` |
| **Proper unsubscribe** | Subscription callbacks are captured and unsubscribed via `signal.unsubscribe(callback)` |
| **Permission filtering** | `commandList` filters shown commands based on the player's `playerPermissionLevel` |

### Data Flow

```
Player opens container
    ↓
entityContainerClosed (native event)
    ↓
onBackpackClosed() — records items, updates lore, saves backup
    ↓
Entity stays in place until:
  ├── Player switches hotbar → onChanged → closeBackpack() (dimension-aware y-offset)
  └── Inactive check (20 ticks) → closeBackpack() if no player within 3 blocks
```

---

## Build Setup

The pack uses **esbuild** to bundle and minify the script modules.

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Build

```bash
node esbuild.js
```

The entry point is `src2/Main.js`. Output is `scripts/Main.js` (bundled + minified).

### Bundle Configuration

The `esbuild.js` script:
- Bundles all module imports into a single file
- Minifies the output (reducing script size)
- Externalizes `@minecraft/server` and related SDK packages (not bundled — provided by the game engine)

---

## Upgrading from Old Versions

Existing backpack entities, IDs, lore formats, and dynamic property backups are **fully compatible**. All data formats (backpack ID format `bps_id:XXXX`, entity type `bps:container_entity_temp`, family `bps`, dynamic property keys) remain unchanged between versions.

### What Changed

| Aspect | Old | New |
|--------|-----|-----|
| Command invocation | `/scriptevent bps:reset` | `/bps:reset` |
| Command system | `scriptEventReceive` listener | `customCommandRegistry` (native) |
| Close detection | Polling interval (every tick) | Native `entityContainerClosed` event |
| Teleport frequency | 20Hz (every tick) | 5Hz (every 4 ticks) |
| Module structure | 701-line monolith (`src/Main.js`) | 7 focused modules (`src2/`) |

---

## Storage

Backpack item data is stored in **world dynamic properties**:

- **Key format**: `bps_id:XXXX` (where XXXX is the 4-digit backpack ID)
- **Value**: JSON-serialized array of item properties including type ID, amount, name, lore, durability, and enchantments
- **Monitoring**: Use `/bps:debug` to check current byte count. Max dynamic property storage is ~1MB per world.

Item lore on the held backpack item shows the first 5 items and a count of remaining items (`§7and X more...`).

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| "No backpack with that ID found" | Entity was removed or is in a different dimension | Check `/bps:list` in each dimension |
| Backpack items missing after crash | Dynamic property was cleared or corrupted | Check `/bps:debug` for byte count |
| `triggerEvent('despawn2')` error | Entity removed before event fired | Fixed in v2 — triggerEvent runs before remove() |
| Command not found | Custom commands not registered | Ensure `beforeEvents.startup` subscription is active |
