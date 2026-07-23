import type { GameConfig, ItemState } from "../types/index.js";
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
    public addPlayer(player_id: number, start_x: number, start_y: number): Player | false {
        if (this.players.has(player_id)) { // проверка если такой id занят
            console.log(`Игрок с id ${player_id} уже существует. Сейчас будет выведен список всех занятых id. После этого повторите операцию`);
            const all_ids = Array.from(this.players.keys());
            console.log(`${all_ids}`)
            return false;
        } else {
            const player = new Player(player_id, start_x, start_y, this.config);
            this.players.set(player_id, player);
            return player;
        }
    }

    public async giveItem(player_id: number, item_type: string, amount: number = 1): Promise<boolean> {
        const player = this.getPlayer(player_id);
        if (!player) {
            console.log(`Игрока с таким id в системе не существует`);
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
}
