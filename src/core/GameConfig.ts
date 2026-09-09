import type { GameConfig } from "../types/index.js";

export const defaultConfig: GameConfig = {
    maxHealth: 100,
    maxArmor: 150,
    medkit_healing: 25,
    bandage_healing: 10,
    bandage_duration_ticks: 3,
    mapBounds: { maxX: 50, maxY: 50 },
    pickupRadius: 2,
    itemLifetimeTicks: 10,
    validItemTypes: [
        'ammo', 
        'armor',
        'gun',
        'medkit',
        'bandage',
        // 'new'
    ]
};

// единая проверка координат
export function isPositionValid(
    x: number, 
    y: number, 
    config: GameConfig
): boolean {
    return Number.isInteger(x) && Number.isInteger(y)
        && x >= 0 && y >= 0
        && x <= config.mapBounds.maxX && y <= config.mapBounds.maxY;
}