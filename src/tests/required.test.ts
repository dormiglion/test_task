// Сценарии, которые тестовое задание требует показать обязательно:
//   drop → pickup, исчезновение предмета по таймауту,
//   эффект use, конкурентный подбор одного предмета несколькими игроками.
//
// Логи игры здесь намеренно НЕ глушатся: этот файл показывает работу системы,
// и по выводу видно, что именно происходит на каждом шаге.
// Подробные проверки границ и отказов — в остальных файлах.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestWorld, routeLogsToStderr, filledSlots, findInInventory } from './helpers.js';

routeLogsToStderr();

test('ТЗ: игрок выбрасывает предмет, а другой игрок рядом его подбирает', async () => {
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0); // внутри радиуса подбора
    await world.giveItem(1, 'medkit', 1);

    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId, 'предмет должен оказаться на земле');
    assert.equal(filledSlots(world, 1).length, 0, 'у выбросившего инвентарь опустел');

    assert.equal(await world.pickUpItem(2, groundId), true, 'сосед подбирает предмет');
    assert.equal(filledSlots(world, 2).length, 1, 'предмет у подобравшего');
});

test('ТЗ: предмет исчезает с земли по истечении времени жизни', async () => {
    const lifetime = 3;
    const world = createTestWorld({ itemLifetimeTicks: lifetime });
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 1);

    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);

    for (let i = 0; i < lifetime; i++) {
        await world.tick();
    }

    assert.equal(await world.pickUpItem(1, groundId), false, 'истёкший предмет подобрать нельзя');
});

test('ТЗ: использование предмета меняет состояние игрока', async () => {
    const world = createTestWorld({ medkit_healing: 25 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 50;
    await world.giveItem(1, 'medkit', 1);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'medkit').item_id), true);
    assert.equal(player.health, 75, 'здоровье выросло на величину из конфига');
    assert.equal(filledSlots(world, 1).length, 0, 'аптечка израсходована');
});

test('ТЗ: один предмет при одновременном подборе достаётся ровно одному игроку', async () => {
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0);
    await world.addPlayer(3, 0, 1);
    await world.giveItem(1, 'armor', 1);

    const groundId = await world.dropItem(1, findInInventory(world, 1, 'armor').item_id);
    assert.ok(groundId);

    const results = await Promise.all([
        world.pickUpItem(1, groundId),
        world.pickUpItem(2, groundId),
        world.pickUpItem(3, groundId)
    ]);

    assert.equal(results.filter(result => result === true).length, 1,
        'успешным должен быть ровно один подбор');
});
