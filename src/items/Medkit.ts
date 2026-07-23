import { BaseItem } from "./BaseItem.js";
import type {Player} from '../entities/Player.js';
import type { GameConfig, ItemState } from "../types/index.js";
import { registerItemType } from "../ItemFactory.js";

export class Medkit extends BaseItem {
    // constructor(id: number, amount: number = 1) {
    //     super(id, 'medkit', amount);
    // }
    public readonly max_stack: number = 5;

    constructor(state: ItemState);
    constructor(id: number, amount?: number);

    constructor(
        idOrState: number | ItemState,
        amount: number = 1
    ) {
        if (typeof idOrState === 'object'){
            super(idOrState);
        } else {
            super({item_id: idOrState, item_type: 'medkit', amount: amount })
        }
    }

    public use(player: Player, config: GameConfig): boolean {
        player.health += config.medkit_healing;
        this.amount--
        console.log(`Игрок ${player.player_id} использовал аптечку. Здоровье: ${player.health}`)
        return this.amount <= 0;    
    }
    public getState(): ItemState { // Spread  синтаксис в JavaScript, который позволяет разобрать массив или объект на отдельные элементы.
        return {
            ...super.getState()
        }
    }
}
registerItemType('medkit', Medkit)