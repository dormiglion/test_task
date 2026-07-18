export interface Position { // пусть пока что карта будет что по x что по y от 0 до 50
    x: number;
    y: number;
}

export interface PlayerState {
    readonly player_id: number
    health: number; // надо потом проверять 0..100
    armor: number; // аналогично 0..150

    slot_weapon: ItemState | null; // реализовать перекидывания оружия в этот слот и обратно в инвентарь
    slot_head: ItemState | null; // надеть и снять
    slot_body: ItemState | null; // надеть и снять
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
    activeEffects: Record<string, { duration: number ; creattion_tick: number }>; // для лечения и ещё если придумаю
    // Constructs an object type whose property keys are Keys and whose property values are Type. 
    // This utility can be used to map the properties of a type to another type.
}

export interface ItemState {
    readonly item_id: number;
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
