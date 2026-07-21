import type {ItemState} from '../types/index.js' 
import type {Player} from '../entities/Player.js'

export abstract class BaseItem implements ItemState {
    public readonly item_id: number;
    public readonly item_type: string;
    public amount: number;

    constructor(state: ItemState) {
        this.item_id = state.item_id;
        this.item_type = state.item_type;
        this.amount = state.amount;
    }
    public abstract use(player: Player): void; // метод использования предмета чтобы дальше его к классу player
}
