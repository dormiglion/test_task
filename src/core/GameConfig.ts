import type { GameConfig } from "../types/index.js";

export const defaultConfig: GameConfig = {
    maxHealth: 100,
    maxArmor: 150,
    medkit_healing: 25,
    bandage_healing: 10,
    mapBounds: { maxX: 50, maxY: 50 },
    pickupRadius: 2,
    itemLifetimeTicks: 10,
    validItemTypes: [
        'ammo', 
        'armor',
        'gun',
        'medkit',
        // 'new_super_item' <- добавляем просто строчку сюда!
    ]
};