import { BaseItem } from "./BaseItem.js";
import type {Player} from '../entities/Player.js';
import type { ItemState } from "../types/index.js";
import { registerItemType } from "../ItemFactory.js";

export class Medkit extends BaseItem {
    // constructor(id: number, amount: number = 1) {
    //     super(id, 'medkit', amount);
    // }
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

    public use(player: Player): void {
        player.health += 25;
        console.log(`Игрок ${player.player_id} использовал аптечку. Здоровье: ${player.health}`)
    }
}
registerItemType('medkit', Medkit)