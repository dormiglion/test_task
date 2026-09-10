import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestWorld, silenceLogs } from './helpers.js';

silenceLogs();

test('выброшенный предмет попадает на землю, а игрок рядом его подбирает', async () => {
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0); // внутри радиуса подбора
    await world.giveItem(1, 'medkit', 1);

    const medkit = world.getInventory(1).find(item => item?.item_type === 'medkit');
    assert.ok(medkit, 'после выдачи аптечка должна лежать в инвентаре');

    const groundId = await world.dropItem(1, medkit.item_id);
    assert.ok(groundId, 'dropItem должен вернуть id предмета на земле');
    assert.equal(world.getInventory(1).filter(item => item !== null).length, 0,
        'у выбросившего инвентарь должен опустеть');

    assert.equal(await world.pickUpItem(2, groundId), true, 'игрок рядом должен суметь подобрать');
    assert.equal(world.getInventory(2).filter(item => item !== null).length, 1,
        'предмет должен оказаться у подобравшего');
});

test('предмет, лежащий далеко, подобрать нельзя', async () => {
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 20, 20); // заведомо дальше pickupRadius
    await world.giveItem(1, 'medkit', 1);

    const medkit = world.getInventory(1).find(item => item?.item_type === 'medkit');
    assert.ok(medkit);
    const groundId = await world.dropItem(1, medkit.item_id);
    assert.ok(groundId);

    assert.equal(await world.pickUpItem(2, groundId), false, 'дальний игрок не должен подобрать');
    assert.equal(await world.pickUpItem(1, groundId), true, 'а стоящий рядом — должен');
});

test('предмет исчезает с земли по истечении времени жизни', async () => {
    const lifetime = 3;
    const world = createTestWorld({ itemLifetimeTicks: lifetime });
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 1);

    const medkit = world.getInventory(1).find(item => item?.item_type === 'medkit');
    assert.ok(medkit);
    const groundId = await world.dropItem(1, medkit.item_id);
    assert.ok(groundId);

    for (let i = 0; i < lifetime; i++) {
        await world.tick();
    }

    assert.equal(await world.pickUpItem(1, groundId), false,
        'после истечения времени жизни предмет подобрать нельзя');
});

test('один предмет достаётся ровно одному из нескольких игроков', async () => {
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0);
    await world.addPlayer(3, 0, 1);
    await world.giveItem(1, 'armor', 1);

    const armor = world.getInventory(1).find(item => item?.item_type === 'armor');
    assert.ok(armor);
    const groundId = await world.dropItem(1, armor.item_id);
    assert.ok(groundId);

    const results = await Promise.all([
        world.pickUpItem(1, groundId),
        world.pickUpItem(2, groundId),
        world.pickUpItem(3, groundId)
    ]);

    assert.equal(results.filter(result => result === true).length, 1,
        'подобрать должен ровно один игрок');
});
