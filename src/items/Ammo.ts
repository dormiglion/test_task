import { BaseItem } from "./BaseItem.js";
import type { Player } from "../entities/Player.js";
import { registerItemType } from "../ItemFactory.js"
import type { ItemState } from "../types/index.js";

export class Ammo extends BaseItem {
    public ammo_cnt: number;

    // constructor(id: number, ammo_cnt: number = 10, amount: number = 1) {
    //     super(id, 'ammo', amount);
    //     this.ammo_cnt = ammo_cnt;
    // }

    constructor(state: ItemState);
    constructor(id: number, ammo_cnt?: number, amount?: number);

    // Единая реализация конструктора
    constructor(
        idOrState: number | (ItemState & { ammo_cnt?: number }),
        ammo_cnt: number = 10,
        amount: number = 1
    ) {
        if (typeof idOrState === 'object') {
            //фб=абрика
            super(idOrState);
            this.ammo_cnt = idOrState.ammo_cnt ?? 10;
        } else {
            // вручную
            super({ item_id: idOrState, item_type: 'ammo', amount: amount });
            this.ammo_cnt = ammo_cnt;
        }
    }

    public use(player: Player): void {
        console.log(`Необходимо выбрать какое оружие нужно перезарядить и применить ему метод reload. 
            Просто так использовать пули невозможно`)
    }
    // метод для удаления из инветаря, когда пули заканчиваются в коробке
    public isEmpty(): boolean {
        return this.ammo_cnt <= 0;
    }
}
registerItemType('ammo', Ammo);