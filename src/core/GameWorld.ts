import type { GameConfig, ItemState, GroundItemState, IInventoryStorage } from "../types/index.js";
import { Player } from "../entities/Player.js";
import { BaseItem } from "../items/BaseItem.js";
import { createItemInstance, isKnownItemType, getKnownItemTypes } from '../ItemFactory.js';
import { getEffectHandler } from '../EffectRegistry.js';
import { isPositionValid } from './GameConfig.js';
import '../items/index.js';



export class GameWorld {
    private readonly players: Map<number, Player>;
    private readonly storage: IInventoryStorage;
    private readonly config: GameConfig;
    private nextItemId: number = 1; // для выдачи предметам ID
    private generateItemId(): number {
        return this.nextItemId++;
    }
    private currentTick = 0; //тики

    constructor(storage: IInventoryStorage, config: GameConfig) {
        this.storage = storage;
        this.config = config;
        this.players = new Map<number, Player>(); //передаетсмя не через конструктор
    }
    //геттер
    public getPlayer(player_id: number): Player | null {
        const player = this.players.get(player_id);
        if (!player) {
            console.log(`Игрока с id ${player_id} в системе не существует`);
            return null;
        }
        return player;
    }
    public getInventory(playerId: number): (ItemState | null)[] {
        const player = this.getPlayer(playerId);

        if (!player) {
            return [];
        }
        return player.inventory.map(item => item instanceof BaseItem ? item.getState() : null); // true false
    }

    // наружу уходят копии, чтобы не менять по ссылкам обхъекты в хранилище
    public async getGroundItems(): Promise<GroundItemState[]> {
        const groundItems = await this.storage.getAllGroundItems();
        return groundItems.map(item => ({
            itemCommon: { ...item.itemCommon },
            creation_tick: item.creation_tick,
            duration_ticks: item.duration_ticks,
            position: { ...item.position }
        }));
    }

    private async savePlayerInventory(player: Player): Promise<void> { // метод для сохранения в инвентарь
        await this.storage.saveInventory(player.player_id, {
            inventory: player.inventory.map(item => item instanceof BaseItem ? item.getState() : null),
            slot_weapon: player.slot_weapon instanceof BaseItem ? player.slot_weapon.getState() : null,
            slot_armor: player.slot_armor instanceof BaseItem ? player.slot_armor.getState() : null
        });
    }

    public async tick(): Promise<void> {
        this.currentTick++;
        console.log(`--- Тик ${this.currentTick} ---`);
        console.log(`Будут удалены предметы на замле с закончившимся временем жизни`)
        await this.removeExpiredGroundItems();
        this.applyActiveEffects();
    }

    // для удаления по тику
    private async removeExpiredGroundItems(): Promise<void> {
        const allGroundItems = await this.storage.getAllGroundItems();
        for (const item of allGroundItems){
            if (this.currentTick >= item.creation_tick + item.duration_ticks){
                await this.storage.removeFromGround(item.itemCommon.item_id);
                console.log(`Предмет ${item.itemCommon.item_id} исчез с земли (истекло время жизни).`);
            }
        }
    }
    // эффект по времени
    private applyActiveEffects(): void {
        for (const player of this.players.values()) {
            for (const [effectName, effect] of Object.entries(player.activeEffects)) { //метод возвращает массив собственных перечисляемых свойств
                const handler = getEffectHandler(effectName);
                if (handler) {
                    handler(player, this.config);
                }   
                effect.remaining_ticks--;
                if (effect.remaining_ticks <= 0) {
                    delete player.activeEffects[effectName];
                    console.log(`Эффект ${effectName} на игроке ${player.player_id} закончился.`);
                }
            }
        }
    }

    // МЕТОДЫ
    private restoreItem(itemData: ItemState | null | undefined): BaseItem | null {
        if (!itemData) {
            return null;
        }
        if (!isKnownItemType(itemData.item_type)) {
            console.log(`Предмет с id ${itemData.item_id} пропущен при восстановлении: 
                неизвестный тип "${itemData.item_type}".`);
            return null;
        }
        return createItemInstance(itemData);
    }


    public async addPlayer(player_id: number, start_x: number, start_y: number): Promise<Player | null> { // добавление игрока в активную игру
        if (!isPositionValid(start_x, start_y, this.config)) {
            console.log(`Игрока с id ${player_id} нельзя создать на координатах (${start_x}, ${start_y}):
                это вне карты или значения не целые.`);
            return null;
        }

        if (this.players.has(player_id)) { // проверка если такой id занят
            console.log(`Игрок с id ${player_id} уже существует. Сейчас будет выведен список всех занятых id. После этого повторите операцию`);
            const all_ids = Array.from(this.players.keys());
            console.log(`Занятые id: ${all_ids}`)
            return null;
        } else {
            const player = new Player(player_id, start_x, start_y, this.config);
            const savedData = await this.storage.getInventory(player_id);
            // восстановить инвентарь и вещи если вдруг у нас игрок выходил из активной игры
            for (let i = 0; i < player.inventory.length; i++) {
                player.inventory[i] = this.restoreItem(savedData.inventory[i]); 
            }
            player.slot_weapon = this.restoreItem(savedData.slot_weapon);
            player.slot_armor = this.restoreItem(savedData.slot_armor);

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
    // передвижение по карте
    public movePlayerTo(playerId: number, new_x: number, new_y: number,): boolean {
        const player = this.getPlayer(playerId);
        if (!player) {
            console.log(`Игрока с id ${playerId} в системе не существует`);
            return false;
        }
        const success = player.moveTo(new_x, new_y);
        return success;
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

        if (!isKnownItemType(item_type)) {
            console.log(`Неизвестный тип предмета: ${item_type}. Доступные типы: ${getKnownItemTypes().join(', ')}`);
            return false;
        }

        const newItem = createItemInstance({
            item_id: this.generateItemId(),
            item_type: item_type,
            amount: amount
        })
        const result = player.tryAddItem(newItem, () => this.generateItemId());

        if (!result.success) {
            console.log(`Игроку с id ${player_id} невозможно выдать предмет ${item_type}, так как его инвентарь полон`);
            return false;
        }

        await this.savePlayerInventory(player); // после добавления любого предмета надо сохранить инфу об этом
        if (result.leftover) {
            console.log(`Игроку с id ${player_id} выдано ${amount - result.leftover.amount} из ${amount} ${item_type}: инвентарь заполнился`);
        } else {
            console.log(`Игроку с id ${player_id} успешно выдан предмет ${item_type} (кол-во: ${amount})`);
        }
        return true;
    }


    public async pickUpItem(player_id: number, ground_item_id: number): Promise<boolean> { // для того чтобы поднять предмет
        const player = this.getPlayer(player_id);
        if (!player) {
            console.log(`Игрока с id ${player_id} в системе не существует`);
            return false;
        }
        console.log(`Игрок с id ${player_id} пытается подобрать предмет с id ${ground_item_id}.`);
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
            console.log(`Игрок с id ${player_id} не смог подобрать предмет с id ${ground_item_id}, так как он уже кто-то подобрал или исчез.`);
            return false;
        }
        const itemInstance = createItemInstance(itemData);
        const pickupResult = player.tryAddItem(itemInstance, () => this.generateItemId());
    
        if (pickupResult.leftover) { 
            const leftoverState = pickupResult.leftover.getState();
            leftoverState.item_id = ground_item.itemCommon.item_id;; // у остатка старый id 

            const groundItemState: GroundItemState = {
                creation_tick: ground_item.creation_tick,
                duration_ticks: ground_item.duration_ticks, //чтобы не юзать бесконечный подбор
                position: ground_item.position, 
                itemCommon: leftoverState
            };
            await this.storage.addToGround(groundItemState);
        }
        if (pickupResult.success) {
            await this.savePlayerInventory(player);;
        }
        return pickupResult.success;
    }

    public async dropItem(player_id: number, item_id: number): Promise<number | null>{ 
        const player = this.getPlayer(player_id);
        if (!player) {
            console.log(`Игрока с id ${player_id} в системе не существует`);
            return null;
        }
        const droppedItemState = player.dropItem(item_id);
        if (!droppedItemState) {
            return null; // инфа от игрока что нет предмета
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

        await this.savePlayerInventory(player);
        console.log(`Игрок с id ${player_id} выбросил предмет ${droppedItemState.item_type} (новый id на земле: ${newGroundItemId}, кол-во: ${droppedItemState.amount}) на координаты (${player.x}, ${player.y}).`);
        return newGroundItemId;
    }

    public async useItem(playerId: number, itemId: number): Promise<boolean> {
        const player = this.players.get(playerId);
        if (!player) {
            console.log(`Игрока с id ${playerId} в системе не существует`);
            return false;
        }

        const success = player.useItem(itemId);

        if (success) {
            await this.savePlayerInventory(player);
            console.log(`Игрок ${playerId} успешно активировал предмет ${itemId}.`);
        }
        return success;
    }

    public async useWeapon(playerId: number): Promise<boolean> { //использовать оружие в активном слоте
        const player = this.getPlayer(playerId);
        if (!player) {
            console.log(`Игрока с id ${playerId} в системе не существует`);
            return false;
        }
        const success = player.useWeapon();

        if (success) {
            await this.savePlayerInventory(player);
        }
        return success;
    }

    public async reloadWeapon(playerId: number): Promise<boolean> { // чтобы перезарядить оружие в активном слоте
        const player = this.getPlayer(playerId);
        if (!player) {
            console.log(`Игрока с id ${playerId} в системе не существует`);
            return false;
        }
        const success = player.reloadWeapon();
        if (success) {
            await this.savePlayerInventory(player);
        }
        return success;
    }

    public async equipWeapon(playerId: number, ItemId: number): Promise<boolean> { // переложить оружие в активный слот
        const player = this.getPlayer(playerId);
        if (!player) {
            console.log(`Игрока с id ${playerId} в системе не существует`);
            return false;
        }
        const success = player.equipWeapon(ItemId);

        if (success) {
            await this.savePlayerInventory(player);
        }
        return success;
    }
    
    public async unequipWeapon(playerId: number): Promise<boolean> { // переложить оружие из активного слота обратно
        const player = this.getPlayer(playerId);
        if (!player) {
            console.log(`Игрока с id ${playerId} в системе не существует`);
            return false;
        }

        const success = player.unequipWeapon();

        if (success) {
            await this.savePlayerInventory(player);
        }

        return success;
    }

    public async unequipArmor(playerId: number): Promise<boolean> { // снять броню и убрать в инвентарь
        const player = this.getPlayer(playerId);
        if (!player) {
            console.log(`Игрока с id ${playerId} в системе не существует`);
            return false;
        }

        const success = player.unequipArmor();

        if (success) {
            await this.savePlayerInventory(player);
        }

        return success;
    }




}


