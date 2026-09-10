import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestWorld, silenceLogs, filledSlots, findInInventory } from './helpers.js';

silenceLogs();

// ─────────────────────────── расстояние и позиция ───────────────────────────

test('предмет, лежащий далеко, подобрать нельзя', async () => {
    // ловит: радиус подбора не проверяется, и предметы можно собирать через всю карту
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 20, 20); // заведомо дальше pickupRadius
    await world.giveItem(1, 'medkit', 1);

    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);

    assert.equal(await world.pickUpItem(2, groundId), false, 'дальний игрок не должен подобрать');
    assert.equal(await world.pickUpItem(1, groundId), true, 'а стоящий рядом — должен');
});

test('выброшенный предмет ложится на позицию выбросившего', async () => {
    // ловит: предмет появляется не там, где стоял игрок (например, в начале координат),
    // и оказывается недосягаем для тех, кто рядом
    const world = createTestWorld();
    await world.addPlayer(1, 10, 10);
    await world.addPlayer(2, 10, 11); // рядом с выбросившим
    await world.addPlayer(3, 0, 0);   // там, где предмета быть не должно
    await world.giveItem(1, 'medkit', 1);

    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);

    assert.equal(await world.pickUpItem(3, groundId), false, 'у начала координат предмета нет');
    assert.equal(await world.pickUpItem(2, groundId), true, 'а рядом с выбросившим — есть');
});

// ─────────────────────────── подбор в полный инвентарь ───────────────────────────

test('после неудачного подбора предмет остаётся на земле под тем же id', async () => {
    // ловит: остаток возвращается на землю как новый предмет со свежим id,
    // и прежний id перестаёт работать — для всех остальных предмет «исчез»
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0);
    await world.giveItem(1, 'medkit', 1);
    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);

    for (let i = 0; i < 8; i++) {
        await world.giveItem(2, 'gun', 1); // забиваем инвентарь второго игрока целиком
    }
    assert.equal(await world.pickUpItem(2, groundId), false, 'в полный инвентарь не влезет');

    assert.equal(await world.pickUpItem(1, groundId), true,
        'тот же самый id должен по-прежнему работать');
});

test('неудачный подбор не продлевает предмету время жизни', async () => {
    // ловит: при возврате на землю обнуляется creation_tick — игрок с полным
    // инвентарём может бесконечно спамить подбор и держать чужой предмет вечно
    const lifetime = 3;
    const world = createTestWorld({ itemLifetimeTicks: lifetime });
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0);
    await world.giveItem(1, 'medkit', 1);
    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);

    for (let i = 0; i < 8; i++) {
        await world.giveItem(2, 'gun', 1);
    }

    await world.tick();
    await world.tick();
    assert.equal(await world.pickUpItem(2, groundId), false, 'предусловие: подбор сорвался');

    await world.tick(); // третий тик — предмет обязан истечь по исходному таймеру
    assert.equal(await world.pickUpItem(1, groundId), false,
        'таймер должен считаться от исходного выброса, а не от неудачной попытки');
});

test('неудачный подбор не перетаскивает предмет к тому, кто его не поднял', async () => {
    // ловит: остаток кладётся на землю по координатам подбиравшего —
    // предмет телепортируется к игроку, который его даже не взял
    const world = createTestWorld({ pickupRadius: 1 });
    await world.addPlayer(1, 0, 0); // выбрасывает здесь
    await world.addPlayer(2, 1, 0); // пытается поднять, инвентарь полон
    await world.addPlayer(3, 2, 0); // до (0,0) не дотягивается, до (1,0) — дотянулся бы
    await world.giveItem(1, 'medkit', 1);
    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);

    for (let i = 0; i < 8; i++) {
        await world.giveItem(2, 'gun', 1);
    }
    assert.equal(await world.pickUpItem(2, groundId), false, 'предусловие: подбор сорвался');

    assert.equal(await world.pickUpItem(3, groundId), false,
        'предмет должен остаться на (0,0), а не переехать к игроку 2');
});

// ─────────────────────────── подбор в стак ───────────────────────────

test('подобранный предмет докладывается в уже начатый стак', async () => {
    // ловит: подбор всегда занимает новый слот, и инвентарь забивается
    // недозаполненными стаками одного и того же предмета
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.addPlayer(2, 1, 0);
    await world.giveItem(1, 'medkit', 1);
    await world.giveItem(2, 'medkit', 2);

    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);
    assert.equal(await world.pickUpItem(2, groundId), true);

    const slots = filledSlots(world, 2);
    assert.equal(slots.length, 1, 'предмет должен лечь в уже занятый слот');
    assert.equal(slots[0]?.amount, 3);
});

// ─────────────────────────── границы времени жизни ───────────────────────────

test('за тик до истечения предмет ещё лежит на земле', async () => {
    // ловит: ошибку на единицу в условии истечения — предмет пропадает
    // на тик раньше, чем должен по настройке itemLifetimeTicks
    const lifetime = 3;
    const world = createTestWorld({ itemLifetimeTicks: lifetime });
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 1);
    const groundId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(groundId);

    for (let i = 0; i < lifetime - 1; i++) {
        await world.tick();
    }

    assert.equal(await world.pickUpItem(1, groundId), true, 'предмет должен быть ещё жив');
});

test('на тике исчезает только просроченный предмет, свежий остаётся', async () => {
    // ловит: уборка сносит с земли всё подряд, не глядя на время выброса
    const lifetime = 3;
    const world = createTestWorld({ itemLifetimeTicks: lifetime });
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 2);

    const oldId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(oldId);

    await world.tick();
    await world.tick();

    const freshId = await world.dropItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.ok(freshId);

    await world.tick(); // старому предмету пришло время, свежему — нет

    assert.equal(await world.pickUpItem(1, oldId), false, 'старый предмет должен исчезнуть');
    assert.equal(await world.pickUpItem(1, freshId), true, 'свежий должен остаться');
});
