import { GameWorld } from '../core/GameWorld.js';
import { InventoryStorage } from '../Storage/InventoryStorage.js';
import { defaultConfig } from '../core/GameConfig.js';
import type { GameConfig } from '../types/index.js';

// мир для тестов: хранилище без задержки, иначе каждый вызов стоил бы 100 мс
// нужные параметры конфига переопределяются точечно
export function createTestWorld(overrides: Partial<GameConfig> = {}): GameWorld {
    return new GameWorld(new InventoryStorage(0), { ...defaultConfig, ...overrides });
}

// игровой код много пишет в консоль, в тестах это мешает читать результат
export function silenceLogs(): void {
    console.log = () => {};
}
