/**
 * Central configuration for the Improved Backpacks addon.
 * Consolidates all constants that were previously scattered across Main.js.
 */

/**
 * Y-offset for teleporting backpacks away from players when not in use.
 * Keyed by Minecraft dimension ID.
 */
export const DIMENSION_OFFSETS = {
    'minecraft:overworld': -64,
    'minecraft:nether': 0,
    'minecraft:the_end': 0,
};

/**
 * Backpack type definitions.
 * Maps item typeId → { size (entity event name), name (display name) }.
 * Replaces the duplicate switch statements backpackType() and backpackName().
 */
export const BACKPACK_TYPES = {
    'bps:backpack':        { size: 'small',  name: 'Small Backpack' },
    'bps:backpack_medium': { size: 'medium', name: 'Medium Backpack' },
    'bps:backpack_big':    { size: 'big',    name: 'Big Backpack' },
    'bps:backpack_xl':     { size: 'xl',     name: 'XL Backpack' },
};

/**
 * Item type substrings that are forbidden inside backpacks.
 * Items matching any of these will be ejected when a backpack closes.
 */
export const FORBIDDEN_ITEMS = ['bps:', 'shulker_box', 'bundle'];

/**
 * Height offset above the player's location where the backpack entity is teleported.
 */
export const BACKPACK_TELEPORT_HEIGHT = 1.5;

/**
 * Type family identifier shared by all backpack entities.
 */
export const BACKPACK_FAMILY = 'bps';

/**
 * All dimensions to search for backpack entities.
 */
export const DIMENSION_LIST = ['minecraft:overworld', 'minecraft:nether', 'minecraft:the_end'];
