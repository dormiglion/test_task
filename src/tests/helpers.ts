import { GameWorld } from '../core/GameWorld.js';
import { InventoryStorage } from '../Storage/InventoryStorage.js';
import { defaultConfig } from '../core/GameConfig.js';
import { Gun } from '../items/Gun.js';
import { Ammo } from '../items/Ammo.js';
import type { GameConfig, IInventoryStorage, ItemState } from '../types/index.js';

// мир для тестов: хранилище без задержки, иначе каждый вызов стоил бы 100 мс
// нужные параметры конфига переопределяются точечно
// storage передаётся отдельно, когда тесту нужно переподключение: два мира на одной «БД»
export function createTestWorld(
    overrides: Partial<GameConfig> = {},
    storage: IInventoryStorage = new InventoryStorage(0)
): GameWorld {
    return new GameWorld(storage, { ...defaultConfig, ...overrides });
}

// «БД», которую можно передать в несколько миров подряд
export function createTestStorage(): IInventoryStorage {
    return new InventoryStorage(0);
}

// игровой код много пишет в консоль, в тестах это мешает читать результат
export function silenceLogs(): void {
    console.log = () => {};
}

// логи игры видны, но уходят в stderr.
// stdout у тест-раннера занят служебным каналом: он передаёт по нему результаты
// от дочернего процесса, и смешанный вывод ломает их разбор
export function routeLogsToStderr(): void {
    console.log = (...args: unknown[]) => {
        console.error(...args);
    };
}

// только занятые слоты инвентаря, без null
export function filledSlots(world: GameWorld, playerId: number): ItemState[] {
    return world.getInventory(playerId).filter((item): item is ItemState => item !== null);
}

// найти в инвентаре первый предмет нужного типа
export function findInInventory(world: GameWorld, playerId: number, itemType: string): ItemState {
    const item = filledSlots(world, playerId).find(slot => slot.item_type === itemType);
    if (!item) {
        throw new Error(`у игрока ${playerId} нет предмета типа "${itemType}"`);
    }
    return item;
}

// экипированное оружие с доступом к патронам; бросает, если в слоте не Gun
export function equippedGun(world: GameWorld, playerId: number): Gun {
    const slot = world.getPlayer(playerId)?.slot_weapon;
    if (!(slot instanceof Gun)) {
        throw new Error(`у игрока ${playerId} в слоте оружия не Gun`);
    }
    return slot;
}

// коробки с патронами из инвентаря — как экземпляры, чтобы видеть ammo_cnt
export function ammoBoxes(world: GameWorld, playerId: number): Ammo[] {
    const player = world.getPlayer(playerId);
    if (!player) {
        return [];
    }
    return player.inventory.filter((slot): slot is Ammo => slot instanceof Ammo);
}
