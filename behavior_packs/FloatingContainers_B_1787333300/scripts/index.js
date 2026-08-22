import { world, system } from "@minecraft/server"
import * as inv from "./inventoryData"

const containers = [
    "chest ",
    "_chest ",
    "barrel",
    "_shulker_box"
]

world.beforeEvents.playerInteractWithBlock.subscribe(e => {
    const block = e.block
    const player = e.player
    if (containers.some(f => (block.typeId + " ").includes(f)) && !block.typeId.includes("ender") && player.isSneaking) {
        e.cancel = true
        const playerRot = inv.getClosestChestFacing(block, player)
        system.runTimeout(() => {
            const locations = inv.matchedContainers(block)
            if (!locations) return
            inv.renderContainer({ block, locations }, player.dimension, playerRot)
        })
    }
})

system.runInterval(() => {
    for (const dimensionID of [...new Set(world.getAllPlayers().map(player => player.dimension.id))]) {
        const dimension = world.getDimension(dimensionID)

        const rInvs = dimension.getEntities({ type: "effectoo:container" })
        let holders = dimension.getEntities({ type: "effectoo:item_holder" })
        const lines = dimension.getEntities({ type: "effectoo:line" })

        for (const rInv of rInvs) {
            const placeholderLine = world.getEntity(rInv.getDynamicProperty("placeholderLine") ?? "0")
            const block = placeholderLine ? dimension.getBlock(placeholderLine.location) : undefined
            const containerMode = rInv.getProperty("container:mode")
            let despawn = !placeholderLine

            if (containerMode != 1 && (rInv.getVelocity().x + rInv.getVelocity().z) >= 0.02) despawn = true
            if (system.currentTick % 16 === 0 && block) {
                if (!containers.some(f => (block.typeId + " ").includes(f))) despawn = true
                else {
                    const fullChest = inv.matchedContainers(block, true)
                    const locations = rInv.getDynamicProperty("container:locations")
                    if (locations != JSON.stringify(fullChest) && locations != JSON.stringify({ a: fullChest.b, b: fullChest.a })) despawn = true
                    else if (distances(rInv.location, fullChest.a) > 32) despawn = true
                }
            }
            if (placeholderLine) {
                if (containerMode != 0) {
                    placeholderLine.setProperty("line:size", 0)
                }
                else {
                    const lineLocation = placeholderLine.location
                    const dx = rInv.location.x - lineLocation.x
                    const dy = rInv.location.y - lineLocation.y
                    const dz = rInv.location.z - lineLocation.z

                    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) * 15.95

                    const horizontalDist = Math.sqrt(dx * dx + dz * dz)
                    const rotationX = Math.atan2(dy, horizontalDist) * (180 / Math.PI)
                    const rotationY = Math.atan2(dx, dz) * (180 / Math.PI)

                    placeholderLine.setProperty("line:size", Math.min(1024, Math.max(-1024, distance)))
                    placeholderLine.setProperty("line:rotation_x", rotationX)
                    placeholderLine.setProperty("line:rotation_y", rotationY)
                    if (distance >= 1024) despawn = true
                }
            }
            let minimized = rInv.getProperty("container:type") != -1

            for (const player of dimension.getEntities({ type: "minecraft:player", closest: 1, location: rInv.location, maxDistance: 8 })) {
                if (containerMode === 1) inv.followPlayer(rInv)
                inv.tracePlayerView(player)
                minimized = false
            }
            if (system.currentTick % 16 === 0 && block && rInv.getProperty("container:type") != -1) inv.updateAllHolders(rInv, true)
            if (despawn) {
                holders = dimension.getEntities({ type: "effectoo:item_holder" })
                for (const item of holders.filter(f => f.getTags().some(t => t.includes(`main:${rInv.id}`)))) {
                    item.remove()
                }
                rInv.remove()
                placeholderLine?.remove()
                holders = dimension.getEntities({ type: "effectoo:item_holder" })
            }
            else if (minimized) {
                holders = dimension.getEntities({ type: "effectoo:item_holder" })
                const holder = holders.find(f => f.getTags().some(t => t.includes(`main:${rInv.id}`)))
                if (holder) inv.minimizedInv(rInv, holder)
                holders = dimension.getEntities({ type: "effectoo:item_holder" })
            }
        }
    }
})

world.afterEvents.playerInteractWithEntity.subscribe(e => {
    const player = e.player
    const entity = inv.tracePlayerView(player) ?? e.target
    const dimension = player.dimension

    if (entity.typeId === "effectoo:item_holder") {
        dimension.playSound("random.click", entity.location)
        if (!inv.getHolderContainer(entity)) {
            inv.despawnHolders(entity)
            return
        }
        if (entity.getProperty("item:type") === 0) {
            const inventory = player.getComponent("inventory").container
            const item = inventory.getItem(player.selectedSlotIndex)
            if (!player.isSneaking) {
                if (!item) {
                    inv.leftClick(player, entity, true)
                }
                const { container, slot } = inv.getHolderContainer(entity)
                try {
                    const cItem = container.getItem(slot)
                    if (cItem) {
                        if (inv.stackWith(cItem, item, slot, player.selectedSlotIndex, container, inventory)) inv.updateItemHolders(null, entity)
                    }
                    else {
                        inventory.setItem(player.selectedSlotIndex)
                        container.setItem(slot, item)
                        inv.updateItemHolders(null, entity)
                    }
                }
                catch (e) { }
            }
            else inv.shiftClick(player, entity, true)
        }
        else inv.settingsInv(entity, player)
    }
    else if (entity.typeId === "effectoo:container" && entity.getProperty("container:mode") === 1) inv.reSpawnHolders(entity, dimension)
})

world.afterEvents.entityHitBlock.subscribe(e => {
    const player = e.damagingEntity
    const holder = inv.tracePlayerView(player)
    if (holder) inv.leftClick(player, holder)
})

world.afterEvents.entityHitEntity.subscribe(e => {
    const player = e.damagingEntity
    const holder = (player.typeId === "minecraft:player" ? inv.tracePlayerView(player) ?? e.hitEntity : e.hitEntity)
    inv.leftClick(player, holder)
})

function distances({ x, y, z }, { x: ox, y: oy, z: oz }) {
    const dx = x - ox; const dy = y - oy; const dz = z - oz
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}