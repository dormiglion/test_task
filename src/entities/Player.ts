import type {Position, PlayerState, ItemState, GroundItemState} from '../types/index.js'

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
            slot_head: null,
            slot_body: null,
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
        if (value < 0) {
            this.state.health = 0;
        } else {
            this.state.health = value;
        }
    }
    get armor(): number {
        return this.state.armor;
    }
    set armor(value: number) {
        if (value < 0) {
            this.state.armor = 0;
        } else {
            this.state.armor = value;
        }
    }
    // для слотов брони и оружия 
    get slot_weapon(): ItemState | null {
        return this.state.slot_weapon;
    }
    set slot_weapon(value: ItemState | null) {
        this.state.slot_weapon = value;
    }
    get slot_head(): ItemState | null {
        return this.state.slot_head;
    }
    set slot_head(value: ItemState | null) {
        this.state.slot_head = value;
    }  
    get slot_body(): ItemState | null {
        return this.state.slot_body;
    }
    set slot_body(value: ItemState | null) {
        this.state.slot_body = value;
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
        for (let i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = itemGround.itemCommon;
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
            if (currentItem !== null && currentItem !== undefined && currentItem.item_id === itemId) {
                this.inventory[i] = null;
                console.log(`Игрок с id ${this.player_id} выбросил предмет ${currentItem.item_type} с id ${currentItem.item_id}.`);
                return currentItem;
            }
        }
        console.log(`Игрок с id ${this.player_id} не может выбросить предмет с id ${itemId}, так как он не находится в инвентаре.`);
        return null;
    }
    // для использования
    public useItem(itemId: number): boolean {
        for (let i = 0; i < this.inventory.length; i++){
            const currentItem = this.inventory[i];
            if (currentItem !== null && currentItem !== undefined && currentItem.item_id === itemId) {
                
            }
        }
    }
}
