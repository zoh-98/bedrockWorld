/**
 * Commands — Custom command registration for the Improved Backpacks addon.
 * Uses system.beforeEvents.startup + customCommandRegistry (modern API).
 * Each subcommand is a standalone chat command with direct logic.
 */
import {
    world,
    system,
    ItemStack,
    PlayerPermissionLevel,
    CustomCommandParamType,
    CommandPermissionLevel,
    CustomCommandStatus,
} from '@minecraft/server';
import {
    getBackpackEntity,
    closeBackpack,
    recoverItems as recoverBackpackItems,
} from './BackpackManager.js';
import { restartBackpackAddon } from './Main.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function requireOP(sender) {
    return true;
}

function sendOPRequired(sender) {
    sender.sendMessage('[Backpack+] OP required to use this command.');
}

function findBackpackById(id) {
    const tag = `bps_id:${id}`;
    //console.warn(`[Backpack+] findBackpackById searching for tag: "${tag}"`);
    return getBackpackEntity({ tags: [tag] });
}

function formatItemName(typeId) {
    return typeId
        .split(':')[1]
        .split('_')
        .map(str => str.charAt(0).toUpperCase() + str.slice(1))
        .join(' ');
}

/**
 * Command metadata: name, usage, description, required permission level.
 * Used by commandList() to filter commands shown to the player.
 */
const COMMAND_META = [
    { name: 'bps:reset',    usage: '/bps:reset',                       desc: 'Reset the backpack item you are holding.',          level: CommandPermissionLevel.Any },
    { name: 'bps:bphelp',     usage: '/bps:help',                        desc: 'Show this command list.',                          level: CommandPermissionLevel.Any },
    { name: 'bps:see',      usage: '/bps:see <ID>',                    desc: 'See specific backpack items.',                     level: CommandPermissionLevel.Any },
    { name: 'bps:retrieve', usage: '/bps:retrieve <ID>',               desc: 'Retrieve backpack items into the world.',          level: CommandPermissionLevel.Any },
    { name: 'bps:set',      usage: '/bps:set <ID>',                    desc: 'Manually set your backpack ID.',                   level: CommandPermissionLevel.Any },
    { name: 'bps:delete',   usage: '/bps:delete <ID>',                 desc: 'Delete a backpack and recover items.',             level: CommandPermissionLevel.Any },
    { name: 'bps:bplist',     usage: '/bps:list',                        desc: 'See all backpack IDs in your dimension.',          level: CommandPermissionLevel.GameDirectors },
    { name: 'bps:debug',    usage: '/bps:debug',                       desc: 'Show dynamic property byte count.',                level: CommandPermissionLevel.GameDirectors },
    { name: 'bps:clean',    usage: '/bps:clean',                       desc: 'Remove empty backpacks.',                          level: CommandPermissionLevel.GameDirectors },
    { name: 'bps:refresh',  usage: '/bps:refresh',                     desc: 'Restart the Backpack addon.',                      level: CommandPermissionLevel.GameDirectors },
    { name: 'bps:sudo',     usage: '/bps:sudo <Player> <Command>',     desc: 'Execute a backpack command as another player.',    level: CommandPermissionLevel.GameDirectors },
    { name: 'bps:bpclear',    usage: '/bps:clear bp',                    desc: 'Deletes all backpacks and item recovery.',         level: CommandPermissionLevel.GameDirectors },
];

function getPlayerPermissionValue(sender) {
    try {
        if (!sender || typeof sender.playerPermissionLevel !== 'number') return 0;
        const level = sender.playerPermissionLevel;
        if (level >= PlayerPermissionLevel.Operator) return 2;
        if (level >= PlayerPermissionLevel.Member)  return 0;
        return 0;
    } catch (_) {
        return 0;
    }
}

function commandList(sender) {
    const playerPerm = getPlayerPermissionValue(sender);
    const available = COMMAND_META.filter(cmd => cmd.level <= playerPerm);

    sender.sendMessage('§e<Backpack+ Commands>');
    for (const cmd of available) {
        sender.sendMessage(`§e${cmd.usage} - ${cmd.desc}`);
    }
}

// ─── Shared specs ───────────────────────────────────────────────────────────

const NO_PARAM_ANY = {
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [],
    optionalParameters: [],
};

const NO_PARAM_GD = {
    permissionLevel: CommandPermissionLevel.GameDirectors,
    mandatoryParameters: [],
    optionalParameters: [],
};

const ID_PARAM_ANY = {
    permissionLevel: CommandPermissionLevel.Any,
    mandatoryParameters: [{ type: CustomCommandParamType.Integer, name: 'id' }],
};

const ID_PARAM_GD = {
    permissionLevel: CommandPermissionLevel.GameDirectors,
    mandatoryParameters: [{ type: CustomCommandParamType.Integer, name: 'id' }],
};

const ok = { status: CustomCommandStatus.Success };

// ─── Command Registration ────────────────────────────────────────────────────

/**
 * Registers all backpack custom commands via the customCommandRegistry.
 * @param {import('@minecraft/server').CustomCommandRegistry} registry
 */
export function registerCommands(registry) {
    // ── No-param commands ────────────────────────────────────────────────

    registry.registerCommand(
        { name: 'bps:reset', description: 'Reset the backpack item you are holding.', ...NO_PARAM_ANY },
        (origin) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                const inv = sender.getComponent('inventory').container;
                const item = inv.getItem(sender.selectedSlotIndex);
                if (!item || !item.typeId.includes('backpack')) {
                    sender.sendMessage('§c[Backpack+] Hold a backpack item');
                    return ok;
                }
                inv.setItem(sender.selectedSlotIndex, new ItemStack(item.typeId));
                sender.sendMessage('§a[Backpack+] Backpack has been reset!');
            })          
            return ok;
        }
    );

    registry.registerCommand(
        { name: 'bps:bplist', description: 'See all backpack IDs in your dimension.', ...NO_PARAM_GD },
        (origin) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                const backpackEntities = sender.dimension.getEntities({ families: ['bps'] });
                let idList = '§e[Backpack+] ID List: ';
                for (const bpEntity of backpackEntities) {
                    idList += `${bpEntity.getTags()[0].split(':')[1]}, `;
                }
                sender.sendMessage(idList);
            })
            return ok;
        }
    );

    registry.registerCommand(
        { name: 'bps:debug', description: 'Show dynamic property byte count.', ...NO_PARAM_GD },
        (origin) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                let byteCount = world.getDynamicPropertyTotalByteCount();
                sender.sendMessage('Byte Count:' + byteCount);
                let dp = '';
                for (let x = 0; x < 32767; x++) dp += 'x';
                world.setDynamicProperty('debug', dp);
                byteCount = world.getDynamicPropertyTotalByteCount();
                sender.sendMessage('After Debug Byte Count:' + byteCount);
                world.setDynamicProperty('debug', undefined);
            })          
            return ok;
        }
    );

    registry.registerCommand(
        { name: 'bps:clean', description: 'Remove empty backpacks.', ...NO_PARAM_GD },
        (origin) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                const bpEntities = getBackpackEntity({ families: ['backpack'] });
                for (const bpEntity of bpEntities) {
                    const bpInv = bpEntity.getComponent('inventory').container;
                    if (bpInv.emptySlotsCount === bpInv.size) {
                        sender.sendMessage('§a[Backpack+] Empty Backpacks Removed!');
                        bpEntity.remove();
                    }
                }
            })            
            return ok;
        }
    );

    registry.registerCommand(
        { name: 'bps:refresh', description: 'Restart the Backpack addon.', ...NO_PARAM_GD },
        (origin) => {
            system.run(()=>{
                restartBackpackAddon();
                origin.sourceEntity.sendMessage('§e[Backpack+] Restarted Backpack Addon.');
            })          
            return ok;
        }
    );

    // ── ID-param commands ────────────────────────────────────────────────

    registry.registerCommand(
        { name: 'bps:see', description: 'See specific backpack items.', ...ID_PARAM_GD },
        (origin, params) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                const bpEntities = findBackpackById(params);
                if (bpEntities.length === 0) {
                    sender.sendMessage('§c[Backpack+] No backpack with that ID found!');
                    return;
                }
                for (const bpEntity of bpEntities) {
                    const bpInv = bpEntity.getComponent('inventory').container;
                    let itemList = '§eBackpack Items: ';
                    for (let slot = 0; slot < bpInv.size; slot++) {
                        const item = bpInv.getItem(slot);
                        if (!item) continue;
                        itemList += `§e${formatItemName(item.typeId)} x${item.amount}§a, `;
                    }
                    sender.sendMessage(itemList);
                }
            })
            return ok;
        }
    );

    registry.registerCommand(
        { name: 'bps:retrieve', description: 'Retrieve backpack items into the world.', ...ID_PARAM_GD },
        (origin, params) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                const bpEntities = findBackpackById(params);
                if (bpEntities.length === 0) {
                    sender.sendMessage('§c[Backpack+] No backpack with that ID found!');
                    return;
                }
                for (const bpEntity of bpEntities) {
                    const bpInv = bpEntity.getComponent('inventory').container;
                    for (let slot = 0; slot < bpInv.size; slot++) {
                        const item = bpInv.getItem(slot);
                        if (!item) continue;
                        sender.dimension.spawnItem(item, sender.location);
                        bpInv.setItem(slot, undefined);
                    }
                }
                world.setDynamicProperty(`bps_id:${params}`, undefined);
                sender.sendMessage('§e[Backpack+] Successfully retrieve items.');
            })
            return ok;
        }
    );

    registry.registerCommand(
        { name: 'bps:set', description: 'Manually set your backpack ID.', ...ID_PARAM_GD },
        (origin, params) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                const inv = sender.getComponent('inventory').container;
                const item = inv.getItem(sender.selectedSlotIndex);
                if (!item || !item.typeId.includes('backpack')) {
                    sender.sendMessage('§c[Backpack+] Hold a backpack item');
                    return;
                }
                item.setLore([`bps_id:${params}`]);
                inv.setItem(sender.selectedSlotIndex, item);
            })
            return ok;
        }
    );

    registry.registerCommand(
        { name: 'bps:delete', description: 'Delete a backpack and recover items.', ...ID_PARAM_GD },
        (origin, params) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                const bpEntities = findBackpackById(params);
                if (bpEntities.length === 0) {
                    sender.sendMessage('§c[Backpack+] No backpack with that ID found!');
                    return;
                }
                for (const bpEntity of bpEntities) {
                    const bpInv = bpEntity.getComponent('inventory').container;
                    for (let slot = 0; slot < bpInv.size; slot++) {
                        bpInv.setItem(slot, undefined);
                    }
                    bpEntity.kill();
                }
                world.setDynamicProperty(`bps_id:${params}`, undefined);
                sender.sendMessage('§e[Backpack+] Backpack Deleted.');
            })
            return ok;
        }
    );

    // ── sudo ──────────────────────────────────────────────────────────────

    registry.registerCommand(
        {
            name: 'bps:sudo',
            description: 'Execute a backpack command as another player.',
            permissionLevel: CommandPermissionLevel.GameDirectors,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: 'playerName' },
                { type: CustomCommandParamType.String, name: 'commandString' },
            ],
        },
        (origin, params) => {
            const sender = origin.sourceEntity;
            const players = world.getPlayers({ name: params.playerName });
            if (players.length === 0) {
                sender.sendMessage('§cPlayer does not exist.');
                return ok;
            }
            // Forward: use system.run to run the raw command string as the target player
            const target = players[0];
            system.run(() => {
                target.runCommand(params.commandString);
            });
            return ok;
        }
    );

    // ── clear bp ─────────────────────────────────────────────────────────

    registry.registerCommand(
        {
            name: 'bps:bpclear',
            description: 'Deletes all backpacks and item recovery.',
            permissionLevel: CommandPermissionLevel.GameDirectors,
            mandatoryParameters: [
                { type: CustomCommandParamType.String, name: 'subCommand' },
            ],
        },
        (origin, params) => {
            system.run(()=>{
                const sender = origin.sourceEntity;
                if (params.subCommand !== 'bp') {
                    sender.sendMessage('§cUsage: /bps:clear bp');
                    return;
                }
                const bpEntities = getBackpackEntity({ families: ['backpack'] });
                let count = 0;
                for (const bpEntity of bpEntities) {
                    world.setDynamicProperty(bpEntity.getTags()[0], undefined);
                    bpEntity.kill();
                    count++;
                }
                sender.sendMessage(`§c[Backpack+] Cleared all ${count} backpacks.`);
            })
            return ok;
        }
    );

    // ── help ──────────────────────────────────────────────────────────────

    registry.registerCommand(
        { name: 'bps:bphelp', description: 'Show all Backpack+ commands.', permissionLevel: CommandPermissionLevel.Any },
        (origin) => {
            system.run(()=>{
                commandList(origin.sourceEntity);
            })
            return ok;
        }
    );
}
