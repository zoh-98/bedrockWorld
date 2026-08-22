import { world, system, ItemStack } from "@minecraft/server"
import { itemsSetts } from "./itemsPos"

export function matchedContainers(block, force) {
    const fullChest = { a: block.location, b: undefined }
    const container = block.getComponent("inventory").container
    const blockDir = block.permutation.getState("minecraft:cardinal_direction")

    for (const otherBlock of [block.north(), block.south(), block.west(), block.east()]) {
        if (otherBlock.typeId != block.typeId || ["barrel", "_shulker_box"].some(f => block.typeId.includes(f))) continue
        const otherContainer = otherBlock.getComponent("inventory").container
        const otherBlockDir = otherBlock.permutation.getState("minecraft:cardinal_direction")

        if (blockDir === otherBlockDir && otherContainer.size === container.size && otherContainer.emptySlotsCount === container.emptySlotsCount) {
            const firstSlot = container.getItem(0)
            container.setItem(0, new ItemStack("minecraft:invisible_bedrock"))

            if (otherContainer.getItem(0) && otherContainer.getItem(0).typeId === "minecraft:invisible_bedrock") {
                container.setItem(0, firstSlot)
                fullChest.b = otherBlock.location
                break
            }
            container.setItem(0, firstSlot)
        }
    }
    if (force) return fullChest
    for (const rInv of block.dimension.getEntities({ type: "effectoo:container" })) {
        
        const otherLocations = rInv.getDynamicProperty("container:locations")
        if (otherLocations === JSON.stringify(fullChest) || otherLocations === JSON.stringify({ a: fullChest.b, b: fullChest.a })) return
    }
    return fullChest
}

export function getClosestChestFacing(block, player) {
    const containerPos = block.location
    const playerPos = player.location

    const dx = playerPos.x - (containerPos.x + 0.5)
    const dy = playerPos.y - (containerPos.y + 0.5)
    const dz = playerPos.z - (containerPos.z + 0.5)
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    const distance = 2.15

    const pointX = (containerPos.x + 0.5) + (dx / dist) * distance
    const pointY = containerPos.y + (dy / dist) * distance
    const pointZ = (containerPos.z + 0.5) + (dz / dist) * distance

    const blockAboveA = block.above()
    const blockAboveB = block.above(1)
    let invPos = containerPos
    if (!blockAboveA.isAir && !blockAboveA.isLiquid && !blockAboveB.isAir && !blockAboveB.isLiquid) {
        invPos = { x: pointX, y: pointY, z: pointZ }
    }
    let angle = Math.atan2(dx, dz) * (180 / Math.PI)

    const snapped = Math.round(angle / 45) * 45
    const valid = [0, 45, 90, 135, 180, -135, -90, -45]
    return { rot: valid.includes(snapped) ? snapped : (snapped > 180 ? snapped - 360 : snapped + 360), pos: invPos }
}

export function followPlayer(rInv) {
    const selectPlayer = world.getEntity(JSON.parse(rInv.getDynamicProperty("selectedPlayer") ?? '{}').id)
    if (selectPlayer) {
        const playerRot = selectPlayer.getRotation()
        const playerPos = selectPlayer.getHeadLocation()

        const distance = 2
        const yawRad = (playerRot.y * Math.PI) / 180
        const pitchRad = (playerRot.x * Math.PI) / 180

        const dx = -Math.sin(yawRad) * Math.cos(pitchRad); const dy = -Math.sin(pitchRad); const dz = Math.cos(yawRad) * Math.cos(pitchRad)
        const x = playerPos.x + dx * distance; const y = playerPos.y + dy * distance; const z = playerPos.z + dz * distance
        const snappedYaw = getSnappedYaw(-playerRot.y)

        rInv.teleport({ x, y, z })
        rInv.setProperty("container:rotation", snappedYaw + 180 > 180 ? snappedYaw - 180 : snappedYaw + 180)
    }
    function getSnappedYaw(playerYaw) {
        const snaps = [0, 45, 90, 135, 180, -135, -90, -45]
        let closest = snaps[0]
        let minDiff = Infinity

        for (const snap of snaps) {
            let diff = Math.abs(((playerYaw - snap + 180) % 360 + 360) % 360 - 180)
            if (diff < minDiff) {
                minDiff = diff; closest = snap
            }
        }
        return closest
    }
}

export function tracePlayerView(player) {
    if (player.clientSystemInfo.platformType === "Mobile") return
    const headLocation = player.getHeadLocation()
    const rotation = player.getRotation()

    const pitch = rotation.x * (Math.PI / 180)
    const yaw = rotation.y * (Math.PI / 180)

    const direction = { x: -Math.sin(yaw) * Math.cos(pitch), y: -Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) }
    const stepSize = 1 / 8
    const maxDistance = 4

    const holders = []
    for (let step = 0; step <= maxDistance / stepSize; step++) {
        const checkLocation = { x: headLocation.x + direction.x * step * stepSize, y: (headLocation.y + 0.05) + direction.y * step * stepSize, z: headLocation.z + direction.z * step * stepSize }
        const itemHolder = player.dimension.getEntities({ type: "effectoo:item_holder", location: checkLocation, closest: 1, maxDistance: 0.2 })[0]
        if (itemHolder) holders.push(itemHolder)
    }

    const holder = holders.toReversed()[0]
    if (holder) {
        const selectMode = holder.getProperty("item:selected")
        if (selectMode != 5) {
            if (holder.getProperty("item:type") === 0) {
                if (selectMode <= 1) {
                    holder.setProperty("item:selected", 1)
                    holder.triggerEvent("selectedCooldown")
                }
                else if (selectMode >= 2) {
                    holder.setProperty("item:selected", 3)
                    holder.triggerEvent("selectedCooldown2")
                }
            }
            else {
                holder.setProperty("item:selected", 4)
                holder.triggerEvent("selectedCooldown")
            }
        }
    }
    return holder
}

export function getHolderContainer(holder, skipContainer) {
    try {
        const holderData = (holder.getTags().find(f => f.includes("main:")) ?? ":0").split(":")
        const itemSlot = Number(holderData[2])
        const rInv = skipContainer ? undefined : world.getEntity(holderData[1])
        const container = skipContainer ? undefined : holder.dimension.getBlock(JSON.parse(rInv.getDynamicProperty("container:locations") ?? `{}`).a).getComponent("inventory").container
        return { container, slot: itemSlot, render: rInv }
    } catch (e) { }
}

function despawnInventory(refHolder, onlyHolders, skipSettingsHolders) {
    try {
        const holders = refHolder.dimension.getEntities({ type: "effectoo:item_holder" })
        const rInv = getHolderContainer(refHolder).render
        for (const item of holders.filter(f => f.getTags().some(t => t.includes(`main:${rInv.id}`)))) {
            if (skipSettingsHolders && item.getProperty("item:type") != 0) {
                const { x, z } = item.location
                item.setProperty("item:selected", 0)
                item.teleport({ x, y: rInv.location.y - 0.04, z })
            }
            else item.remove()
        }
        if (!onlyHolders) {
            const placeholderLine = world.getEntity(rInv.getDynamicProperty("placeholderLine") ?? "0")
            rInv.remove()            
            placeholderLine?.remove()
        }
    } catch (e) { }
}

export function despawnHolders(refHolder) {
    try {
        const holders = refHolder.dimension.getEntities({ type: "effectoo:item_holder" })
        const rInvID = (holders[0].getTags().find(f => f.includes("main:")) ?? ":0").split(":")[1]
        for (const item of holders.filter(f => f.getTags().some(t => t.includes(`main:${rInvID}`)))) {
            item.remove()
        }
    } catch (e) { }
}

export function settingsInv(holder, player) {
    const type = holder.getProperty("item:type")
    const data = getHolderContainer(holder)
    const rInv = data.render

    if (type === 1) {
        for (let i = 0; i < data.container.size; i++) {
            data.container.transferItem(i, data.container)
        }
        if (player.isSneaking) {
            let items = []
            for (let j = 0; j < data.container.size; j++) {
                const item = data.container.getItem(j)
                items.push(item)
            }
            items = items.sort((a, b) => a.typeId?.localeCompare(b.typeId))
            for (let k = 0; k < data.container.size; k++) {
                data.container.setItem(k, items[k])
            }
        }
        updateAllHolders(rInv)
    }
    else if (type === 2) {
        const inventory = player.getComponent("inventory").container
        for (let i = 0; i < data.container.size; i++) {
            if (player.isSneaking) {
                const item = data.container.getItem(i)
                if (item && !inventory.contains(item)) continue
            }
            data.container.transferItem(i, inventory)
        }
        updateAllHolders(rInv)
        const item = inventory.getItem(9) //Refresh inventory
        inventory.setItem(9, new ItemStack("minecraft:invisible_bedrock"))
        inventory.setItem(9, item)
    }
    else if (type === 3) {
        const inventory = player.getComponent("inventory").container
        for (let i = 0; i < inventory.size; i++) {
            if (player.isSneaking) {
                const item = inventory.getItem(i)
                if (item && data.container.find(item) === undefined) continue
            }
            inventory.transferItem(i, data.container)
        }
        updateAllHolders(rInv)
        const item = inventory.getItem(9) //Refresh inventory
        inventory.setItem(9, new ItemStack("minecraft:invisible_bedrock"))
        inventory.setItem(9, item)
    }
    else if (type === 4) {
        if (holder.getProperty("item:selected") != 5) {
            const holderID = JSON.parse(player.getDynamicProperty("selectedContainer") ?? '{"id":"0"}').id
            const selectedHolder = world.getEntity(holderID)
            if (!selectedHolder) {
                holder.setProperty("item:selected", 5)
                player.setDynamicProperty("selectedContainer", JSON.stringify({ id: holder.id }))
            }
            else {
                const otherData = getHolderContainer(selectedHolder)
                const container = otherData.container
                for (let i = 0; i < container.size; i++) {
                    container.transferItem(i, data.container)
                }
                player.setDynamicProperty("selectedContainer")
                selectedHolder.setProperty("item:selected", 0)
                updateAllHolders(rInv)
                updateAllHolders(otherData.render)
            }
        }
        else {
            holder.setProperty("item:selected", 0)
            player.setDynamicProperty("selectedContainer")
        }
    }
    else if (type === 5) {
        minimizedInv(rInv, holder)
        const holderID = JSON.parse(player.getDynamicProperty("selectedContainer") ?? '{"id":"0"}').id
        const selectedHolder = world.getEntity(holderID)
        if (selectedHolder) {
            selectedHolder.setProperty("item:selected", 0)
        }
        player.setDynamicProperty("selectedContainer", undefined)
    }
    else if (type === 6) {
        if (rInv.getProperty("container:type") === -1) {
            const defType = JSON.parse(rInv.getDynamicProperty("container:locations") ?? `{}`).b != undefined
            rInv.setProperty("container:type", defType ? 1 : 0)
        }
        rInv.setProperty("container:mode", 1)
        rInv.setDynamicProperty("selectedPlayer", JSON.stringify({ id: player.id }))
        despawnInventory(holder, true)
    }
    else if (type === 7) { despawnInventory(holder) }
}

export function minimizedInv(rInv, holder) {
    const cType = rInv.getProperty("container:type")
    if (cType === -1) {
        const defType = JSON.parse(rInv.getDynamicProperty("container:locations") ?? `{}`).b != undefined

        rInv.setProperty("container:type", defType ? 1 : 0)
        reSpawnHolders(rInv, holder.dimension)
        despawnInventory(holder, true)
    }
    else {
        rInv.setProperty("container:type", -1)
        despawnInventory(holder, true, true)
    }
}

export function leftClick(player, entity, halfAmount, oneAmount) {
    if (entity.typeId === "effectoo:item_holder" && player.typeId === "minecraft:player") {
        const dimension = entity.dimension
        dimension.playSound("random.click", entity.location)

        const type = entity.getProperty("item:type")
        if (type === 0) {
            const currentSlot = getHolderContainer(entity)
            const currentItem = currentSlot.container.getItem(currentSlot.slot)
            const inventory = player.getComponent("inventory").container
            const pItem = inventory.getItem(player.selectedSlotIndex)
            const selectedSlot = JSON.parse(player.getDynamicProperty("selectedSlot") ?? '{}').id

            if (!currentItem && pItem && !selectedSlot) {
                inventory.setItem(player.selectedSlotIndex)
                currentSlot.container.setItem(currentSlot.slot, pItem)
                updateItemHolders(null, entity)
                return
            }
            if (!player.isSneaking || oneAmount) {
                if (entity.getProperty("item:selected") >= 2) {
                    entity.setProperty("item:selected", 0)
                    player.setDynamicProperty("selectedSlot")
                }
                else if (!selectedSlot) {
                    entity.setProperty("item:selected", 2)
                    player.setDynamicProperty("selectedSlot", JSON.stringify({ id: entity.id }))
                }
                else {
                    const selectedHolder = world.getEntity(selectedSlot)
                    if (!selectedHolder) {
                        entity.setProperty("item:selected", 2)
                        player.setDynamicProperty("selectedSlot", JSON.stringify({ id: entity.id }))
                        return
                    }
                    if (!oneAmount) selectedHolder.setProperty("item:selected", 0)

                    const otherSlot = getHolderContainer(selectedHolder)
                    if (halfAmount || oneAmount) {
                        const item = otherSlot.container.getItem(otherSlot.slot)
                        if (item && !currentSlot.container.getItem(currentSlot.slot)) {
                            const currentAmount = item.amount
                            const amount = halfAmount ? Number((item.amount / 2).toFixed()) : 1
                            if (currentAmount > 1) item.amount = amount
                            currentSlot.container.setItem(currentSlot.slot, item)

                            if (currentAmount > 1) {
                                item.amount = currentAmount - amount
                                otherSlot.container.setItem(otherSlot.slot, item)
                            }
                            else otherSlot.container.setItem(otherSlot.slot, undefined)
                        }
                        else moveItem()
                    }
                    else moveItem()

                    function moveItem() {
                        const currentItem = currentSlot.container.getItem(currentSlot.slot)
                        const otherItem = otherSlot.container.getItem(otherSlot.slot)

                        if (!stackWith(currentItem, otherItem, currentSlot.slot, otherSlot.slot, currentSlot.container, otherSlot.container)) {
                            currentSlot.container.swapItems(currentSlot.slot, otherSlot.slot, otherSlot.container)
                        }
                    }
                    updateItemHolders(null, selectedHolder, entity)
                    if (!oneAmount) player.setDynamicProperty("selectedSlot")
                }
            }
            else shiftClick(player, entity)
        }
        else settingsInv(entity, player)
    }
    else if (entity.typeId === "effectoo:container" && entity.getProperty("container:mode") === 1) reSpawnHolders(entity, entity.dimension)
}

export function reSpawnHolders(entity, dimension) {
    const rot = entity.getProperty("container:rotation")
    const locations = JSON.parse(entity.getDynamicProperty("container:locations") ?? `{}`)
    const block = dimension.getBlock(locations.a)
    entity.setProperty("container:mode", 0)
    entity.setDynamicProperty("selectedPlayer")
    system.runTimeout(() => renderContainer({ block, locations }, dimension, { rot, pos: entity.location }, entity))
}

export function shiftClick(player, holder, oneAmount) {
    const { container, slot } = getHolderContainer(holder)
    const item = container.getItem(slot)
    const inventory = player.getComponent("inventory").container
    const pItem = inventory.getItem(player.selectedSlotIndex)

    if (!item) {
        const selectedSlot = JSON.parse(player.getDynamicProperty("selectedSlot") ?? '{"id":"0"}').id
        if (world.getEntity(selectedSlot)) {
            leftClick(player, holder, false, true)
            return
        }
        stackWith(undefined, pItem, slot, player.selectedSlotIndex, container, inventory, oneAmount)
        updateItemHolders(null, holder)
        return
    }
    if (!pItem) {
        inventory.setItem(player.selectedSlotIndex, item)
        container.setItem(slot, undefined)
    }
    else stackWith(item, pItem, slot, player.selectedSlotIndex, container, inventory, oneAmount)
    updateItemHolders(null, holder)
}

export function stackWith(currentItem, otherItem, currentSlot, otherSlot, currentContainer, otherContainer, oneAmount) {
    if (currentItem && otherItem && currentItem.isStackableWith(otherItem)) {
        const plusOne = Math.min(currentItem.amount + 1, currentItem.maxAmount)
        const maxAmount = (oneAmount ? plusOne : currentItem.maxAmount)
        const total = currentItem.amount + otherItem.amount

        if (total <= maxAmount) {
            currentItem.amount = total
            currentContainer.setItem(currentSlot, currentItem)
            otherContainer.setItem(otherSlot, undefined)
        }
        else {
            const remainder = total - maxAmount
            currentItem.amount = maxAmount
            otherItem.amount = remainder
            otherContainer.setItem(otherSlot, otherItem)
            currentContainer.setItem(currentSlot, currentItem)
        }
        return true
    }
    else if (oneAmount && (!currentItem || !otherItem)) {
        const item = currentItem ?? otherItem
        if (item) {
            if (item.amount > 1) {
                item.amount -= 1
                otherContainer.setItem(otherSlot, item)
            }
            else otherContainer.setItem(otherSlot, undefined)
            item.amount = 1
            currentContainer.setItem(currentSlot, item)
        } 
        else return false
        return true
    }
    return false
}

export function updateAllHolders(rInv, sameContainer) {
    const holders = rInv.dimension.getEntities({ type: "effectoo:item_holder" })
    const container = sameContainer ? rInv.dimension.getBlock(JSON.parse(rInv.getDynamicProperty("container:locations") ?? `{}`).a).getComponent("inventory")?.container : undefined
    if (sameContainer && !container) return
    updateItemHolders((sameContainer ? container : null), ...holders.filter(f => f.getTags().some(t => t.includes(`main:${rInv.id}`))))
}

export function updateItemHolders(container, ...holders) {
    const noUpdate = container
    for (const holder of holders) {
        const { container: chest, slot } = getHolderContainer(holder, noUpdate ? 1 : 0)
        container = (noUpdate ? container : chest)
        if (slot === -1) continue
        try {
            const item = container.getItem(slot)
            if (item) {
                const itemData = itemsSetts.find(f => (item.typeId + " ").includes(f.item))
                holder.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${item.typeId}`)
                holder.setProperty("item:pos", itemData?.rotPos ?? 0)
                holder.setProperty("item:stack_offset", itemData?.stackOffset ?? 0)

                if (item.amount > 1 && item.amount <= 9) {
                    holder.setProperty("item:slot_0", -1)
                    holder.setProperty("item:slot_1", item.amount)
                }
                else if (item.amount >= 10) {
                    holder.setProperty("item:slot_0", Number(item.amount.toString()[0]))
                    holder.setProperty("item:slot_1", Number(item.amount.toString()[1]))
                }
                else {
                    holder.setProperty("item:slot_0", -1)
                    holder.setProperty("item:slot_1", -1)
                }
            }
            else {
                holder.setProperty("item:slot_0", -1)
                holder.setProperty("item:slot_1", -1)
                holder.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 air`)
            }
        }
        catch (e) {}
    }
}

export function renderContainer(container, dimension, invPos, otherContainer) {
    let { x, y, z } = invPos.pos
    const inventory = container.block.getComponent("inventory")?.container
    const largeChest = container.locations.b != undefined
    const rot = invPos.rot
    let slots = 0

    const DEG = Math.PI / 180
    const cos45 = Math.cos(45 * DEG)
    const sin45 = Math.sin(45 * DEG)
    const ySize = largeChest ? 5.9 : 2.9

    if (!otherContainer) { x += 0.5; z += 0.5 }
    const rContainer = otherContainer ?? dimension.spawnEntity("effectoo:container", { x, y: y + (largeChest ? 2.5 : 2), z })

    y += largeChest ? 3 : 2
    if (!otherContainer) {
        const placeholderLine = dimension.spawnEntity("effectoo:line", { x: container.locations.a.x + 0.5, y: container.locations.a.y + 0.5, z: container.locations.a.z + 0.5 })
        rContainer.setDynamicProperty("placeholderLine", placeholderLine.id)
        rContainer.setProperty("container:type", largeChest ? 1 : 0)
        rContainer.setDynamicProperty("container:locations", JSON.stringify(container.locations))
    }
    else y -= (largeChest ? 2.5 : 2)

    if (rot === 180) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let i = (x + 1.3); i > (x + 1.3) - (0.328 * 8.9); i -= 0.328) {
                if (!slots) {
                    renderOptions(0, rContainer.id,
                        { x: i, y: j + 0.328, z: z - 0.1 },
                        { x: i - 0.23, y: j + 0.328, z: z - 0.1 },
                        { x: i - (0.23 * 2), y: j + 0.328, z: z - 0.1 },
                        { x: i - (0.245 * 3), y: j + 0.328, z: z - 0.1 },
                        { x: i - (0.23 * 9.7), y: j + 0.328, z: z - 0.1 },
                        { x: i - (0.23 * 10.65), y: j + 0.328, z: z - 0.1 },
                        { x: i - (0.23 * 11.6), y: j + 0.328, z: z - 0.1 }
                    )
                }
                renderInventory({ x: i, y: j, z: z - 0.1 }, 0, rContainer.id)
            }
        }
    }
    else if (rot === 90) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let i = (z + 1.3); i > (z + 1.3) - (0.328 * 8.9); i -= 0.328) {
                if (!slots) {
                    renderOptions(90, rContainer.id,
                        { x: x + 0.1, y: j + 0.328, z: i },
                        { x: x + 0.1, y: j + 0.328, z: i - 0.23, },
                        { x: x + 0.1, y: j + 0.328, z: i - (0.23 * 2), },
                        { x: x + 0.1, y: j + 0.328, z: i - (0.245 * 3), },
                        { x: x + 0.1, y: j + 0.328, z: i - (0.23 * 9.7), },
                        { x: x + 0.1, y: j + 0.328, z: i - (0.23 * 10.65), },
                        { x: x + 0.1, y: j + 0.328, z: i - (0.23 * 11.6), }
                    )
                }
                renderInventory({ x: x + 0.1, y: j, z: i }, 90, rContainer.id)
            }
        }
    }
    else if (rot === -90) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let i = (z - 1.3); i < (z - 1.3) + (0.328 * 8.9); i += 0.328) {
                if (!slots) {
                    renderOptions(-90, rContainer.id,
                        { x: x - 0.1, y: j + 0.328, z: i },
                        { x: x - 0.1, y: j + 0.328, z: i + 0.23, },
                        { x: x - 0.1, y: j + 0.328, z: i + (0.23 * 2), },
                        { x: x - 0.1, y: j + 0.328, z: i + (0.245 * 3), },
                        { x: x - 0.1, y: j + 0.328, z: i + (0.23 * 9.7), },
                        { x: x - 0.1, y: j + 0.328, z: i + (0.23 * 10.65), },
                        { x: x - 0.1, y: j + 0.328, z: i + (0.23 * 11.6), }
                    )
                }
                renderInventory({ x: x - 0.1, y: j, z: i }, -90, rContainer.id)
            }
        }
    }
    else if (rot === 0) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let i = (x - 1.3); i < (x - 1.3) + (0.328 * 8.9); i += 0.328) {
                if (!slots) {
                    renderOptions(180, rContainer.id,
                        { x: i, y: j + 0.328, z: z + 0.1 },
                        { x: i + 0.23, y: j + 0.328, z: z + 0.1 },
                        { x: i + (0.23 * 2), y: j + 0.328, z: z + 0.1 },
                        { x: i + (0.245 * 3), y: j + 0.328, z: z + 0.1 },
                        { x: i + (0.23 * 9.7), y: j + 0.328, z: z + 0.1 },
                        { x: i + (0.23 * 10.65), y: j + 0.328, z: z + 0.1 },
                        { x: i + (0.23 * 11.6), y: j + 0.328, z: z + 0.1 }
                    )
                }
                renderInventory({ x: i, y: j, z: z + 0.1 }, 180, rContainer.id)
            }
        }
    }
    else if (rot === -135) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let s = 0; s < 9; s++) {
                const px = (x + 0.85) - (s * 0.328) * cos45
                const pz = (z - 0.99) + (s * 0.328) * sin45
                if (!slots) {
                    renderOptions(-45, rContainer.id,
                        { x: px, y: j + 0.328, z: pz },
                        { x: px - 0.163, y: j + 0.328, z: pz + 0.163 },
                        { x: px - (0.163 * 2), y: j + 0.328, z: pz + (0.163 * 2) },
                        { x: px - (0.173 * 3), y: j + 0.328, z: pz + (0.173 * 3) },
                        { x: px - (0.163 * 9.7), y: j + 0.328, z: pz + (0.163 * 9.7) },
                        { x: px - (0.163 * 10.65), y: j + 0.328, z: pz + (0.163 * 10.65) },
                        { x: px - (0.163 * 11.6), y: j + 0.328, z: pz + (0.163 * 11.6) }
                    )
                }
                renderInventory({ x: px, y: j, z: pz }, -45, rContainer.id)
            }
        }
    }
    else if (rot === 45) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let s = 0; s < 9; s++) {
                const px = (x - 0.85) + (s * 0.328) * cos45;
                const pz = (z + 0.99) - (s * 0.328) * sin45;
                if (!slots) {
                    renderOptions(135, rContainer.id,
                        { x: px, y: j + 0.328, z: pz },
                        { x: px + 0.163, y: j + 0.328, z: pz - 0.163 },
                        { x: px + (0.163 * 2), y: j + 0.328, z: pz - (0.163 * 2) },
                        { x: px + (0.173 * 3), y: j + 0.328, z: pz - (0.173 * 3) },
                        { x: px + (0.163 * 9.7), y: j + 0.328, z: pz - (0.163 * 9.7) },
                        { x: px + (0.163 * 10.65), y: j + 0.328, z: pz - (0.163 * 10.65) },
                        { x: px + (0.163 * 11.6), y: j + 0.328, z: pz - (0.163 * 11.6) }
                    )
                }
                renderInventory({ x: px, y: j, z: pz }, 135, rContainer.id)
            }
        }
    }
    else if (rot === 135) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let s = 0; s < 9; s++) {
                const pz = (z + 0.85) - (s * 0.328) * sin45;
                const px = (x + 0.99) - (s * 0.328) * cos45;
                if (!slots) {
                    renderOptions(45, rContainer.id,
                        { x: px, y: j + 0.328, z: pz },
                        { x: px - 0.163, y: j + 0.328, z: pz - 0.163 },
                        { x: px - (0.163 * 2), y: j + 0.328, z: pz - (0.163 * 2) },
                        { x: px - (0.173 * 3), y: j + 0.328, z: pz - (0.173 * 3) },
                        { x: px - (0.163 * 9.7), y: j + 0.328, z: pz - (0.163 * 9.7) },
                        { x: px - (0.163 * 10.65), y: j + 0.328, z: pz - (0.163 * 10.65) },
                        { x: px - (0.163 * 11.6), y: j + 0.328, z: pz - (0.163 * 11.6) }
                    )
                }
                renderInventory({ x: px, y: j, z: pz }, 45, rContainer.id)
            }
        }
    }
    else if (rot === -45) {
        rContainer.setProperty("container:rotation", rot)
        for (let j = (y + 0.22); j > (y + 0.22) - (0.328 * ySize); j -= 0.328) {
            for (let s = 0; s < 9; s++) {
                const pz = (z - 0.85) + (s * 0.328) * sin45;
                const px = (x - 0.99) + (s * 0.328) * cos45;
                if (!slots) {
                    renderOptions(-135, rContainer.id,
                        { x: px, y: j + 0.328, z: pz },
                        { x: px + 0.163, y: j + 0.328, z: pz + 0.163 },
                        { x: px + (0.163 * 2), y: j + 0.328, z: pz + (0.163 * 2) },
                        { x: px + (0.173 * 3), y: j + 0.328, z: pz + (0.173 * 3) },
                        { x: px + (0.163 * 9.7), y: j + 0.328, z: pz + (0.163 * 9.7) },
                        { x: px + (0.163 * 10.65), y: j + 0.328, z: pz + (0.163 * 10.65) },
                        { x: px + (0.163 * 11.6), y: j + 0.328, z: pz + (0.163 * 11.6) }
                    )
                }
                renderInventory({ x: px, y: j, z: pz }, -135, rContainer.id)
            }
        }
    }

    function renderInventory(vectorPos, rotItem, rContainerID) {
        const itemHolder = dimension.spawnEntity("effectoo:item_holder", vectorPos, { initialRotation: rotItem })
        itemHolder.addTag(`main:${rContainerID}:${slots}`)

        const item = inventory.getItem(slots)
        slots++

        if (item) {
            const itemData = itemsSetts.find(f => (item.typeId + " ").includes(f.item))
            itemHolder.runCommand(`replaceitem entity @s slot.weapon.mainhand 0 ${item.typeId}`)
            itemHolder.setProperty("item:pos", itemData?.rotPos ?? 0)
            itemHolder.setProperty("item:stack_offset", itemData?.stackOffset ?? 0)

            if (item.amount > 1 && item.amount <= 9) {
                itemHolder.setProperty("item:slot_1", item.amount)
            }
            else if (item.amount >= 10) {
                itemHolder.setProperty("item:slot_0", Number(item.amount.toString()[0]))
                itemHolder.setProperty("item:slot_1", Number(item.amount.toString()[1]))
            }
        }
    }
    function renderOptions(rot, rContainerID, ...vectors) {
        let type = 1
        for (const vector of vectors) {
            const option = dimension.spawnEntity("effectoo:item_holder", vector, { initialRotation: rot })
            option.addTag(`main:${rContainerID}:-1`)
            option.setProperty("item:type", type)
            type++
        }
    }
}