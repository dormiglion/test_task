import type { GameConfig } from "../types/index.js";
import { Player } from "../entities/Player.js";

const defaultConfig: GameConfig = { // концфиг - локальная константа
    maxHealth: 100,
    maxArmor: 150,
    medkit_healing: 25,
    bandage_healing: 10,
    mapBounds: { maxX: 50, maxY: 50 },
    pickupRadius: 2,
    itemLifetimeTicks: 1
}

export class GameWorld {
    
}