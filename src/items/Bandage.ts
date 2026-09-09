import { BaseItem } from "./BaseItem.js";
import type { Player } from "../entities/Player.js";
import type { ItemState, GameConfig } from "../types/index.js";
import { registerItemType } from "../ItemFactory.js";
import { registerEffect } from "../EffectRegistry.js";

export class Bandage extends BaseItem {
    public readonly max_stack: number = 5;
    public readonly consumable: boolean = true;

    constructor(state: ItemState);
    constructor(id: number, amount?: number);

    constructor(
        idOrState: number | ItemState, 
        amount: number = 1
    ) {
        if (typeof idOrState === 'object') {
            super(idOrState);
        } else {
            super({ item_id: idOrState, item_type: 'bandage', amount: amount });
        }
    }

    public use(player: Player, config: GameConfig): boolean {
        player.activeEffects['bandage'] = { remaining_ticks: config.bandage_duration_ticks };
        console.log(`Игрок ${player.player_id} перевязался. Бинт будет лечить ${config.bandage_duration_ticks} тиков.`);
        return true;
    }
}
registerItemType('bandage', Bandage);

// сам эффект тоже принадлежит бинту, а не ядру: ядро только вызывает обработчик по имени
registerEffect('bandage', (player, config) => {
    player.health += config.bandage_healing;
    console.log(`Бинт лечит игрока ${player.player_id} на ${config.bandage_healing}. Здоровье: ${player.health}`);
});