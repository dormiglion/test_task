import type {Position, PlayerState, ItemState, GroundItemState, GameConfig} from '../types/index.js'
import { BaseItem } from '../items/BaseItem.js';
import { Gun } from '../items/Gun.js';
import { Ammo } from '../items/Ammo.js';
import { Armor } from '../items/Armor.js';
import { createItemInstance } from '../ItemFactory.js';
import { InventoryStorage } from '../Storage/InventoryStorage.js';

type PickUpResult = {
    success: boolean;
    leftover: BaseItem | null;
};
export class Player {
    public position: Position;
    public state: PlayerState;
    private config: GameConfig;

    // конструктор игрока
    constructor(player_id: number, start_x: number, start_y: number, config: GameConfig) {
        this.config = config;
        this.position = {x: start_x, y: start_y};
        this.state = {
            player_id: player_id,
            health: this.config.maxHealth,
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
        this.state.health = Math.min(this.config.maxHealth, Math.max(0, value));
    }
    get armor(): number {
        return this.state.armor;
    }
    set armor(value: number) {
        this.state.armor = Math.min(this.config.maxArmor, Math.max(0, value));
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
        if (new_x < 0 || new_y < 0 || new_x > this.config.mapBounds.maxX || new_y > this.config.mapBounds.maxY || !Number.isInteger(new_x) || !Number.isInteger(new_y)) {
            console.log(`Игрок с id ${this.player_id} не может переместиться на 
                координаты (${new_x}, ${new_y}) так как это выходит за границы 
                карты, или же введённые значения не являются целыми числами.\n
                Введите целое значение от 0 до ${this.config.mapBounds.maxX} для X и до ${this.config.mapBounds.maxY} для Y.`);
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
    // 
    public tryAddItem(itemInstance: BaseItem): PickUpResult {
        let addedSomething = false;
        for (let i = 0; i < this.inventory.length; i++) {
            const slot = this.inventory[i];
            
            // если в слоте такой же предмет и стак не полный
            if (slot instanceof BaseItem && slot.item_type === itemInstance.item_type && slot.amount < slot.max_stack) {
                const spaceLeft = slot.max_stack - slot.amount;
                
                if (itemInstance.amount <= spaceLeft) {
                    // влезает и подбираем предмет
                    slot.amount += itemInstance.amount;
                    addedSomething = true;
                    console.log(`Игрок ${this.player_id} добавил ${itemInstance.item_type} в существующий стак. Теперь их ${slot.amount}.`);
                    return {success: true, leftover: null};
                } else {
                    // стак полный, но остался излишек 
                    slot.amount += spaceLeft;
                    itemInstance.amount -= spaceLeft;
                    addedSomething = true;
                    console.log(`Стак ${slot.item_type} заполнен. Ищем место для остатка (${itemInstance.amount} шт).`);
                }
            }
        }
        // если остался предмет не стакающийся или остаток, нужен пустой слот
        if (itemInstance.amount > 0) {
            const emptySlotIndex = this.inventory.findIndex(item => item === null);
            
            if (emptySlotIndex !== -1) {
                this.inventory[emptySlotIndex] = itemInstance;
                addedSomething = true;
                console.log(`Игрок ${this.player_id} положил ${itemInstance.item_type} в пустой слот ${emptySlotIndex}.`);
                return {success: true, leftover: null};
            } else {
                console.log(`Инвентарь полон! Предмет или остаток ${itemInstance.item_type} (${itemInstance.amount} шт) выпадает обратно на землю.`);
                return {success: addedSomething, leftover: itemInstance};
            }
        }
        return {success: addedSomething, leftover: null};;
    }
    // дроп метод, передается объект ItemState, а уже в геймворлде добавляются тики и айди
    public dropItem(itemId: number): ItemState | null {
        for (let i = 0; i < this.inventory.length; i++) {
            const currentItem = this.inventory[i];
            if (currentItem instanceof BaseItem && currentItem.item_id === itemId) {
                // предмет стакается и его больше 1 штуки то минцс одна штука
                const dropAmount = (currentItem.max_stack > 1 && currentItem.amount > 1) ? 1 : currentItem.amount;
                const itemState = currentItem.getState();
                
                // Создаем стейт для падающего предмета с нужным количеством
                const droppedItemState: ItemState = {
                    ...itemState,
                    amount: dropAmount
                };

                // Уменьшаем количество в инвентаре или очищаем слот, если ничего не осталось
                if (currentItem.max_stack > 1 && currentItem.amount > 1) {
                    currentItem.amount -= dropAmount;
                } else {
                    this.inventory[i] = null;
                }

                return droppedItemState;
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
                const isConsumed = currentItem.use(this, this.config);
                if (isConsumed) {
                    if (currentItem.max_stack > 1) { // для стаковых
                        currentItem.amount--;
                        if (currentItem.amount <= 0) {
                            this.inventory[i] = null;
                         }
                    } else {
                        this.inventory[i] = null;
                    }
                    console.log(`Предмет с id ${itemId} успешно применен игроком с id ${this.player_id}`)
                }
                return isConsumed;
            }
        }
        console.log(`Действие не выполнено, так как предмет с id ${itemId} не найден в инвентаре у игрока с id ${this.player_id}`)
        return false;
    }

    // для атаки
    // если добавлять ножи и тд то надо будет поменять equipWeapon
    // создать промежуточный класс Weapon, от него уже наследуется все оружие и тогда --> [1]
    public useWeapon(): boolean {
        if (this.slot_weapon instanceof BaseItem) {
            const isUsed = this.slot_weapon.use(this, this.config);
            return isUsed;
        } else {
            console.log(`Игрок с id ${this.player_id} пытается атаковать, но в руках нет оружия.`);
            return false;
        }
    }

    // чтобы положить оружие в активный слот, и обратно
    public equipWeapon(slotIndex: number): boolean {
        const item = this.inventory[slotIndex];
        if (!(item instanceof Gun)) { // --> [1] вот тут проверять не на Gun а на Weapon
            console.log(`Игрок с id ${this.player_id} не может экипировать предмет с слота ${slotIndex}, так как он не является оружием.`);
            return false;
        }
        if (this.slot_weapon === null) {
            this.slot_weapon = item;
            this.inventory[slotIndex] = null;
            console.log(`Игрок с id ${this.player_id} экипировал оружие с id ${item.item_id}.`);
            return true;
        } else {
            const temp = this.slot_weapon;
            this.slot_weapon = item;
            this.inventory[slotIndex] = temp;
            console.log(`Игрок с id ${this.player_id} заменил оружие в слоте на оружие с id ${item.item_id}. 
                Оружие с id ${temp.item_id} был возвращён в слот инвентаря ${slotIndex}.`);
            return true;
        }
    }

    public unequipWeapon(): boolean {
        if (this.slot_weapon === null) {
            console.log(`Игрок с id ${this.player_id} не может снять оружие, так как слот оружия пуст.`);
            return false;
        }
        for (let i = 0; i < this.inventory.length; i++) {
            if (this.inventory[i] === null) {
                this.inventory[i] = this.slot_weapon;
                console.log(`Игрок с id ${this.player_id} снял оружие с id ${this.slot_weapon.item_id} 
                    и положил его в слот инвентаря ${i}.`);
                this.slot_weapon = null;
                return true;
            }
        }
        console.log(`Игрок с id ${this.player_id} не может снять оружие c id ${this.slot_weapon.item_id}, 
            так как инвентарь полон.`);
        return false;
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
                const ammoConsumed = gun.reload(ammo_in_inventory);
                if (ammoConsumed) {
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

    public toggleArmor(itemId: number): boolean {
        //const armorObj = this.inventory.find(item => item instanceof Armor && item.item_id === itemId);
        let armorObj: Armor | null = null;
        if (this.slot_armor instanceof Armor && this.slot_armor.item_id === itemId) { // для поиска брони как в инвентаре так и в слоте брони
            armorObj = this.slot_armor;
        } else {
            const found = this.inventory.find(item => item instanceof Armor && item.item_id === itemId);
            if (found instanceof Armor) {
                armorObj = found;
            }
        }
        if (!(armorObj instanceof Armor)) {
            console.log(
                `Игрок ${this.player_id} не может использовать броню с id ${itemId}, так как она не найдена в инвентаре.`
            );
            return false;
        }
        if (this.slot_armor === armorObj) { // если броня уже надета то снимаем
            const emptySlotIndex = this.inventory.findIndex(item => item === null);
            if (emptySlotIndex === -1) {
                console.log(`Игрок с id ${this.player_id} не может снять броню, так как инвентарь полон. Сначала освободите место.`);
                return false;
            }
            this.inventory[emptySlotIndex] = armorObj;
            this.slot_armor = null;
            this.armor -= armorObj.current_armor;
            console.log(`Игрок снял броню с id ${armorObj.item_id} и положил её в слот инвентаря ${emptySlotIndex}. 
                Текущая броня игрока: ${this.armor}`);
            return true;
        }
        const slotIndex = this.inventory.indexOf(armorObj);
        if (slotIndex !== -1) {
            const oldArmor = this.slot_armor;

            if (oldArmor instanceof Armor) {
                this.inventory[slotIndex] = oldArmor;
                this.slot_armor = armorObj;

                this.armor -= oldArmor.current_armor;
                this.armor += armorObj.current_armor;

                console.log(`Игрок заменил броню с id ${oldArmor.item_id} на броню с id ${armorObj.item_id}. 
                    Текущая броня игрока: ${this.armor}`);
                return true;
            } else {
                this.inventory[slotIndex] = null; // если слот активной брони был пуст 
                this.slot_armor = armorObj;           

                this.armor += armorObj.current_armor;
                console.log(`Игрок экипировал броню с id ${armorObj.item_id}. Текущая броня игрока: ${this.armor}`);
                return true;
            }
        } else {
            console.log(`Ошибка: эта броня не найдена ни на игроке, ни в инвентаре.`);
            return false;
        }
    }
}
