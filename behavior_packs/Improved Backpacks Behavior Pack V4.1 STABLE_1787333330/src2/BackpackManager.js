/**
 * BackpackManager — Full backpack lifecycle management.
 * Handles creation, opening, closing, item recording, and recovery.
 * Replaces the polling-based BackpackClosing event with the native
 * entityContainerClosed event handler onBackpackClosed().
 */
import { world, system, ItemStack, EnchantmentTypes } from '@minecraft/server';
import { BACKPACK_TYPES, DIMENSION_OFFSETS, BACKPACK_TELEPORT_HEIGHT } from './Config.js';
import { checkForNearbyPortal } from './PortalUtils.js';
import { isForbiddenItem, formatItemForLore, getItemProperties, handleForbiddenItems, restoreItemsFromBackup } from './ItemUtils.js';
import WorldManager from './WorldManager.js';

/**
 * Get the backpack type config for a given item.
 * @param {import('@minecraft/server').ItemStack} item
 * @returns {{ size: string, name: string } | undefined}
 */
function getBackpackConfig(item) {
    return BACKPACK_TYPES[item.typeId];
}

/**
 * Get backpack entities matching a query across all dimensions.
 * Delegates to WorldManager's unified cross-dimension query.
 * @param {object} query
 * @returns {import('@minecraft/server').Entity[]}
 */
export function getBackpackEntity(query) {
    return WorldManager.getEntitiesAcrossDimensions(query);
}

/**
 * Creates a new backpack entity and initializes it.
 * Extracted from the "Create New Backpack ID" branch of onChanged().
 *
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').ItemStack} bpItem - The backpack item with lore already set
 * @param {string} bpId - The backpack ID (already set as first lore element)
 */
export function createBackpack(player, bpItem, bpId) {
    const bpConfig = getBackpackConfig(bpItem);
    if (!bpConfig) {
        console.warn('[Backpack+] Unknown backpack type:', bpItem.typeId);
        return;
    }

    const bpEntity = player.dimension.spawnEntity('bps:container_entity_temp', player.location);
    bpEntity.triggerEvent(bpConfig.size);
    bpEntity.addTag(bpId);
    bpEntity.nameTag = bpConfig.name;

    WorldManager.updateAllBackpacks();
}

/**
 * Opens a backpack — spawns a new entity, transfers items from old entities,
 * and sets up the name tag with multiple timeout guards.
 *
 * @param {import('@minecraft/server').Player} player
 * @param {import('@minecraft/server').ItemStack} bpItem
 */
export function openBackpack(player, bpItem) {
    const bpConfig = getBackpackConfig(bpItem);
    if (!bpConfig) {
        player.sendMessage('§c[Backpack+] Unknown backpack type.');
        return;
    }

    const bpLore = bpItem.getLore();
    const bpId = bpLore[0];

    let bpOldEntities = getBackpackEntity({ tags: [bpId] });

    if (bpOldEntities.length === 0) {
        player.sendMessage('§c[Backpack+] Unable to retrieve backpack items.');
        player.sendMessage('§c[Backpack+] Will attempt to recover items.');
        bpOldEntities = recoverItems(player, bpId);
        if (!bpOldEntities) return;
    }

    const bpEntity = player.dimension.spawnEntity('bps:container_entity_temp', player.location);
    bpEntity.triggerEvent(bpConfig.size);
    const bpInventory = bpEntity.getComponent('inventory').container;

    for (const bpOldEntity of bpOldEntities) {
        const bpOldEntityInventory = bpOldEntity.getComponent('inventory').container;
        transferItems(bpOldEntityInventory, bpInventory);

        // Trigger despawn event BEFORE removing the entity.
        // remove() invalidates the entity, so triggerEvent must come first.
        try {
            bpOldEntity.triggerEvent('despawn2');
        } catch (e) {
            console.warn('[Backpack+] Error triggering despawn2 on old entity:', e);
        }

        bpOldEntity.remove();
    }

    bpEntity.addTag(bpId);
    bpEntity.nameTag = bpConfig.name;

    // Re-apply name tag at multiple intervals to counter other addons renaming entities
    const reapplyName = () => {
        if (bpEntity.isValid) bpEntity.nameTag = bpConfig.name;
    };
    system.runTimeout(reapplyName, 1);
    system.runTimeout(reapplyName, 5);
    system.runTimeout(() => {
        if (bpEntity.isValid) {
            const currentEntity = world.getEntity(bpEntity.id);
            if (currentEntity && currentEntity.nameTag !== bpConfig.name) {
                console.warn('[Improved Backpack] Name has been changed.');
            }
        }
    }, 20);
}

/**
 * Closes a backpack — teleports it to the dimension-specific inactive Y offset.
 * FIXED (B2): Now uses DIMENSION_OFFSETS from Config instead of hardcoded -64.
 *
 * @param {import('@minecraft/server').Entity} backpackEntity
 */
export function closeBackpack(backpackEntity) {
    const dimensionId = backpackEntity.dimension.id;
    const yOffset = DIMENSION_OFFSETS[dimensionId] ?? -64;

    const newLocation = backpackEntity.location;
    newLocation.y = yOffset;
    backpackEntity.teleport(newLocation);
}

/**
 * Teleports the backpack entity to follow the player.
 * Used when a player holds a backpack item.
 *
 * @param {import('@minecraft/server').Entity} bpEntity
 * @param {import('@minecraft/server').Player} player
 */
export function teleportBackpackToPlayer(bpEntity, player) {
    const location = player.location;
    const dimension = player.dimension;

    if (checkForNearbyPortal(dimension, location)) {
        closeBackpack(bpEntity);
        return;
    }

    const newLocation = { x: location.x, y: location.y + BACKPACK_TELEPORT_HEIGHT, z: location.z };
    bpEntity.teleport(newLocation);
}

/**
 * Transfers all items from a source inventory to a target inventory.
 * @param {import('@minecraft/server').Container} sourceInventory
 * @param {import('@minecraft/server').Container} targetInventory
 */
export function transferItems(sourceInventory, targetInventory) {
    for (let index = 0; index < sourceInventory.size; index++) {
        const item = sourceInventory.getItem(index);
        if (item) {
            targetInventory.setItem(index, item);
            sourceInventory.setItem(index, undefined);
        }
    }
}

/**
 * Records backpack items into lore and dynamic property backup.
 * Ejects forbidden items into the world.
 *
 * @param {string} id - The backpack ID
 * @param {import('@minecraft/server').Container} inventory
 * @param {import('@minecraft/server').Entity} bpEntity
 * @returns {string[]} The updated lore array
 */
export function recordItems(id, inventory, bpEntity) {
    let count = 0;
    let countOverflow = 0;
    const backupItemList = [];
    const lore = [`${id}`];

    for (let slot = 0; slot < inventory.size; slot++) {
        const item = inventory.getItem(slot);
        if (!item) continue;

        // Eject forbidden items
        if (isForbiddenItem(item)) {
            bpEntity.dimension.spawnItem(item, bpEntity.location);
            inventory.setItem(slot, undefined);
            continue;
        }

        // Add item properties to backup list
        backupItemList.push(getItemProperties(item));

        // Build lore for the first 5 items
        if (count < 5) {
            lore.push(formatItemForLore(item));
        } else {
            countOverflow++;
        }
        count++;
    }

    // Add overflow message to lore
    if (countOverflow > 0) {
        lore.push(`§7and ${countOverflow} more...`);
    }

    // Save backup item list as a dynamic property
    world.setDynamicProperty(`${id}`, JSON.stringify(backupItemList));
    return lore;
}

/**
 * Recovers items from a dynamic property backup.
 * Spawns a new backpack entity with the recovered items.
 *
 * @param {import('@minecraft/server').Player} player
 * @param {string} id - The backpack ID
 * @returns {import('@minecraft/server').Entity[] | false} Array with the new entity, or false if no backup found
 */
export function recoverItems(player, id) {
    const itemProperties = world.getDynamicProperty(id);

    if (!itemProperties) {
        player.sendMessage('§c[Backpack+] Unable to find recovery backup.');
        return false;
    }

    const playerInv = player.getComponent('inventory').container;
    const bpEntity = player.dimension.spawnEntity('bps:container_entity_temp', player.location);
    const selectedItem = playerInv.getItem(player.selectedSlotIndex);

    bpEntity.addTag(id);
    const bpConfig = getBackpackConfig(selectedItem);
    if (bpConfig) {
        bpEntity.nameTag = bpConfig.name;
        bpEntity.triggerEvent(bpConfig.size);
    }

    const bpInv = bpEntity.getComponent('inventory').container;
    const itemPropertiesParse = JSON.parse(itemProperties);
    restoreItemsFromBackup(bpInv, itemPropertiesParse);

    player.sendMessage('§e[Backpack+] Items successfully recovered.');
    return [bpEntity];
}

/**
 * Handles the native entityContainerClosed event.
 * Replaces the polling-based BackpackClosing class entirely.
 * Called when ANY backpack entity's container is closed by a player.
 *
 * @param {import('@minecraft/server').Entity} bpEntity - The backpack entity whose container was closed
 * @param {import('@minecraft/server').Player} [player] - The player who closed it (from closeSource)
 */
export function onBackpackClosed(bpEntity, player) {
    // Record items into lore and dynamic property backup
    const bpEntityInventory = bpEntity.getComponent('inventory').container;
    const lore = recordItems(bpEntity.getTags()[0], bpEntityInventory, bpEntity);

    // Update the player's held backpack item lore
    if (player) {
        const inventory = player.getComponent('inventory').container;
        const item = inventory.getItem(player.selectedSlotIndex);
        if (item && item.getLore()[0] === bpEntity.getTags()[0]) {
            item.setLore(lore);
            inventory.setItem(player.selectedSlotIndex, item);
        }
    }

    // NOTE: closeBackpack() is NOT called here.
    // Teleporting the entity to the dimension y-offset only happens when:
    // 1. The player switches hotbar away from the backpack (onChanged in Main.js)
    // 2. The inactive backpack interval finds no nearby player
    // The entity stays in place after container close so the player can re-open it.

    // Clean up the close tag (set by entity JSON, but native event makes it unnecessary)
    bpEntity.removeTag('close');
}
