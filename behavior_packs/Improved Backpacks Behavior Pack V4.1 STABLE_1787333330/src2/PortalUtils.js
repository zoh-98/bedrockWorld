/**
 * PortalUtils — Portal proximity detection.
 * Extracted from Main.js with proper error handling.
 */
import { MinecraftDimensionTypes } from '@minecraft/vanilla-data';

/** Blocks adjacent to the player's position to check for portal proximity. */
const PORTAL_CHECK_OFFSETS = [
    { method: 'above',  args: [1] },
    { method: 'below',  args: [1] },
    { method: 'north',  args: [1] },
    { method: 'south',  args: [1] },
    { method: 'east',   args: [1] },
    { method: 'west',   args: [1] },
];

/**
 * Checks if the given location is near a portal block.
 * Used to prevent backpack entity teleportation into portal zones.
 *
 * @param {import('@minecraft/server').Dimension} dimension
 * @param {import('@minecraft/server').Vector3} location
 * @returns {boolean} True if a portal block is found nearby.
 */
export function checkForNearbyPortal(dimension, location) {
    const checkLocation = { x: location.x, y: location.y + 1, z: location.z };

    try {
        const currentBlock = dimension.getBlock(checkLocation);
        if (!currentBlock) return false;

        // Check the block at the location itself
        if (currentBlock.typeId.includes('portal')) {
            return true;
        }

        // Check adjacent blocks
        for (const offset of PORTAL_CHECK_OFFSETS) {
            const adjacentBlock = currentBlock[offset.method](...offset.args);
            if (adjacentBlock && adjacentBlock.typeId.includes('portal')) {
                return true;
            }
        }
    } catch (e) {
        console.warn('[Backpack+] Portal check error:', e);
    }

    return false;
}
