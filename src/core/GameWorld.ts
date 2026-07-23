import type { GameConfig, ItemState, GroundItemState } from "../types/index.js";
import { Player } from "../entities/Player.js";
import type { InventoryStorage } from "../Storage/InventoryStorage.js";
import type { BaseItem } from "../items/BaseItem.js";
import { createItemInstance } from '../ItemFactory.js';


export class GameWorld {
    public players: Map<number, Player>;
    public storage: InventoryStorage;
    public config : GameConfig;
    private nextItemId: number = 1;

    constructor(storage: InventoryStorage, config: GameConfig) {
        this.storage = storage;
        this.config = config;
        this.players = new Map<number, Player>(); //передаетсмя не через конструктор
    }
    //геттер
    public getPlayer(player_id: number): Player | undefined {
        const player = this.players.get(player_id);
        if (!player) {
            console.log(`Игрока с id ${player_id} в системе не существует`);
            return undefined
        }
        return player;
    }

    // МЕТОДЫ
    public async addPlayer(player_id: number, start_x: number, start_y: number): Promise <Player | false> { // добавление игрока в активную игру
        if (this.players.has(player_id)) { // проверка если такой id занят
            console.log(`Игрок с id ${player_id} уже существует. Сейчас будет выведен список всех занятых id. После этого повторите операцию`);
            const all_ids = Array.from(this.players.keys());
            console.log(`Занятые id: ${all_ids}`)
            return false;
        } else {
            const player = new Player(player_id, start_x, start_y, this.config);
            const savedData = await this.storage.getInventory(player_id);
            // восстановить инвентарь и вещи если вдруг у нас игрок выходил из активной игры
            for (let i = 0; i < 8; i++) {
                const itemData = savedData.inventory[i];
                if (itemData) {
                    player.inventory[i] = createItemInstance(itemData);
                } else {
                    player.inventory[i] = null;
                }
            }
            if (savedData.slot_weapon) {
                player.slot_weapon = createItemInstance(savedData.slot_weapon);
            } else { player.slot_weapon = null }
            if (savedData.slot_armor) {
                player.slot_armor = createItemInstance(savedData.slot_armor);
            } else { player.slot_armor = null}

                this.players.set(player_id, player);
                return player;
        }
    }

    public removePlayer(player_id: number): boolean { // отключение от активной(!) игры
    if (!this.players.has(player_id)) {
        console.log(`Игрока с id ${player_id} нет на сервере.`);
        return false;
    }
        this.players.delete(player_id);
    
        console.log(`Игрок ${player_id} отключился от сервера. (Его вещи остались в БД)`);
        return true;
    }

    public async deletePlayerFromDB(player_id: number): Promise<boolean> { // ПОЛНОЕ удаление данных об игроке
        if (this.players.has(player_id)) {
            console.log(`Игроку с id ${player_id} сначала надо покинуть сервер, перед его полным удалением.`);
            return false;
        }
        const isDeleted = await this.storage.deleteDataPlayersItem(player_id);
        if (!isDeleted) {
            return false;
        }
        return true;
    }

    public async giveItem(player_id: number, item_type: string, amount: number = 1): Promise<boolean> { // выдача предмета в режиме бога
        const player = this.getPlayer(player_id);
        if (!player) {
            console.log(`Игрока с id ${player_id} в системе не существует`);
            return false;
        }
        if (amount <= 0 || !Number.isInteger(amount)) {
            console.log(`Невозможно выдать неверное количество предметов: ${amount}`);
            return false;
        }

        if (!this.config.validItemTypes.includes(item_type)) {
            console.log(`Неизвестный тип предмета: ${item_type}`);
            return false;
        }

        const emptySlotIndex = player.inventory.findIndex(item => item === null);
        if (emptySlotIndex === -1) {
            console.log(`Игроку с id ${player_id} невозможно выдать предмет, так как его инвентарь полон`);
            return false;
        }
        const itemId = this.nextItemId++;
        const newItem = createItemInstance({
            item_id: itemId,
            item_type: item_type,
            amount: amount
        })
        player.inventory[emptySlotIndex] = newItem;

        await this.storage.saveInventory(player_id, { // для асинхронности. после добавления любого предмета надо сохранить инфу об этом
        inventory: player.inventory,
        slot_weapon: player.slot_weapon,
        slot_armor: player.slot_armor
    });
        console.log(`Игроку с id ${player_id} успешно выдан предмет ${item_type} (id: ${itemId}, кол-во: ${amount})`);
        return true;
    }


    public async pickUpItem(player_id: number, ground_item_id: number): Promise<boolean> { // для того чтобы поднять предмет
        const player = this.getPlayer(player_id);
        if (!player) {
            console.log(`Игрока с id ${player_id} в системе не существует`);
            return false;
        }
        const ground_item = await this.storage.getGroundItem(ground_item_id)
        if (!ground_item){
            console.log(`Игрок с id ${player_id} не может поднять предмет c id ${ground_item_id}, так как такого предмета не существует на земле.`);
            return false;
        }
        const distance = Math.hypot(player.position.x - ground_item.position.x, player.position.y - ground_item.position.y)
        if (distance > this.config.pickupRadius){
            console.log(`Игрок с id ${player_id} не может поднять предмет c id ${ground_item_id}, так как он лежит слишком далеко`);
            return false;
        }
        const itemData = await this.storage.removeFromGround(ground_item_id);
        if (!itemData) {
            console.log(`Предмет ${ground_item_id} уже кто-то подобрал или он исчез.`);
            return false;
        }
        const itemInstance = createItemInstance(itemData);
        const pickupResult = player.tryAddItem(itemInstance);
    
        if (pickupResult.leftover) {
            const leftoverState = pickupResult.leftover.getState();
            leftoverState.item_id = this.nextItemId++; // у остатка новый id, тк исходный предмет уже удалён с земли

            const groundItemState: GroundItemState = {
            creation_tick: this.currentTick,
            duration_ticks: this.config.itemLifetimeTicks,
            position: { x: player.x, y: player.y }, 
            itemCommon: leftoverState
            };
            await this.storage.addToGround(groundItemState);
        }
        if (pickupResult.success) {
            await this.storage.saveInventory(player_id, {
            inventory: player.inventory,
            slot_weapon: player.slot_weapon,
            slot_armor: player.slot_armor
            });
        }
        return pickupResult.success;
    }

    public async dropItem(player_id: number, item_id: number): Promise<boolean>{ // ПОПРАВИТЬ с тиками!!!!
        const player = this.getPlayer(player_id);
        if (!player) {
            console.log(`Игрока с id ${player_id} в системе не существует`);
            return false;
        }
        const droppedItemState = player.dropItem(item_id);
        if (!droppedItemState) {
            return false; // инфа от игрока что нет предмета
        }
        const newGroundItemId = this.nextItemId++;
        droppedItemState.item_id = newGroundItemId;

        const groundItemData: GroundItemState = {
            creation_tick: this.currentTick,
            duration_ticks: this.config.itemLifetimeTicks,
            position: { x: player.x, y: player.y }, 
            itemCommon: droppedItemState
        };
        await this.storage.addToGround(groundItemData);

        await this.storage.saveInventory(player_id, {
        inventory: player.inventory,
        slot_weapon: player.slot_weapon,
        slot_armor: player.slot_armor
        });
        console.log(`Игрок с id ${player_id} выбросил предмет ${droppedItemState.item_type} (новый id на земле: ${newGroundItemId}, кол-во: ${droppedItemState.amount}) на координаты (${player.x}, ${player.y}).`);
        return true;
    }

    public useItem(playerId: number, itemId: number): boolean {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`Ошибка: Игрок с id ${playerId} не найден.`);
            return false;
        }

        const success = player.useItem(itemId);

        if (success) {
            console.log(`Игрок ${playerId} успешно активировал предмет ${itemId}.`);
        }
        return success;
    }
}


