import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestWorld, silenceLogs, filledSlots, findInInventory } from './helpers.js';

silenceLogs();

// ─────────────────────────── giveItem: отказы ───────────────────────────

test('giveItem кладёт предмет в инвентарь', async () => {
    // ловит: выдача рапортует об успехе, но предмет в инвентаре не появляется
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    assert.equal(await world.giveItem(1, 'medkit', 1), true);
    const slots = filledSlots(world, 1);
    assert.equal(slots.length, 1);
    assert.equal(slots[0]?.item_type, 'medkit');
    assert.equal(slots[0]?.amount, 1);
});

test('giveItem отказывает на неизвестном типе предмета', async () => {
    // ловит: проверка типа разошлась с реестром фабрики — тогда выдача
    // проходит валидацию и падает уже внутри createItemInstance
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    assert.equal(await world.giveItem(1, 'flamethrower', 1), false);
    assert.equal(filledSlots(world, 1).length, 0, 'ничего не должно появиться');
});

test('giveItem отказывает на несуществующем игроке', async () => {
    // ловит: выдача несуществующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(await world.giveItem(42, 'medkit', 1), false);
});

test('giveItem отказывает на нулевом и отрицательном количестве', async () => {
    // ловит: в инвентарь попадает предмет с amount <= 0 — «пустой» стак,
    // который занимает слот и не может быть использован
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    assert.equal(await world.giveItem(1, 'medkit', 0), false);
    assert.equal(await world.giveItem(1, 'medkit', -3), false);
    assert.equal(filledSlots(world, 1).length, 0);
});

test('giveItem отказывает на дробном количестве', async () => {
    // ловит: дробное количество расходуется по единице и никогда не доходит
    // до нуля, поэтому слот не освобождается
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    assert.equal(await world.giveItem(1, 'medkit', 2.5), false);
    assert.equal(filledSlots(world, 1).length, 0);
});

// ─────────────────────────── giveItem: стаки ───────────────────────────

test('giveItem режет выдачу на стаки по max_stack', async () => {
    // ловит: в один слот кладётся стак больше допустимого — правило max_stack
    // при выдаче игнорируется, хотя при подборе с земли соблюдается
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    await world.giveItem(1, 'medkit', 10); // max_stack у аптечки = 5
    const slots = filledSlots(world, 1);
    assert.equal(slots.length, 2, 'десять аптечек должны занять два слота');
    assert.deepEqual(slots.map(slot => slot.amount), [5, 5]);
});

test('giveItem досыпает в уже начатый стак, а не занимает новый слот', async () => {
    // ловит: каждая выдача создаёт новый слот, и инвентарь забивается
    // недозаполненными стаками одного и того же предмета
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    await world.giveItem(1, 'medkit', 2);
    await world.giveItem(1, 'medkit', 2);
    const slots = filledSlots(world, 1);
    assert.equal(slots.length, 1, 'обе выдачи должны лечь в один стак');
    assert.equal(slots[0]?.amount, 4);
});

test('giveItem заполняет начатый стак и переносит остаток в следующий слот', async () => {
    // ловит: остаток сверх max_stack теряется или, наоборот,
    // переполняет уже существующий стак
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    await world.giveItem(1, 'medkit', 4);
    await world.giveItem(1, 'medkit', 4); // 1 добьёт первый стак, 3 уйдут во второй
    const amounts = filledSlots(world, 1).map(slot => slot.amount).sort();
    assert.deepEqual(amounts, [3, 5]);
});

test('нестакающиеся предметы занимают отдельные слоты', async () => {
    // ловит: предметы с max_stack = 1 схлопываются в один слот,
    // и уникальные экземпляры со своими характеристиками теряются
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    await world.giveItem(1, 'gun', 1);
    await world.giveItem(1, 'gun', 1);
    assert.equal(filledSlots(world, 1).length, 2);
});

test('giveItem отказывает, когда инвентарь полностью занят', async () => {
    // ловит: выдача в полный инвентарь молча теряет предмет,
    // отрапортовав об успехе
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    for (let i = 0; i < 8; i++) {
        await world.giveItem(1, 'gun', 1);
    }

    assert.equal(await world.giveItem(1, 'armor', 1), false);
    assert.equal(filledSlots(world, 1).length, 8);
});

test('giveItem выдаёт столько, сколько влезло, если места не хватило на всё', async () => {
    // ловит: при нехватке места выдача либо отменяется целиком,
    // либо, наоборот, кладёт больше, чем помещается
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    // 8 слотов по 5 аптечек = 40 максимум
    assert.equal(await world.giveItem(1, 'medkit', 45), true, 'частичная выдача — всё же успех');
    const total = filledSlots(world, 1).reduce((sum, slot) => sum + slot.amount, 0);
    assert.equal(total, 40, 'должно лечь ровно столько, сколько помещается');
});

// ─────────────────────────── dropItem ───────────────────────────

test('dropItem из стака роняет одну штуку, остальное остаётся', async () => {
    // ловит: выбрасывается весь стак целиком, хотя игрок просил один предмет
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 3);

    const medkit = findInInventory(world, 1, 'medkit');
    assert.ok(await world.dropItem(1, medkit.item_id));
    assert.equal(findInInventory(world, 1, 'medkit').amount, 2, 'в инвентаре должно остаться два');
});

test('dropItem последнего предмета освобождает слот', async () => {
    // ловит: слот остаётся занятым пустым стаком после выброса
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 1);

    const medkit = findInInventory(world, 1, 'medkit');
    assert.ok(await world.dropItem(1, medkit.item_id));
    assert.equal(filledSlots(world, 1).length, 0);
});

test('dropItem несуществующего предмета возвращает null', async () => {
    // ловит: на земле появляется предмет, которого у игрока не было —
    // дублирование вещей из воздуха
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    assert.equal(await world.dropItem(1, 999), null);
});

test('dropItem на несуществующем игроке возвращает null', async () => {
    // ловит: обращение к отсутствующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(await world.dropItem(42, 1), null);
});
