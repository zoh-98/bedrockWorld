/**
 * Enchantments — Static utility class for enchantment operations on ItemStacks.
 * Unchanged from original src/classes/Enchantments.js — already well-structured.
 */
import { EnchantmentTypes, ItemEnchantableComponent } from '@minecraft/server';

export class Enchantments {

    /**
     * Adds an enchantment to an item stack.
     * @param {import('@minecraft/server').ItemStack} itemStack
     * @param {import('@minecraft/server').Enchantment} enchantment
     * @returns {import('@minecraft/server').ItemStack}
     */
    static addEnchant(itemStack, enchantment) {
        const eCompo = itemStack.getComponent(ItemEnchantableComponent.componentId);
        eCompo.addEnchantment(enchantment);
        return itemStack;
    }

    /**
     * Sets an enchantment by name and level.
     * @param {import('@minecraft/server').ItemStack} itemStack
     * @param {string} enchantName
     * @param {number} level
     * @returns {import('@minecraft/server').ItemStack}
     * @throws {string} If level exceeds max or enchantment is incompatible.
     */
    static setEnchantName(itemStack, enchantName, level) {
        const eCompo = itemStack.getComponent('minecraft:enchantments');
        const enchantmentType = EnchantmentTypes.get(enchantName);
        if (enchantmentType.maxLevel < level) {
            throw `Enchantment level ${level} too high!`;
        }
        const enchantment = { level, type: enchantmentType.id };
        if (eCompo.canAddEnchantment(enchantment)) {
            eCompo.addEnchant(enchantment);
            return itemStack;
        }
        throw `Enchantment ${enchantName} Incompatible with ${itemStack.id}!`;
    }

    /**
     * Returns all enchantments on an item stack.
     * @param {import('@minecraft/server').ItemStack} itemStack
     * @returns {import('@minecraft/server').Enchantment[]}
     */
    static getEnchants(itemStack) {
        if (!itemStack.hasComponent(ItemEnchantableComponent.componentId)) return [];
        const eCompo = itemStack.getComponent(ItemEnchantableComponent.componentId);
        return eCompo.getEnchantments();
    }

    /**
     * Removes a specific enchantment from an item stack.
     * @param {import('@minecraft/server').ItemStack} itemStack
     * @param {import('@minecraft/server').Enchantment} enchantment
     * @returns {import('@minecraft/server').ItemStack}
     * @throws {string} If enchantment is not found.
     */
    static removeEnchant(itemStack, enchantment) {
        const eCompo = itemStack.getComponent(ItemEnchantableComponent.componentId);
        const enchantmentType = enchantment.type;
        if (eCompo.hasEnchantment(enchantmentType)) {
            eCompo.removeEnchantment(enchantmentType);
            return itemStack;
        }
        throw `No Enchant ${enchantmentType.id} Found!`;
    }
}
