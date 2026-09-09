export interface Position { // пусть пока что карта будет что по x что по y от 0 до 50
    x: number;
    y: number;
}

export interface PlayerState {
    readonly player_id: number
    health: number; // TODO: надо потом проверять 0..100
    armor: number; // аналогично 0..150

    slot_weapon: ItemState | null; // реализовать перекидывания оружия в этот слот и обратно в инвентарь
    slot_armor: ItemState | null; // надеть и снять

    // инвертарь на 8 слотов
    inventory: [
        ItemState | null,
        ItemState | null,
        ItemState | null,
        ItemState | null,
        ItemState | null,
        ItemState | null,
        ItemState | null,
        ItemState | null
    ]
    activeEffects: Record<string, { remaining_ticks: number }>; // имя и остсаток тиков
    // Constructs an object type whose property keys are Keys and whose property values are Type. 
    // This utility can be used to map the properties of a type to another type.
}

export interface ItemState {
    item_id: number;
    readonly item_type: string;
    amount: number;
    // current_ammo?: number; // для оружия
}
export interface GroundItemState {
    itemCommon: ItemState;
    position: Position;
    creation_tick: number;
    duration_ticks: number;
}
export interface GameConfig { // чтобы сделать все эти значения конфигурируемыми
    maxHealth: number;
    maxArmor: number;
    medkit_healing: number;
    bandage_healing: number;
    bandage_duration_ticks: number;
    mapBounds: { maxX: number; maxY: number };
    pickupRadius: number; 
    itemLifetimeTicks: number;
    
    validItemTypes: string[];
}
export interface StoredInventory {
    inventory: (ItemState | null)[];
    slot_weapon: ItemState | null;
    slot_armor: ItemState | null;
}
// контракт хранилища ядро зависит от него
export interface IInventoryStorage {
    saveInventory(player_id: number, dataPlayerInventory: StoredInventory): Promise<void>;
    getInventory(player_id: number): Promise<StoredInventory>;
    deleteDataPlayersItem(player_id: number): Promise<boolean>;
    addToGround(groundItemState: GroundItemState): Promise<void>;
    removeFromGround(item_id: number): Promise<ItemState | null>;
    getGroundItem(item_id: number): Promise<GroundItemState | null>;
    getAllGroundItems(): Promise<GroundItemState[]>;
}