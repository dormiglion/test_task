import { BaseItem } from "./BaseItem.js";
import type { Player } from "../entities/Player.js";
import { registerItemType } from '../ItemFactory.js';
import type { ItemState, GameConfig } from "../types/index.js";

export class Armor extends BaseItem{
    public current_armor: number;

    constructor(state: ItemState);
    constructor(id: number, current_armor?: number, amount?: number);

    // Единая реализация конструктора
    constructor(
        idOrState: number | (ItemState & { current_armor?: number }),
        current_armor: number = 100,
        amount: number = 1
    ) {
        if (typeof idOrState === 'object') {
            //фабрика
            super(idOrState);
            this.current_armor = idOrState.current_armor ?? 100;
        } else {
            // вручную
            super({ item_id: idOrState, item_type: 'armor', amount: amount });
            this.current_armor = current_armor;
        }
    }

    public use (player: Player, config: GameConfig): boolean {
        return player.equipArmor(this.item_id);
    }

    public getState(): ItemState & { current_armor: number } { 
        return {
            ...super.getState(),
            current_armor: this.current_armor
        }
    } 
}
registerItemType('armor', Armor);