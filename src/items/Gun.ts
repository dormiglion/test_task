import { BaseItem } from "./BaseItem.js";
import {Ammo} from "./Ammo.js";
import type { Player } from "../entities/Player.js";


export class Gun extends BaseItem {
    public current_ammo: number;
    public max_ammo: number;


    constructor(id: number, current_ammo: number = 0, max_ammo: number = 30, amount: number = 1) {
        super(id, 'gun', amount);
        this.current_ammo = current_ammo;
        this.max_ammo = max_ammo;
    }
    public use(player: Player): void {
        if (this.current_ammo > 0){
            this.current_ammo--;
            console.log(`Выстрел сделан`);
        } else {
            console.log(`Патронов нет, перезарядитесь`);
        }
        
    }
    public reload(ammo: Ammo): void {
        const needed_to_reload = this.max_ammo - this.current_ammo;
        const take_from_ammo_box = Math.min(needed_to_reload, ammo.ammo_cnt)
        
    }
}