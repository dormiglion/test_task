import type {Position, PlayerState, ItemState, GroundItemState} from '../types/index.js'
import { BaseItem } from '../items/BaseItem.js';
import { Gun } from '../items/Gun.js';
import { Ammo } from '../items/Ammo.js';
import { createItemInstance } from '../ItemFactory.js';

export class Player {
    public position: Position;
    public state: PlayerState;

    // конструктор игрока
    constructor(player_id: number, start_x: number, start_y: number) {
        this.position = {x: start_x, y: start_y};
        this.state = {
            player_id: player_id,
            health: 100,
            armor: 0,
            slot_weapon: null,
            slot_armor: null,
            inventory: [null, null, null, null, null, null, null, null],
            activeEffects: {}
        };
    }

    // геттеры и сеттеры
    get player_id(): number {
        return this.state.player_id;
    }
    // для координат
    get x(): number {
        return this.position.x;
    }
    set x(value: number) {
    this.position.x = value;
    }
    get y(): number {
        return this.position.y;
    }
    set y(value: number) {
    this.position.y = value;
    }

    // для здоровья и брони
    get health(): number {
        return this.state.health;
    }
    set health(value: number) {
        this.state.health = Math.min(100, Math.max(0, value));
    }
    get armor(): number {
        return this.state.armor;
    }
    set armor(value: number) {
        this.state.armor = Math.min(150, Math.max(0, value));
    }
    // для слотов брони и оружия 
    get slot_weapon(): ItemState | null {
        return this.state.slot_weapon;
    }
    set slot_weapon(value: ItemState | null) {
        this.state.slot_weapon = value;
    }
    get slot_armor(): ItemState | null {
        return this.state.slot_armor;
    }
    set slot_armor(value: ItemState | null) {
        this.state.slot_armor = value;
    }  

    // для 8 слотов инвентаря
    get inventory(): PlayerState['inventory'] {
        return this.state.inventory;
    }
    set inventory(value: PlayerState['inventory']) {
        this.state.inventory = value;
    }
    // для активных эффектов
    get activeEffects(): PlayerState['activeEffects'] {
        return this.state.activeEffects;
    }
    set activeEffects(value: PlayerState['activeEffects']){
        this.state.activeEffects = value;
    }

    // МЕТОДЫ

    public moveTo(new_x: number, new_y: number): boolean {
        if (new_x < 0 || new_y < 0 || new_x > 50 || new_y > 50 || !Number.isInteger(new_x) || !Number.isInteger(new_y)) {
            console.log(`Игрок с id ${this.player_id} не может переместиться на 
                координаты (${new_x}, ${new_y}) так как это выходит за границы 
                карты, или же введённые значения не являются целыми числами.\n
                Введите целое значение от 0 до 50 для каждой координаты.`);
            return false;
        } else {
            this.x = new_x;
            this.y = new_y;
            console.log(`Игрок с id ${this.player_id} переместился на координаты (${new_x}, ${new_y}).`);
            return true;
        }
    }
    // пикап метод, передается объект GroundItemState, чтобы принять еще и координаты
    // а уже в инвентаре передается только itemCommon, то есть объект с интерфейсом ItemState
    // надо будет добавить для стака
    public pickUpItem(itemGround: GroundItemState): boolean {
        for (let i = 0; i < this.inventory.length; i++) { // this.inventory.findIndex(item => item === null) можно делать так
            if (this.inventory[i] === null) {
                // создание класса предмета а не просто itemstate
                const itemInstance = createItemInstance(itemGround.itemCommon);
                this.inventory[i] = itemInstance;

                console.log(`Игрок с id ${this.player_id} подобрал предмет ${itemGround.itemCommon.item_type} 
                    с id ${itemGround.itemCommon.item_id} с координат (${itemGround.position.x}, ${itemGround.position.y}).`);
                return true;
            }
        }
        console.log(`Игрок с id ${this.player_id} не может поднять предмет ${itemGround.itemCommon.item_type} 
            с id ${itemGround.itemCommon.item_id} с координат (${itemGround.position.x}, ${itemGround.position.y}), 
            так как инвентарь полон.`);
        return false;
    }
    // дроп, надо будет менять для стаковых предметов
    public dropItem(itemId: number): ItemState | null {
        for (let i = 0; i < this.inventory.length; i++) {
            const currentItem = this.inventory[i];
            if (currentItem instanceof BaseItem && currentItem.item_id === itemId) {
                const itemStateData = currentItem.getState(); // чтобы у нас на земле валялся стейт
                this.inventory[i] = null;
                console.log(`Игрок с id ${this.player_id} выбросил предмет ${currentItem.item_type} с id ${currentItem.item_id}.`);
                return itemStateData;
            }
        }
        console.log(`Игрок с id ${this.player_id} не может выбросить предмет с id ${itemId}, так как он не находится в инвентаре.`);
        return null;
    }
    // для использования предметов
    public useItem(itemId: number): boolean {
        for (let i = 0; i < this.inventory.length; i++){
            const currentItem = this.inventory[i];
            if (currentItem instanceof BaseItem && currentItem.item_id === itemId) {
                currentItem.use(this);
                return true;
            }
        }
        return false;
    }

    // для атаки
    // если добавлять ножи и тд то надо будет поменять equipWeapon
    // создать промежуточный класс Weapon, от него уже наследуется все оружие и тогда --> [1]
    public useWeapon(): boolean {
        if (this.slot_weapon instanceof BaseItem) {
            this.slot_weapon.use(this);
            return true;
        } else {
            console.log(`Игрок с id ${this.player_id} пытается атаковать, но в руках нет оружия.`);
            return false;
        }
    }

    // чтобы положить оружие в активный слот, и обратно
    public equipWeapon(slotIndex: number): void {
        const item = this.inventory[slotIndex];
        if (!(item instanceof Gun)) { // --> [1] вот тут проверять не на Gun а на Weapon
            console.log(`Игрок с id ${this.player_id} не может экипировать предмет с слота ${slotIndex}, так как он не является оружием.`);
            return;
        }
        if (this.slot_weapon === null) {
            this.slot_weapon = item;
            this.inventory[slotIndex] = null;
            console.log(`Игрок с id ${this.player_id} экипировал оружие с id ${item.item_id}.`);
        } else {
            const temp = this.slot_weapon;
            this.slot_weapon = item;
            this.inventory[slotIndex] = temp;
            console.log(`Игрок с id ${this.player_id} заменил оружие в слоте на оружие с id ${item.item_id}. 
                Оружие с id ${temp.item_id} был возвращён в слот инвентаря ${slotIndex}.`);
        }
    }

    public unequipWeapon(): void {
        if (this.slot_weapon === null) {
            console.log(`Игрок с id ${this.player_id} не может снять оружие, так как слот оружия пуст.`);
            return;
        }
        for (let i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = this.slot_weapon;
                console.log(`Игрок с id ${this.player_id} снял оружие с id ${this.slot_weapon.item_id} 
                    и положил его в слот инвентаря ${i}.`);
                this.slot_weapon = null;
                return;
            }
        }
        console.log(`Игрок с id ${this.player_id} не может снять оружие c id ${this.slot_weapon.item_id}, 
            так как инвентарь полон.`);
    }

    // реализация перезарядки оружия уже в самом игроке
    public reloadWeapon(): boolean {
        const gun = this.slot_weapon
        if (!(gun instanceof Gun)) {
            console.log(`Игрок с id ${this.player_id} не может перезарядить оружие, так как слот оружия пуст`);
            return false;
        }

        for (let i = 0; i < this.inventory.length; i++) {
            const ammo_in_inventory = this.inventory[i];
            if (ammo_in_inventory instanceof Ammo) {
                gun.reload(ammo_in_inventory);
                if (ammo_in_inventory.isEmpty()) {
                    this.inventory[i] = null;
                    console.log(`Коробка с патронами с id ${ammo_in_inventory.item_id} была удалена из инвентаря, так как она пуста.`);
                }
                return true;
            }
        }
        console.log(`Игрок с id ${this.player_id} не может перезарядить оружие с id ${gun.item_id}, 
            так как в инвентаре нет патронов.`);
        return false;
    }
}
