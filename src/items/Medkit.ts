import { BaseItem } from "./BaseItem.js";
import type {Player} from '../entities/Player.js';

export class Medkit extends BaseItem {
    constructor(id: number, amount: number = 1) {
        super(id, 'medkit', amount);
    }
    public use(player: Player): void {
        player.health += 25;
        console.log(`Игрок ${player.player_id} использовал аптечку. Здоровье: ${player.health}`)
    }
}