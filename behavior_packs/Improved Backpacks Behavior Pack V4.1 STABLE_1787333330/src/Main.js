import {world, system, ItemStack, EnchantmentTypes, Dimension, EntityEquippableComponent, EquipmentSlot} from '@minecraft/server'
import {MinecraftDimensionTypes} from '@minecraft/vanilla-data';
import { Enchantments } from "./classes/Enchantments.js";
import {BackpackClosing, MainHandItemChange, PlayerHoldingBackpack} from "./CustomListeners.js"
import WorldManager from './WorldManager.js'

const DimensionList = [MinecraftDimensionTypes.Overworld, MinecraftDimensionTypes.Nether, MinecraftDimensionTypes.TheEnd]
const forbiddentItems = ["bps:", "shulker_box", "bundle"]

const OVERWORLD_Y_OFFSET = -64;
const NETHER_Y_OFFSET = 0;
const END_Y_OFFSET = 0;
const BACKPACK_TELEPORT_HEIGHT = 1.5;

let BackpackCache = []

let inactiveBpRun = null

/*
system.beforeEvents.watchdogTerminate.subscribe((eventData)=>{
    eventData.cancel = true
})
*/
const holdingBackpackEvent = new PlayerHoldingBackpack()
const backpackClosingEvent = new BackpackClosing()


world.afterEvents.worldLoad.subscribe(()=>{
    system.runTimeout(()=>{
        BackpackMain()
    },20)
    // system.runInterval(()=>{
    //     world.sendMessage(JSON.stringify(WorldManager.getAllPlayers()))
    // },40)
})

world.afterEvents.playerJoin.subscribe(({playerId})=>{
    system.runTimeout(()=>{
        const player = world.getEntity(playerId)
        const heldItem = player.getComponent(EntityEquippableComponent.componentId).getEquipment(EquipmentSlot.Mainhand)
        if(heldItem?.typeId.includes("bps:backpack")){
            WorldManager.addPlayer(player)
        }
    },10)
})

world.afterEvents.playerLeave.subscribe(({playerName})=>{
    WorldManager.removePlayer(playerName)
})

function BackpackMain(){
    world.sendMessage(`§l§a[Backpack Plus] Addon Active!`)
    console.warn(`§l§a[Backpack Plus] Addon Active!`)
    WorldManager.updateAllBackpacks()

    //Item Changing Event
    world.afterEvents.playerHotbarSelectedSlotChange.subscribe(({player, itemStack : itemHolding})=>{
        const currentHeldItemStatusProperty = player.getDynamicProperty(`playerHeldItemStatus`)
        const inventory = player.getComponent("inventory").container
        const selectedSlot = player.selectedSlotIndex
        
        const propertyInterface = {
            item: itemHolding ? itemHolding.typeId : undefined,
            slot: selectedSlot,
            id: itemHolding && itemHolding.getLore().length > 0 ? itemHolding.getLore()[0] : undefined
        }
        
        const newPropertyJson = JSON.stringify(propertyInterface)
    
        if (!currentHeldItemStatusProperty || currentHeldItemStatusProperty !== newPropertyJson) {
            const previousData = currentHeldItemStatusProperty ? JSON.parse(currentHeldItemStatusProperty) : {};
            if (previousData.slot !== selectedSlot || previousData.item !== propertyInterface.item) {
                onChanged(player, inventory, propertyInterface, previousData);
            }
            player.setDynamicProperty(`playerHeldItemStatus`, newPropertyJson);
        }

        if(itemHolding?.typeId.includes("bps:backpack")){
            WorldManager.addPlayer(player)
        }else{
            WorldManager.removePlayer(player.name)
        }
    })

    //Teleport Backpack Entity to Player
    holdingBackpackEvent.subscribe(({itemHolding, player})=>{
        const location = player.location
        const dimension = player.dimension
        const backpackID = itemHolding.getLore()[0]
        if(backpackID != undefined){
            let bpEntityQuery = {tags:[backpackID]}
            let bpEntities = getBackpackEntity(bpEntityQuery)
            for(let bpEntity of bpEntities){
                if(checkForNearbyPortal(dimension, location)){
                    closeBackpack(bpEntity)
                    continue
                }
                let newLocation = player.location
                newLocation.y = newLocation.y + BACKPACK_TELEPORT_HEIGHT
                bpEntity.teleport(newLocation)
            }
        }
    })        

    //Record Items When Backpack Close
    backpackClosingEvent.subscribe(({bpEntity})=>{
        let bpEntityInventory = bpEntity.getComponent("inventory").container
        let lore = recordItems(bpEntity.getTags()[0], bpEntityInventory, bpEntity)
        let playerQuery = {type:"minecraft:player", closest:1, location:bpEntity.location}
        let playerEntity = bpEntity.dimension.getEntities(playerQuery)
        for(let player of playerEntity){
            let inventory = player.getComponent("inventory").container
            let item = inventory.getItem(player.selectedSlotIndex)
            if(!item) continue               
            if(item.getLore()[0] != bpEntity.getTags()[0]) continue
            item.setLore(lore)
            inventory.setItem(player.selectedSlotIndex, item)
        }
        bpEntity.removeTag("close")
    })    

    //Manage Inactive Backpacks
    inactiveBpRun = system.runInterval(()=>{
        let bpEntities = getBackpackEntity({families:["bps"]})
        for(let bpEntity of bpEntities){
            const dimension = bpEntity.dimension
            let newLocation = bpEntity.location
            switch(dimension.id){
                case MinecraftDimensionTypes.Overworld:
                    if(newLocation.y == OVERWORLD_Y_OFFSET) continue
                    newLocation.y = OVERWORLD_Y_OFFSET
                    break
                case MinecraftDimensionTypes.Nether:
                    if(newLocation.y == NETHER_Y_OFFSET) continue
                    newLocation.y = NETHER_Y_OFFSET
                    break
                case MinecraftDimensionTypes.TheEnd:
                    if(newLocation.y == END_Y_OFFSET) continue
                    newLocation.y = END_Y_OFFSET
                    break
            }
            let playerQuery = {type:"minecraft:player", location:bpEntity.location, maxDistance:3}
            let players = bpEntity.dimension.getEntities(playerQuery)
            if(players.length==0){
                bpEntity.teleport(newLocation)
            }
        }
    },20)
}

/**
 * 
 * @param {Dimension} Dimension 
 * @param {import('@minecraft/server').Vector3} Location 
 */
function checkForNearbyPortal(Dimension, Location){
    const newLocation = Location
    newLocation.y += 1
    try{
        const currentPositionBlock = Dimension.getBlock(newLocation)
        const blockList = [
            currentPositionBlock,
            currentPositionBlock.above(1),
            currentPositionBlock.below(1),
            currentPositionBlock.north(1),
            currentPositionBlock.south(1),
            currentPositionBlock.east(1),
            currentPositionBlock.west(1)
        ]
        for(const block of blockList){
            if(block.typeId.includes("portal")){
                return true
            }
        }
    }catch(e){}
    return false
}

function restartBackpackAddon(){
    system.clearRun(inactiveBpRun)
    backpackClosingEvent.unsubscribe()
    holdingBackpackEvent.unsubscribe()
    itemChangeEvent.unsubscribe()
    BackpackMain()
}

async function onChanged(player, playerInventory, propertyDataCurrent, propertyDataOld) {
    const currentItem = playerInventory.getItem(propertyDataCurrent.slot);
    const oldBackpackId = propertyDataOld.id;
    if (currentItem && currentItem.typeId.includes("bps:backpack")) {
        let lore = currentItem.getLore();
        
        if (lore.length === 0) { // Create New Backpack ID
            const bpId = `bps_id:${(Date.now() + Math.floor(Math.random() * 10000)).toString().slice(-4)}`;
            currentItem.setLore([bpId]);
            playerInventory.setItem(propertyDataCurrent.slot, currentItem);
            
            const bpEntity = player.dimension.spawnEntity("bps:container_entity_temp", player.location);
            bpEntity.triggerEvent(backpackType(currentItem));
            bpEntity.addTag(bpId);
            bpEntity.nameTag = backpackName(currentItem);

            WorldManager.updateAllBackpacks();
        } else { // Open Old Backpack
            handleBackpackEntities(player, oldBackpackId, bpEntity => closeBackpack(bpEntity, player, propertyDataOld));
            openBackpack(player, currentItem);
            WorldManager.updateAllBackpacks();
        }
    } else if (currentItem) { // Handle forbidden items
        handleBackpackEntities(player, oldBackpackId, bpEntity => {
            const bpEntityInv = bpEntity.getComponent("inventory").container;
            handleForbiddenItems(bpEntityInv, bpEntity.location, bpEntity.dimension);
            closeBackpack(bpEntity, player, propertyDataOld);
        });
    } else if (oldBackpackId) { // Handle old backpack with no current item
        handleBackpackEntities(player, oldBackpackId, bpEntity => {
            const bpEntityInv = bpEntity.getComponent("inventory").container;
            handleForbiddenItems(bpEntityInv, bpEntity.location, bpEntity.dimension);
            closeBackpack(bpEntity, player, propertyDataOld);
        });
    }
}

function handleBackpackEntities(player, backpackId, callback) {
  if (!backpackId) return;

  const bpEntityQuery = { tags: [backpackId] };
  const bpEntities = player.dimension.getEntities(bpEntityQuery);

  // If your callback returns a promise, this will await each one in series.
  // If callback is synchronous, `await`ing it just wraps it in a resolved promise.
  for (const bpEntity of bpEntities) {
    callback(bpEntity, player);
  }
}

function handleForbiddenItems(inventory, location, dimension) {
    for (let slot = 0; slot < inventory.size; slot++) {
        const item = inventory.getItem(slot);
        if (item && forbiddentItems.some(itemName => item.typeId.includes(itemName))) {
            dimension.spawnItem(item, location);
            inventory.setItem(slot, undefined);
        }
    }
}

system.afterEvents.scriptEventReceive.subscribe(({id, message, sourceEntity})=>{
    const idArr = id.split(":")
    const cmd = `!${idArr[0]} ${idArr[1]} ${message}`
    commands(cmd, sourceEntity)
})

function commands(message, sender){
    let cmd = message.split(" ")
    let isPlayerOP = true //sender.hasTag("op") ? true : false

    if(cmd.length>1){
        if(cmd[0].trim() == "!bps"){
            switch(cmd[1]){
                case "sudo":
                    const playerName = cmd[2]
                    if(playerName == null){
                        sender.sendMessage(`§cMust have a player name.`)
                        return
                    }
                    if(cmd[3] == null){
                        sender.sendMessage(`§cMust have a valid command.`)
                        return
                    }
                    if(cmd[4] == null) cmd[4] = ""
                    const command = ("!" + cmd[3].split(":").join(" ") + " " +cmd.splice(4).join(" ")).trim()
                    const player = world.getPlayers({name:playerName})
                    if(player.length){
                        commands(command, player[0])
                    }else{
                        sender.sendMessage(`§cPlayer does not exist.`)
                    }
                break

                case "refresh":
                    if(!isPlayerOP){
                        sender.sendMessage(`[Backpack+] OP required to use this command.`)
                        return
                    }
                    restartBackpackAddon()
                    sender.sendMessage(`§e[Backpack+] Restarted Backpack Addon.`)                 
                break

                case "clear":
                    if(cmd[2] == "bp"){
                        if(!isPlayerOP){
                            sender.sendMessage(`[Backpack+] OP required to use this command.`)
                            return
                        }
                        var bpQuery = {families:["backpack"]}
                        var bpEntities = getBackpackEntity(bpQuery)
                        let count = 0
                        for(let bpEntity of bpEntities){
                            world.setDynamicProperty(bpEntity.getTags()[0], undefined)
                            bpEntity.kill()
                            count++                
                        }
                        sender.sendMessage(`§c[Backpack+] Cleared all ${count} backpacks.`)
                    }                    
                break
                
                case "clean":
                    if(!isPlayerOP){
                        sender.sendMessage(`[Backpack+] OP required to use this command.`)
                        return
                    }
                    const backpackQuery = {families:["backpack"]}
                    const backpackEntities2 = getBackpackEntity(backpackQuery)
                    for(let bpEntity of backpackEntities2){
                        const bpInv = bpEntity.getComponent("inventory").container
                        if(bpInv.emptySlotsCount == bpInv.size){
                            sender.sendMessage(`§a[Backpack+] Empty Backpacks Removed!`)
                            bpEntity.remove()
                        }
                    }
                break

                case "reset":
                    var inv = sender.getComponent("inventory").container
                    var item = inv.getItem(sender.selectedSlotIndex)
                    if(!item){
                        sender.sendMessage(`§c[Backpack+] Hold a backpack item`)
                        return
                    }
                    if(!item.typeId.includes("backpack")){
                        sender.sendMessage(`§c[Backpack+] Hold a backpack item`)
                        return
                    }
                    inv.setItem(sender.selectedSlotIndex, new ItemStack(item.typeId))
                    sender.sendMessage(`§a[Backpack+] Backpack has been reset!`)
                break

                case "see":
                    if(!isPlayerOP){
                        sender.sendMessage(`[Backpack+] OP required to use this command.`)
                        return
                    }
                    var id = cmd[2]
                    var bpQuery = {tags:[`bps_id:${id}`]}
                    var bpEntities = getBackpackEntity(bpQuery)
                    if(bpEntities.length==0){
                        sender.sendMessage(`§c[Backpack+] No backpack with that ID found!`)
                        return
                    }
                    for(let bpEntity of bpEntities){
                        let bpInv = bpEntity.getComponent("inventory").container
                        let itemList = "§eBackpack Items: "
                        for(let slot=0; slot<bpInv.size; slot++){
                            let item = bpInv.getItem(slot)
                            if(!item) continue
                            let itemName = ""
                            let itemNameArray = item.typeId.split(":")[1].split("_")
                            for(let itemStr of itemNameArray){
                                itemName +=  itemStr.charAt(0).toUpperCase() + itemStr.slice(1) + " ";
                            }
                            itemList += `§e${itemName.trim()} x${item.amount}§a, `
                        }
                        sender.sendMessage(itemList)
                    }
                break

                case "retrieve":
                    if(!isPlayerOP){
                        sender.sendMessage(`[Backpack+] OP required to use this command.`)
                        return
                    }
                    var id = cmd[2]
                    var bpQuery = {tags:[`bps_id:${id}`]}
                    var bpEntities = getBackpackEntity(bpQuery)
                    if(bpEntities.length==0){
                        sender.sendMessage(`§c[Backpack+] No backpack with that ID found!`)
                        return
                    }
                    for(let bpEntity of bpEntities){
                        let bpInv = bpEntity.getComponent("inventory").container
                        for(let slot=0; slot<bpInv.size; slot++){
                            let item = bpInv.getItem(slot)
                            if(!item) continue
                            sender.dimension.spawnItem(item,sender.location)
                            bpInv.setItem(slot, undefined)
                        }                       
                    }                    
                    world.setDynamicProperty(`bps_id:${id}`, undefined)
                    sender.sendMessage(`§e[Backpack+] Successfully retrieve items.`)
                break

                case "set":
                    if(!isPlayerOP){
                        sender.sendMessage(`[Backpack+] OP required to use this command.`)
                        return
                    }
                    var id = cmd[2]
                    var inv = sender.getComponent("inventory").container
                    var item = inv.getItem(player.selectedSlotIndex)
                    if(!item){
                        sender.sendMessage(`§c[Backpack+] Hold a backpack item`)
                        return
                    }
                    if(!item.typeId.includes("backpack")){
                        sender.sendMessage(`§c[Backpack+] Hold a backpack item`)
                        return
                    }
                    item.setLore([`bps_id:${id}`])
                    inv.setItem(player.selectedSlotIndex, item)
                break

                case "delete":
                    if(!isPlayerOP){
                        sender.sendMessage(`[Backpack+] OP required to use this command.`)
                        return
                    }
                    var id = cmd[2]
                    var bpQuery = {tags:[`bps_id:${id}`]}
                    var bpEntities = getBackpackEntity(bpQuery)
                    if(bpEntities.length==0){
                        sender.sendMessage(`§c[Backpack+] No backpack with that ID found!`)
                        return
                    }
                    for(let bpEntity of bpEntities){
                        let bpInv = bpEntity.getComponent("inventory").container
                        for(let slot=0; slot<bpInv.size; slot++){
                            if(item){
                                bpInv.setItem(slot, undefined)
                            }                           
                        }
                        bpEntity.kill()                    
                    }                 
                    world.setDynamicProperty(`bps_id:${id}`, undefined)
                    sender.sendMessage(`§e[Backpack+] Backpack Deleted.`)
                break

                case "debug":
                    let DynamicPropertyByteCount = world.getDynamicPropertyTotalByteCount()
                    sender.sendMessage(`Byte Count:` + DynamicPropertyByteCount)
                    let debugProperty = ""
                    for(let x=0; x<32767; x++){
                        debugProperty = debugProperty + "x"
                    }                    
                    world.setDynamicProperty("debug", debugProperty)
                    DynamicPropertyByteCount = world.getDynamicPropertyTotalByteCount()
                    sender.sendMessage(`After Debug Byte Count:` + DynamicPropertyByteCount)
                    world.setDynamicProperty("debug", undefined)
                break

                case "list":
                    let backpackEntities = sender.dimension.getEntities({families:["bps"]})
                    let idList = "§e[Backpack+] ID List: "
                    for(let backpackEntity of backpackEntities){
                        idList = idList + `${backpackEntity.getTags()[0].split(":")[1]}, ` 
                    }
                    sender.sendMessage(idList)
                break

                default:
                    commandList(sender)
            }
        }
    }else{
        if(cmd[0].trim() == "!bps"){
            commandList(sender)
        }
    }  
}

function commandList(sender){
    sender.sendMessage(`§e<Backpack+ Commands>`)       
    sender.sendMessage(`§ebps:reset - Reset the backpack item your holding.`)
    //if(isPlayerOP){
        sender.sendMessage(`§ebps:sudo <Player Name> <Backpack Command> - Execute a backpack command as another player.`)
        sender.sendMessage(`§ebps:clear bp - Deletes all backpacks and item recovery.`)
        sender.sendMessage(`§ebps:list - See all backpack IDs.`)
        sender.sendMessage(`§ebps:see <ID:int> - See specific backpack items.`)               
        sender.sendMessage(`§ebps:retrieve <ID:int> - Retrieve backpack items.`)
        sender.sendMessage(`§ebps:set <ID:int> - Manually set your backpack id.`)
        sender.sendMessage(`§ebps:delete <ID:int> - Delete backpack and recovery items.`)
        //sender.sendMessage(`§e!bps delete inactive - Delete inactive backpack and recovery items. Inactive backpacks are the those that don't have items.`)
    //}
}

function backpackType(item){
    let typeId = item.typeId
    switch(typeId){
        case "bps:backpack":
            return "small"
        case "bps:backpack_medium":
            return "medium"
        case "bps:backpack_big":
            return "big"
        case "bps:backpack_xl":
            return "xl"
    }
}

function backpackName(item){
    let typeId = item.typeId
    switch(typeId){
        case "bps:backpack":
            return "Small Backpack"
        case "bps:backpack_medium":
            return "Medium Backpack"
        case "bps:backpack_big":
            return "Big Backpack"
        case "bps:backpack_xl":
            return "XL Backpack"
    }
}

function getBackpackEntity(query){
    let dimensions = DimensionList;
    let entityList = [];
    for (let dimension of dimensions) {
        const bpEntities = world.getDimension(dimension).getEntities(query);
        if (bpEntities.length) {
            entityList = entityList.concat(bpEntities);
        }
    }
    return entityList;
}

function openBackpack(player, bpItem) {
    const bpLore = bpItem.getLore();
    const bpId = bpLore[0];
    let bpOldEntities = getBackpackEntity({ tags: [bpId] });

    if (bpOldEntities.length === 0) {
        player.sendMessage(`§c[Backpack+] Unable to retrieve backpack items.`);
        player.sendMessage(`§c[Backpack+] Will attempt to recover items.`);
        bpOldEntities = recoverItems(player, bpId);
        if (!bpOldEntities) return;
    }

    const bpEntity = player.dimension.spawnEntity("bps:container_entity_temp", player.location);
    bpEntity.triggerEvent(backpackType(bpItem));
    const bpInventory = bpEntity.getComponent("inventory").container;

    for (const bpOldEntity of bpOldEntities) {
        const bpOldEntityInventory = bpOldEntity.getComponent("inventory").container;
        transferItems(bpOldEntityInventory, bpInventory);
        bpOldEntity.remove();
        try {
            bpOldEntity.triggerEvent("despawn2");
        } catch (e) {
            // Handle potential errors silently
        }
    }
    
    bpEntity.addTag(bpId);
    bpEntity.nameTag = backpackName(bpItem);

    //Ensure the backpack is properly named (Due to other addon renaming entities)
    system.runTimeout(() => {
        if(bpEntity.isValid) bpEntity.nameTag = backpackName(bpItem);
    }, 1);

    system.runTimeout(() => {
        if(bpEntity.isValid) bpEntity.nameTag = backpackName(bpItem);
    }, 5);

    system.runTimeout(() => {
        if(bpEntity.isValid){
            if(world.getEntity(bpEntity.id).nameTag != backpackName(bpItem)){
            console.warn(`[Improved Backpack] Name has been changed.`)
            }   
        }    
    }, 20);
}

function transferItems(sourceInventory, targetInventory) {
    for (let index = 0; index < sourceInventory.size; index++) {
        const item = sourceInventory.getItem(index);
        if (item) {
            targetInventory.setItem(index, item);
            sourceInventory.setItem(index, undefined);
        }
    }
}


function closeBackpack(backpackEntity, player, propertyDataOld){
    let newLocation = backpackEntity.location
    newLocation.y = -64
    backpackEntity.teleport(newLocation)
}

function recordItems(id, inventory, bpEntity) {
    let count = 0;
    let countOverflow = 0;
    const backupItemList = [];
    const lore = [`${id}`];

    for (let slot = 0; slot < inventory.size; slot++) {
        const item = inventory.getItem(slot);
        if (!item) continue;

        // Handle forbidden items
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

function isForbiddenItem(item) {
    return forbiddentItems.some(itemName => item.typeId.includes(itemName));
}

function formatItemForLore(item) {
    const itemName = item.typeId
        .split(":")[1]
        .split("_")
        .map(str => str.charAt(0).toUpperCase() + str.slice(1))
        .join(" ");
    return `§7${itemName} x${item.amount}`;
}

function getItemProperties(item) {
    const itemInterface = {
        id: item.typeId,
        name: item.nameTag || undefined,
        amount: item.amount,
        lore: item.getLore().length > 0 ? item.getLore() : undefined,
        durability: item.hasComponent("durability") ? item.getComponent("durability").damage : undefined,
        enchant: []
    };

    const enchantList = Enchantments.getEnchants(item);
    if (enchantList.length > 0) {
        itemInterface.enchant = enchantList.map(enchant => ({
            enchantName: enchant.type.id,
            level: enchant.level
        }));
    }

    return itemInterface;
}


function recoverItems(player, id) {
    const itemProperties = world.getDynamicProperty(id);

    if (itemProperties) {
        const playerInv = player.getComponent("inventory").container;
        const bpEntity = player.dimension.spawnEntity("bps:container_entity_temp", player.location);
        const selectedItem = playerInv.getItem(player.selectedSlotIndex);
        
        bpEntity.addTag(id);
        bpEntity.nameTag = backpackName(selectedItem);
        bpEntity.triggerEvent(backpackType(selectedItem));

        const bpInv = bpEntity.getComponent("inventory").container;
        const itemPropertiesParse = JSON.parse(itemProperties);

        for (const itemProperty of itemPropertiesParse) {
            const item = new ItemStack(itemProperty.id, itemProperty.amount);
            
            if (itemProperty.name) item.nameTag = itemProperty.name;
            if (itemProperty.lore) item.setLore(itemProperty.lore);
            if (itemProperty.durability) item.getComponent("durability").damage = itemProperty.durability;
            if (itemProperty.enchant) {
                for (const enchant of itemProperty.enchant) {
                    Enchantments.addEnchant(item, { type: EnchantmentTypes.get(enchant.enchantName), level: enchant.level });
                }
            }
            
            bpInv.addItem(item);
        }

        player.sendMessage(`§e[Backpack+] Items successfully recovered.`);
        return [bpEntity];
    } else {
        player.sendMessage(`§c[Backpack+] Unable to find recovery backup.`);
        return false;
    }
}
