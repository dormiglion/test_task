import { BaseItem } from "./BaseItem.js";
import type { Player } from "../entities/Player.js";
import { registerItemType } from '../ItemFactory.js';
import type { ItemState } from "../types/index.js";

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

    public use(player: Player): void {
        if (player.slot_armor === this) { // если броня уже надета то снимаем
            const emptySlotIndex = player.inventory.findIndex(item => item === null);
            if (emptySlotIndex === -1) {
                console.log(`Игрок с id ${player.player_id} не может снять броню, так как инвентарь полон. Сначала освободите место.`);
                return; 
            }
            player.inventory[emptySlotIndex] = this;
            player.slot_armor = null;
            player.armor -= this.current_armor; 
            console.log(`Игрок снял броню с id ${this.item_id} и положил её в слот инвентаря ${emptySlotIndex}. 
                Текущая броня игрока: ${player.armor}`);
            return;
        }
        const slotIndex = player.inventory.indexOf(this); // если use на броню из инвентаря, тогда надеваем
        if (slotIndex !== -1) {
            const oldArmor = player.slot_armor;

            if (oldArmor instanceof Armor) { // если в активном слоте уже лежала броня
            player.inventory[slotIndex] = oldArmor;
            player.slot_armor = this;

            player.armor -= oldArmor.current_armor;
            player.armor += this.current_armor;

            console.log(`Игрок заменил броню с id ${oldArmor.item_id} на броню с id ${this.item_id}. 
                Текущая броня игрока: ${player.armor}`);

            } else {
                player.inventory[slotIndex] = null; // если слот активной брони был пуст 
                player.slot_armor = this;           

                player.armor += this.current_armor;
                console.log(`Игрок экипировал броню с id ${this.item_id}. Текущая броня игрока: ${player.armor}`);
            }
        } else {
            console.log(`Ошибка: эта броня не найдена ни на игроке, ни в инвентаре.`);
        }
    }

    public getState(): ItemState & { current_armor: number } { 
        return {
            ...super.getState(),
            current_armor: this.current_armor
        }
    } 
}
registerItemType('armor', Armor);