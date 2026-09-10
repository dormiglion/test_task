import type {Position, PlayerState, ItemState, GameConfig} from '../types/index.js'
import { BaseItem } from '../items/BaseItem.js';
import { Gun } from '../items/Gun.js';
import { Ammo } from '../items/Ammo.js';
import { Armor } from '../items/Armor.js';
import { createItemInstance } from '../ItemFactory.js';
import { isPositionValid } from '../core/GameConfig.js';

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
        if (!isPositionValid(new_x, new_y, this.config)) {
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
    public tryAddItem(itemInstance: BaseItem, generateItemId: () => number): PickUpResult {
        let addedSomething = false;

        // кладется в уже существующие ячейки инвенторя, в которых такой же тип
        for (const slot of this.inventory) {
            if (itemInstance.amount <= 0) {
                break;
            }
            if (slot instanceof BaseItem && slot.item_type === itemInstance.item_type 
                && slot.amount < slot.max_stack) {
                const spaceLeft = slot.max_stack - slot.amount;
                const moved = Math.min(spaceLeft, itemInstance.amount);
                slot.amount += moved;
                itemInstance.amount -= moved;
                addedSomething = true;
                console.log(`Игрок ${this.player_id} добавил ${moved} ${itemInstance.item_type} в существующий стак. Теперь их ${slot.amount}.`);
            }
        }

        // остаток по пустым слотам
        while (itemInstance.amount > 0) {
            const emptySlotIndex = this.inventory.findIndex(item => item === null);
            if (emptySlotIndex === -1) {
                console.log(`Инвентарь полон! Предмет или остаток ${itemInstance.item_type} (${itemInstance.amount} шт) выпадает обратно на землю.`);
                return { success: addedSomething, leftover: itemInstance };
            }
            if (itemInstance.amount <= itemInstance.max_stack) {
                this.inventory[emptySlotIndex] = itemInstance;
                console.log(`Игрок ${this.player_id} положил ${itemInstance.item_type} (${itemInstance.amount} шт) в пустой слот ${emptySlotIndex}.`);
                return { success: true, leftover: null };
            }
            // предметов больше, чем стак
            const fullStack = createItemInstance({
                ...itemInstance.getState(),
                item_id: generateItemId(),
                amount: itemInstance.max_stack
            });
            this.inventory[emptySlotIndex] = fullStack;
            itemInstance.amount -= itemInstance.max_stack;
            addedSomething = true;
            console.log(`Игрок ${this.player_id} положил ${fullStack.item_type} (${fullStack.amount} шт) в пустой слот ${emptySlotIndex}.`);
        }

        return { success: addedSomething, leftover: null };
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
                const isUsed = currentItem.use(this, this.config);
                if (isUsed) {
                    if (currentItem.consumable) { // для расходуемых
                        currentItem.amount--;
                        if (currentItem.amount <= 0) {
                            this.inventory[i] = null;
                         }
                    }
                    console.log(`Предмет с id ${itemId} успешно применен игроком с id ${this.player_id}`)
                }
                return isUsed;
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
    public equipWeapon(itemId: number): boolean {
        for (let i = 0; i < this.inventory.length; i++) {
            const item = this.inventory[i];
            if (!(item instanceof Gun) || item.item_id !== itemId) { // --> вот тут проверять не на Gun а на Weapon
                continue;
            }
            const previousWeapon = this.slot_weapon;
            this.slot_weapon = item;
            this.inventory[i] = previousWeapon;

            if (previousWeapon === null) {
                console.log(`Игрок с id ${this.player_id} экипировал оружие с id ${item.item_id}.`);
            } else {
                console.log(`Игрок с id ${this.player_id} заменил оружие в слоте на оружие с id ${item.item_id}. 
                    Оружие с id ${previousWeapon.item_id} было возвращено в слот инвентаря ${i}.`);
            }
            return true;
        }
        console.log(`Игрок с id ${this.player_id} не может экипировать предмет с id ${itemId}: 
            он не найден в инвентаре или не является оружием.`);
        return false;
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
        const gun = this.slot_weapon;
        if (!(gun instanceof Gun)) {
            console.log(`Игрок с id ${this.player_id} не может перезарядить оружие, так как слот оружия пуст`);
            return false;
        }

        let foundAmmo = false;
        let reloadedAnything = false;

        for (let i = 0; i < this.inventory.length; i++) {
            const ammo_in_inventory = this.inventory[i];
            if (!(ammo_in_inventory instanceof Ammo)) {
                continue;
            }
            foundAmmo = true;

            if (gun.reload(ammo_in_inventory)) {
                reloadedAnything = true;
            }
            if (ammo_in_inventory.isEmpty()) {
                this.inventory[i] = null;
                console.log(`Коробка с патронами с id ${ammo_in_inventory.item_id} была удалена из инвентаря, так как она пуста.`);
            }
            if (gun.isFull()) {
                break; // оружие заряжено, остальные коробки не трогаем
            }
        }

        if (!foundAmmo) {
            console.log(`Игрок с id ${this.player_id} не может перезарядить оружие с id ${gun.item_id}, 
            так как в инвентаре нет патронов.`);
            return false;
        }
        return reloadedAnything;
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
