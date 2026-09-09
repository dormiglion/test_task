import { GameWorld } from './core/GameWorld.js';
import { InventoryStorage } from './Storage/InventoryStorage.js';
import { defaultConfig } from './core/GameConfig.js';
import type { GameConfig } from './types/index.js';

// конфиг для тестов
const STORAGE_DELAY_MS = 100;
const demoConfig: GameConfig = {
    ...defaultConfig,
    itemLifetimeTicks: 3,
};

function header(title: string): void {
    console.log(`\n${'='.repeat(60)}\n  ${title}\n${'='.repeat(60)}`);
}
async function scenarioDropPickup(): Promise<void> {
    header('Сценарий 1: выбросить предмет и подобрать его другим игроком');
    const world = new GameWorld(new InventoryStorage(), demoConfig);

    await world.addPlayer(1, 0, 0);   // выбрасывает
    await world.addPlayer(2, 1, 0);   // рядом, внутри радиуса подбора
    await world.addPlayer(3, 20, 20); // далеко

    await world.giveItem(1, 'medkit', 2);
    const medkit = world.getInventory(1).find(i => i?.item_type === 'medkit');
    if (!medkit) {
        throw new Error('Аптечка не найдена в инвентаре игрока 1');
    }

    const groundId = await world.dropItem(1, medkit.item_id);

    console.log('>> Далёкий игрок 3 пытается подобрать:', await world.pickUpItem(3, groundId!));
    console.log('>> Ближний игрок 2 подбирает:', await world.pickUpItem(2, groundId!));
    console.log('>> Инвентарь игрока 2:', world.getInventory(2).filter(i => i !== null));
}
async function scenarioExpiry(): Promise<void> {
    header('Сценарий 2: предмет истекает на земле');
    const world = new GameWorld(new InventoryStorage(), demoConfig);
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    const gun = world.getInventory(1).find(i => i?.item_type === 'gun');
    if (!gun) {
        throw new Error('Оружие не найдено в инвентаре игрока 1');
    }

    const groundId = await world.dropItem(1, gun.item_id);
    console.log('>> На земле до тиков:', await world.storage.getAllGroundItems());
    
    for (let i = 0; i < demoConfig.itemLifetimeTicks; i++) {
        console.log(`>> Тик ${i + 1}`);
        await world.tick();
    }
    console.log('>> Проверка предметов на земле:', await world.storage.getAllGroundItems());
    console.log('>> Попытка подобрать истёкший предмет:', await world.pickUpItem(1, groundId!)); 
}
async function scenarioUseItem(): Promise<void> {
    header('Сценарий 3: использование предмета');
    const world = new GameWorld(new InventoryStorage(), demoConfig);
    const player = await world.addPlayer(1, 20, 25);
    if (!player) return;
    player.health = 60;
    await world.giveItem(1, 'medkit', 2);
    const medkit = world.getInventory(1).find(i => i?.item_type === 'medkit');
    if (!medkit) {
        throw new Error('Аптечка не найдена в инвентаре игрока 1');
    }
    console.log('>> Здоровье игрока до использования аптечки:', player.health);
    console.log('>> Игрок пробует использовать аптечку:', await world.useItem(1, medkit.item_id));
    console.log('>> Инвентарь игрока после 1 использования:', world.getInventory(1).filter(i => i !== null));
    console.log('>> Здоровье игрока после первого использования аптечки:', player.health);
    console.log('>> Игрок пробует использовать аптечку ещё раз:', await world.useItem(1, medkit.item_id));
    console.log('>> Инвентарь игрока после 2 использования:', world.getInventory(1).filter(i => i !== null));
    console.log('>> Здоровье игрока после второго использования аптечки:', player.health);
    console.log('>> Игрок пробует использовать аптечку ещё раз:', await world.useItem(1, medkit.item_id));
}

async function scenarioConcurrentPickup(): Promise<void> {
    header('Сценарий 4: два игрока одновременно пытаются подобрать один предмет');
    const world = new GameWorld(new InventoryStorage(), demoConfig);
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0);
    await world.addPlayer(3, 0, 1);
    await world.giveItem(1, 'armor', 1);
    const armor = world.getInventory(1).find(i => i?.item_type === 'armor');
    if (!armor) {
        throw new Error('Броня не найдена в инвентаре игрока 1');
    }
    const groundId = await world.dropItem(1, armor.item_id);
    if (!groundId) {
        throw new Error('Не удалось выбросить броню на землю');
    }
    const [r1, r2, r3] = await Promise.all([
        world.pickUpItem(1, groundId),
        world.pickUpItem(2, groundId),
        world.pickUpItem(3, groundId)
    ]);
    const successCount = [r1, r2, r3].filter(result => result === true).length;

    console.log('>> Игрок 1 подобрал:', r1);
    console.log('>> Игрок 2 подобрал:', r2);
    console.log('>> Игрок 3 подобрал:', r3);
    console.log('>> Успешных подборов:', successCount, '(ожидается ровно 1)');
}

async function scenarioBandage(): Promise<void> {
    header('Сценарий 5: бинт лечит понемногу несколько тиков подряд');
    const world = new GameWorld(new InventoryStorage(), demoConfig);
    const player = await world.addPlayer(1, 0, 0);
    if (!player) return;
    player.health = 75;

    await world.giveItem(1, 'bandage', 1);
    const bandage = world.getInventory(1).find(i => i?.item_type === 'bandage');
    if (!bandage) {
        throw new Error('Бинт не найден в инвентаре игрока 1');
    }

    console.log('>> Здоровье до бинта:', player.health);
    console.log('>> Игрок применяет бинт:', await world.useItem(1, bandage.item_id));
    console.log('>> Здоровье сразу после применения (лечения ещё не было):', player.health);

    for (let i = 0; i < demoConfig.bandage_duration_ticks + 1; i++) {
        await world.tick();
        console.log(`>> Здоровье после тика ${i + 1}:`, player.health, '| эффекты:', JSON.stringify(player.activeEffects));
    }
}

await scenarioDropPickup();
await scenarioExpiry();
await scenarioUseItem();
await scenarioConcurrentPickup();
await scenarioBandage();

console.log('\nВсе сценарии завершены.');