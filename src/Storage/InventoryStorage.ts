import type { ItemState, GroundItemState } from '../types/index.js';

export class InventoryStorage {
    // map, где id игрока ключ, а значение это данные про его вещиэ. private чтобы не менять из вне
    private playerItemsMap = new Map<number, {
        inventory: (ItemState | null)[];
        slot_weapon: (ItemState | null);
        slot_armor: (ItemState | null);
    }>();

    public async saveInventory(player_id: number, dataPlayerInventory: 
        {inventory: (ItemState | null)[]; slot_weapon: (ItemState | null); slot_armor: (ItemState | null);}): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 100)); // имитация задержки БД
        this.playerItemsMap.set(player_id, dataPlayerInventory);
        console.log(`Инвентарь игрока с id ${player_id} успешно сохранён в БД`);

    }

    public async getInventory(player_id: number): Promise<{
        inventory: (ItemState | null)[]; 
        slot_weapon: (ItemState | null); 
        slot_armor: (ItemState | null)
    }> {
        await new Promise(resolve => setTimeout(resolve, 100)); // имитация задержки БД
        const dataPlayerInventory = this.playerItemsMap.get(player_id);
        
        if (!dataPlayerInventory) {
            return {
                inventory: [null, null, null, null, null, null, null, null],
                slot_weapon: null,
                slot_armor: null
            };
        }
        console.log(`Инвентарь игрока с id ${player_id} успешно взят из БД`);

        return dataPlayerInventory
    }

    // для объектов на земле
    private groundItemsMap = new Map<number, GroundItemState>();

    public async addToGround(groundItemState: GroundItemState): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 100)); // имитация задержки БД
        const item_id = groundItemState.itemCommon.item_id;
        this.groundItemsMap.set(item_id, groundItemState);
        console.log(`Предмет с id ${item_id} успешно добавлен в предметы, лежащие на земле`);
    }
    public async removeFromGround(item_id: number): Promise<ItemState | null> {
        await new Promise(resolve => setTimeout(resolve, 100)); // имитация задержки БД
        const groundItemState = this.groundItemsMap.get(item_id);

        if (!groundItemState) {
            console.log(`Предмет с id ${item_id} не может быть поднят и удален c земли, т.к, не лежит на земле`);
            return null;
        }
        this.groundItemsMap.delete(item_id);
        console.log(`Предмет с id ${item_id} удален с земли`);
        return groundItemState.itemCommon;

    }
    public async getAllGroundItems(): Promise<GroundItemState[]> {
        await new Promise(resolve => setTimeout(resolve, 100)); // имитация задержки БД
        return Array.from(this.groundItemsMap.values())
    }


}