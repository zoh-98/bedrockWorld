import { world, system } from "@minecraft/server";
import { isArabicScript, processArabicScriptText, getVersion } from "./arabicTextProcessor";

console.log(processArabicScriptText("تم حديث مود اصلاح اللغة العربية الى اصدار"));


world.beforeEvents.chatSend.subscribe((event) => {
	const { message, sender } = event;
	if (!isArabicScript(message)) return;
	event.cancel = true;
	world.sendMessage(`<${sender.name}> ${processArabicScriptText(message)}`);
});

world.afterEvents.worldLoad.subscribe(() => {
	system.runInterval(() => {
		for (const player of world.getPlayers()) {

			//convert sign text
			const block = player.getBlockFromViewDirection({ maxDistance: 6, includeLiquidBlocks: false, includePassableBlocks: true })?.block
			if (!block?.typeId?.includes("sign")) return;
			const signComponent = block.getComponent("minecraft:sign");
			if (!signComponent) return;
			const convertSignText = (side) => {
				const text = signComponent.getText(side);
				if (!text) return;
				const firstChar = text.charAt(0);
				if (firstChar == "؀") return;
				if (!isArabicScript(text)) return;
				const convertedText = "؀" + processArabicScriptText(text);
				signComponent.setText(convertedText, side);
			};
			convertSignText("Back");
			convertSignText("Front");
		}
	}, 10);

	system.runInterval(() => {
		for (const player of world.getPlayers()) {

			//convert item name
			const { container } = player.getComponent("minecraft:inventory");
			const Item = container.getItem(player.selectedSlotIndex);
			if (!Item) return;
			let itemName = Item.nameTag;
			if (itemName == undefined) return;
			const firstChar = itemName.charAt(0);
			if (firstChar == "؀") return;
			if (!isArabicScript(itemName)) return;
			const convertedItemName = "؀" + processArabicScriptText(itemName);
			Item.nameTag = convertedItemName;
			container.setItem(player.selectedSlotIndex, Item);
		}
	}, 12);
});


const { version, supportedLanguages } = getVersion();

console.log(`Arabic Language Processor v${version} loaded!`);
console.log(`Supported Languages: ${supportedLanguages.join(", ")}`);