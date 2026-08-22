/**
 * WorldManager — Singleton that tracks players holding backpacks
 * and backpack entities across all dimensions.
 * Refactored: unified entity query avoids duplicate dimension iteration.
 */
import { world } from '@minecraft/server';
import { DIMENSION_LIST } from './Config.js';

class WorldModel {
    constructor() {
        this.allPlayers = [];
        this.backpackEntities = [];
    }

    /** Refresh the player list from the world. */
    updateAllPlayers() {
        this.allPlayers = world.getAllPlayers();
    }

    /** Refresh the backpack entity list from all dimensions. */
    updateAllBackpacks() {
        this.backpackEntities = this.getEntitiesAcrossDimensions({ type: 'bps:container_entity_temp' });
    }

    /**
     * Query entities across ALL dimensions (Overworld, Nether, End).
     * Centralizes what was previously duplicated in getBackpackEntity() and updateAllBackpacks().
     * @param {object} query - Entity query options (type, tags, families, etc.)
     * @returns {Entity[]} Combined entity list from all dimensions.
     */
    getEntitiesAcrossDimensions(query) {
        const entityList = [];
        for (const dimensionId of DIMENSION_LIST) {
            try {
                const dimension = world.getDimension(dimensionId);
                const entities = dimension.getEntities(query);
                if (entities.length > 0) {
                    entityList.push(...entities);
                }
            } catch (e) {
                console.warn(`[Backpack+] Failed to query dimension ${dimensionId}:`, e);
            }
        }
        return entityList;
    }

    /** @param {import('@minecraft/server').Player} player */
    addPlayer(player) {
        this.allPlayers.push(player);
    }

    /** @param {string} playerName */
    removePlayer(playerName) {
        try {
            this.allPlayers = this.allPlayers.filter(player => player.name !== playerName);
        } catch (e) {
            console.warn('[Backpack+] Error removing player:', e);
        }
    }

    /** @param {number} index */
    removePlayerIndex(index) {
        try {
            this.allPlayers.splice(index, 1);
        } catch (e) {
            console.warn('[Backpack+] Error removing player by index:', e);
        }
    }

    /** @param {import('@minecraft/server').Entity} backpack */
    addBackpack(backpack) {
        this.backpackEntities.push(backpack);
    }

    /** @returns {import('@minecraft/server').Entity[]} */
    getAllBackpacks() {
        return this.backpackEntities;
    }

    /**
     * Get all cached backpack entities that are still valid and have the given tag.
     * @param {string} tag
     * @returns {import('@minecraft/server').Entity[]}
     */
    getBackpacksWithTag(tag) {
        return this.backpackEntities.filter(bpEntity => bpEntity.isValid && bpEntity.hasTag(tag));
    }

    /** @returns {import('@minecraft/server').Player[]} */
    getAllPlayers() {
        return this.allPlayers;
    }
}

const sharedWorldModel = new WorldModel();

export default sharedWorldModel;
