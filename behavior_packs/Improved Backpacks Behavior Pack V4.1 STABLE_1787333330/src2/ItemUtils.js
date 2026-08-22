/**
 * ItemUtils — Item validation, lore formatting, and serialization helpers.
 * Extracted from Main.js.
 */
import { ItemStack, EnchantmentTypes } from '@minecraft/server';
import { Enchantments } from './classes/Enchantments.js';
import { FORBIDDEN_ITEMS } from './Config.js';

/**
 * Checks whether an item is forbidden from being stored in a backpack.
 * @param {import('@minecraft/server').ItemStack} item
 * @returns {boolean}
 */
export function isForbiddenItem(item) {
    return FORBIDDEN_ITEMS.some(itemName => item.typeId.includes(itemName));
}

/**
 * Formats an item stack's typeId into a human-readable lore string.
 * Example: "minecraft:diamond_sword" → "Diamond Sword"
 * @param {import('@minecraft/server').ItemStack} item
 * @returns {string}
 */
export function formatItemForLore(item) {
    const itemName = item.typeId
        .split(':')[1]
        .split('_')
        .map(str => str.charAt(0).toUpperCase() + str.slice(1))
        .join(' ');
    return `§7${itemName} x${item.amount}`;
}

/**
 * Serializes an item's properties for backup storage.
 * Captures typeId, name, amount, lore, durability, and enchantments.
 * @param {import('@minecraft/server').ItemStack} item
 * @returns {object}
 */
export function getItemProperties(item) {
    const itemInterface = {
        id: item.typeId,
        name: item.nameTag || undefined,
        amount: item.amount,
        lore: item.getLore().length > 0 ? item.getLore() : undefined,
        durability: item.hasComponent('durability')
            ? item.getComponent('durability').damage
            : undefined,
        enchant: [],
    };

    const enchantList = Enchantments.getEnchants(item);
    if (enchantList.length > 0) {
        itemInterface.enchant = enchantList.map(enchant => ({
            enchantName: enchant.type.id,
            level: enchant.level,
        }));
    }

    return itemInterface;
}

/**
 * Handles forbidden items in a backpack inventory.
 * Spawns forbidden items into the world and clears them from the inventory.
 * @param {import('@minecraft/server').Container} inventory
 * @param {import('@minecraft/server').Vector3} location
 * @param {import('@minecraft/server').Dimension} dimension
 */
export function handleForbiddenItems(inventory, location, dimension) {
    for (let slot = 0; slot < inventory.size; slot++) {
        const item = inventory.getItem(slot);
        if (item && isForbiddenItem(item)) {
            dimension.spawnItem(item, location);
            inventory.setItem(slot, undefined);
        }
    }
}

/**
 * Restores items from serialized backup data into a backpack inventory.
 * @param {import('@minecraft/server').Container} inventory - Target backpack inventory
 * @param {object[]} itemPropertiesParse - Array of serialized item property objects
 */
export function restoreItemsFromBackup(inventory, itemPropertiesParse) {
    for (const itemProperty of itemPropertiesParse) {
        const item = new ItemStack(itemProperty.id, itemProperty.amount);

        if (itemProperty.name) item.nameTag = itemProperty.name;
        if (itemProperty.lore) item.setLore(itemProperty.lore);
        if (itemProperty.durability) {
            item.getComponent('durability').damage = itemProperty.durability;
        }
        if (itemProperty.enchant) {
            for (const enchant of itemProperty.enchant) {
                Enchantments.addEnchant(item, {
                    type: EnchantmentTypes.get(enchant.enchantName),
                    level: enchant.level,
                });
            }
        }

        inventory.addItem(item);
    }
}
