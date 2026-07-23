import { BaseItem } from "./BaseItem.js";
import {Ammo} from "./Ammo.js";
import type { Player } from "../entities/Player.js";
import { registerItemType } from '../ItemFactory.js';
import type { ItemState, GameConfig } from "../types/index.js";


export class Gun extends BaseItem {
    public current_ammo: number;
    public max_ammo: number;


    // constructor(id: number, current_ammo: number = 0, max_ammo: number = 30, amount: number = 1) {
    //     super(id, 'gun', amount);
    //     this.current_ammo = current_ammo;
    //     this.max_ammo = max_ammo;
    // }

    constructor(state: ItemState);
    constructor(id: number, current_ammo?: number, max_ammo?: number, amount?: number);
    
    // Единая реализация конструктора, обрабатывающая оба варианта
    constructor(
        idOrState: number | (ItemState & { current_ammo?: number; max_ammo?: number }),
        current_ammo: number = 0,
        max_ammo: number = 30,
        amount: number = 1
    ) {
        if (typeof idOrState === 'object') {
            // Если передан стейт из фабрики или базы данных
            super(idOrState);
            this.current_ammo = idOrState.current_ammo ?? 0;
            this.max_ammo = idOrState.max_ammo ?? 30;
        } else {
            // Если предмет создается вручную через числа
            super({item_id: idOrState, item_type: 'gun', amount: amount});
            this.current_ammo = current_ammo;
            this.max_ammo = max_ammo;
        }
    }

    public use(player: Player, config: GameConfig): boolean {
        if (player.slot_weapon === this){
            if (this.current_ammo > 0){
                this.current_ammo--;
                console.log(`Выстрел сделан. Осталось патронов ${this.current_ammo}.`);
            } else {
                console.log(`Патронов нет, перезарядитесь`);
            }
        } else {
            console.log(`Пистолет лежит в рюкзаке! Сначала возьмите его нужно экипировать.`);
        }
        return false; 
    }
    public reload(ammo: Ammo): boolean {
        const needed_to_reload = this.max_ammo - this.current_ammo;
        const take_from_ammo_box = Math.min(needed_to_reload, ammo.ammo_cnt);
        this.current_ammo += take_from_ammo_box;
        ammo.ammo_cnt -= take_from_ammo_box;
        if (ammo.isEmpty()) {
            console.log(`Перезарядка сделана. В пистолете сейчас ${this.current_ammo} патронов. 
                Коробка с патронами пуста и будет удалена из инвентаря`);
        } else {
            console.log(`Перезарядка сделана. В пистолете сейчас ${this.current_ammo} патронов. 
                В коробке с патронами осталось ${ammo.ammo_cnt}`);
        }
        return ammo.isEmpty();
    }

    public getState(): ItemState & { current_ammo : number, max_ammo: number } { 
        return {
            ...super.getState(),
            current_ammo: this.current_ammo,
            max_ammo: this.max_ammo
        }
    } 
}
registerItemType('gun', Gun);