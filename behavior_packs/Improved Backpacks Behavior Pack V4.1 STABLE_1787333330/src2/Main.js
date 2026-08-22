/**
 * Main.js — Thin orchestrator for the Improved Backpacks addon.
 * Wires native Minecraft events to the BackpackManager and Commands modules.
 * 
 * Key improvements over the original 701-line monolith:
 * - Zero polling intervals for close detection (uses native entityContainerClosed)
 * - Teleport loop reduced from 20Hz to 5Hz
 * - B1 FIXED: subscription return values captured for proper unsubscribe
 * - B2 FIXED: closeBackpack uses dimension-aware offsets
 * - All constants centralized in Config.js
 * - All commands extracted to Commands.js
 * - All lifecycle logic in BackpackManager.js
 */
import { world, system, EntityEquippableComponent, EquipmentSlot, EntityTypeFamilyComponent } from '@minecraft/server';
import { BACKPACK_FAMILY } from './Config.js';
import { registerCommands } from './Commands.js';
import {
    createBackpack,
    openBackpack,
    getBackpackEntity,
    teleportBackpackToPlayer,
    onBackpackClosed,
    closeBackpack,
} from './BackpackManager.js';
import WorldManager from './WorldManager.js';
import { handleForbiddenItems } from './ItemUtils.js';

// ─── Captured subscription references (FIX B1) ───────────────────────────────
let hotbarChangeSubscription = null;
let containerClosedSubscription = null;
let inactiveBpRun = null;
let teleportRun = null;

// ─── World Initialization ────────────────────────────────────────────────────

world.afterEvents.worldLoad.subscribe(() => {
    system.runTimeout(() => {
        BackpackMain();
    }, 20);
});

// ─── Player Join / Leave ─────────────────────────────────────────────────────

world.afterEvents.playerJoin.subscribe(({ playerId }) => {
    system.runTimeout(() => {
        const player = world.getEntity(playerId);
        if (!player) return;
        const equippable = player.getComponent(EntityEquippableComponent.componentId);
        const heldItem = equippable.getEquipment(EquipmentSlot.Mainhand);
        if (heldItem?.typeId.includes('bps:backpack')) {
            WorldManager.addPlayer(player);
        }
    }, 10);
});

world.afterEvents.playerLeave.subscribe(({ playerName }) => {
    WorldManager.removePlayer(playerName);
});

// ─── Custom Command Registration ─────────────────────────────────────────────

system.beforeEvents.startup.subscribe((init) => {
    registerCommands(init.customCommandRegistry);
});

// ─── Main Initialization ─────────────────────────────────────────────────────

function BackpackMain() {
    world.sendMessage('§l§a[Backpack Plus] Addon Active!');
    console.warn('§l§a[Backpack Plus] Addon Active!');
    WorldManager.updateAllBackpacks();

    // Re-subscribe container close event (must be inside BackpackMain for restart to work)
    containerClosedSubscription = world.afterEvents.entityContainerClosed.subscribe((event) => {
        const family = event.entity.getComponent(EntityTypeFamilyComponent.componentId);
        if (!family?.hasTypeFamily(BACKPACK_FAMILY)) return;
        onBackpackClosed(event.entity, event.closeSource?.entity);
    });

    // Hotbar slot change → backpack lifecycle + add/remove players
    hotbarChangeSubscription = world.afterEvents.playerHotbarSelectedSlotChange.subscribe(({ player, itemStack: itemHolding }) => {
        const currentHeldItemStatusProperty = player.getDynamicProperty('playerHeldItemStatus');
        const inventory = player.getComponent('inventory').container;
        const selectedSlot = player.selectedSlotIndex;

        const propertyInterface = {
            item: itemHolding ? itemHolding.typeId : undefined,
            slot: selectedSlot,
            id: itemHolding && itemHolding.getLore().length > 0 ? itemHolding.getLore()[0] : undefined,
        };

        const newPropertyJson = JSON.stringify(propertyInterface);

        if (!currentHeldItemStatusProperty || currentHeldItemStatusProperty !== newPropertyJson) {
            const previousData = currentHeldItemStatusProperty
                ? JSON.parse(currentHeldItemStatusProperty)
                : {};
            if (previousData.slot !== selectedSlot || previousData.item !== propertyInterface.item) {
                onChanged(player, inventory, propertyInterface, previousData);
            }
            player.setDynamicProperty('playerHeldItemStatus', newPropertyJson);
        }

        // Track players holding backpacks
        if (itemHolding?.typeId.includes('bps:backpack')) {
            WorldManager.addPlayer(player);
        } else {
            WorldManager.removePlayer(player.name);
        }
    });

    // Teleport backpacks to follow players (every 4 ticks = 5Hz, down from 20Hz)
    teleportRun = system.runInterval(() => {
        const allPlayers = WorldManager.getAllPlayers();
        for (const player of allPlayers) {
            if (!player.isValid) continue;
            const container = player.getComponent('inventory').container;
            const itemHolding = container.getItem(player.selectedSlotIndex);
            if (!itemHolding || !itemHolding.typeId.includes('bps:backpack')) continue;

            const backpackID = itemHolding.getLore()[0];
            if (!backpackID) continue;

            const bpEntities = getBackpackEntity({ tags: [backpackID] });
            for (const bpEntity of bpEntities) {
                teleportBackpackToPlayer(bpEntity, player);
            }
        }
    }, 4);

    // Manage inactive backpacks — teleport to dimension y-offset when no player nearby
    inactiveBpRun = system.runInterval(() => {
        const bpEntities = getBackpackEntity({ families: [BACKPACK_FAMILY] });
        for (const bpEntity of bpEntities) {
            const playerQuery = {
                type: 'minecraft:player',
                location: bpEntity.location,
                maxDistance: 3,
            };
            const players = bpEntity.dimension.getEntities(playerQuery);
            if (players.length === 0) {
                closeBackpack(bpEntity);
            }
        }
    }, 20);
}

// ─── Hotbar Change Handler (onChanged equivalent) ────────────────────────────

function onChanged(player, playerInventory, propertyDataCurrent, propertyDataOld) {
    const currentItem = playerInventory.getItem(propertyDataCurrent.slot);
    const oldBackpackId = propertyDataOld.id;

    if (currentItem && currentItem.typeId.includes('bps:backpack')) {
        const lore = currentItem.getLore();

        if (lore.length === 0) {
            // Create New Backpack ID
            const bpId = `bps_id:${(Date.now() + Math.floor(Math.random() * 10000)).toString().slice(-4)}`;
            currentItem.setLore([bpId]);
            playerInventory.setItem(propertyDataCurrent.slot, currentItem);

            createBackpack(player, currentItem, bpId);
            WorldManager.updateAllBackpacks();
        } else {
            // Open Old Backpack
            handleBackpackEntities(player, oldBackpackId, bpEntity => closeBackpack(bpEntity));
            openBackpack(player, currentItem);
            WorldManager.updateAllBackpacks();
        }
    } else if (currentItem) {
        // Handle forbidden items when switching away from backpack to another item
        handleBackpackEntities(player, oldBackpackId, bpEntity => {
            const bpEntityInv = bpEntity.getComponent('inventory').container;
            handleForbiddenItems(bpEntityInv, bpEntity.location, bpEntity.dimension);
            closeBackpack(bpEntity);
        });
    } else if (oldBackpackId) {
        // Handle old backpack with no current item selected
        handleBackpackEntities(player, oldBackpackId, bpEntity => {
            const bpEntityInv = bpEntity.getComponent('inventory').container;
            handleForbiddenItems(bpEntityInv, bpEntity.location, bpEntity.dimension);
            closeBackpack(bpEntity);
        });
    }
}

/**
 * Iterates over backpack entities matching the given ID and executes a callback.
 * @param {import('@minecraft/server').Player} player
 * @param {string} backpackId
 * @param {(bpEntity: import('@minecraft/server').Entity) => void} callback
 */
function handleBackpackEntities(player, backpackId, callback) {
    if (!backpackId) return;

    const bpEntities = player.dimension.getEntities({ tags: [backpackId] });
    for (const bpEntity of bpEntities) {
        callback(bpEntity, player);
    }
}

// ─── Restart Function (FIXED B1: proper unsubscribe pattern) ─────────────────

export function restartBackpackAddon() {
    system.clearRun(inactiveBpRun);
    system.clearRun(teleportRun);

    // Use signal.unsubscribe(callback) — the correct API per @minecraft/server docs
    if (hotbarChangeSubscription) {
        world.afterEvents.playerHotbarSelectedSlotChange.unsubscribe(hotbarChangeSubscription);
    }
    if (containerClosedSubscription) {
        world.afterEvents.entityContainerClosed.unsubscribe(containerClosedSubscription);
    }

    BackpackMain();
}
