import type {ItemState, PlayerState} from '../types/index.js' 
import type {Player} from '../entities/Player.js'

export abstract class BaseItem implements ItemState {
    public readonly item_id: number;
    public readonly item_type: string
    public amount: number;

    constructor(item_id: number, item_type: string, amount: number) {
        this.item_id = item_id;
        this.item_type = item_type;
        this.amount = amount;
    }
    public abstract use(player: Player): void; // метод использования предмета чтобы дальше его к классу player
}
