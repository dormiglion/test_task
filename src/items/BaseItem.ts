import type {ItemState, GameConfig} from '../types/index.js' 
import type {Player} from '../entities/Player.js'

export abstract class BaseItem implements ItemState {
    public item_id: number;
    public readonly item_type: string;
    public amount: number;
    public readonly max_stack: number = 1;

    constructor(state: ItemState) {
        this.item_id = state.item_id;
        this.item_type = state.item_type;
        this.amount = state.amount;
    }
    public abstract use(player: Player, config: GameConfig): boolean; // метод использования предмета чтобы дальше его к классу player

    public getState(): ItemState { // для того чтобы вытащить из объекта класаа сырые данные
        return {
            item_id: this.item_id,
            item_type: this.item_type,
            amount: this.amount
        };
    }
}

