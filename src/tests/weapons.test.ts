import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createTestWorld, silenceLogs,
    filledSlots, findInInventory, equippedGun, ammoBoxes
} from './helpers.js';

silenceLogs();

// ─────────────────────────── equipWeapon ───────────────────────────

test('equipWeapon по id перекладывает оружие из инвентаря в слот', async () => {
    // ловит: оружие «экипировано», но осталось лежать в инвентаре —
    // тогда один ствол существует в двух местах одновременно
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    const gunId = findInInventory(world, 1, 'gun').item_id;

    assert.equal(await world.equipWeapon(1, gunId), true);
    assert.equal(equippedGun(world, 1).item_id, gunId, 'в слоте должно быть именно это оружие');
    assert.equal(filledSlots(world, 1).length, 0, 'из инвентаря оно должно уйти');
});

test('equipWeapon с занятым слотом меняет оружие местами', async () => {
    // ловит: прежнее оружие пропадает при замене вместо того,
    // чтобы вернуться в освободившийся слот инвентаря
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.giveItem(1, 'gun', 1);
    const [first, second] = filledSlots(world, 1);
    assert.ok(first && second);

    await world.equipWeapon(1, first.item_id);
    assert.equal(await world.equipWeapon(1, second.item_id), true);

    assert.equal(equippedGun(world, 1).item_id, second.item_id, 'в руках новое оружие');
    const inInventory = filledSlots(world, 1);
    assert.equal(inInventory.length, 1, 'прежнее оружие не должно потеряться');
    assert.equal(inInventory[0]?.item_id, first.item_id);
});

test('equipWeapon отказывает, если предмет не является оружием', async () => {
    // ловит: в слот оружия попадает аптечка, и useWeapon начинает
    // вызывать use не у того предмета
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'medkit', 1);

    assert.equal(await world.equipWeapon(1, findInInventory(world, 1, 'medkit').item_id), false);
    assert.equal(player.slot_weapon, null, 'слот оружия должен остаться пустым');
});

test('equipWeapon отказывает на несуществующем id', async () => {
    // ловит: экипировка предмета, которого нет в инвентаре —
    // оружие берётся из воздуха
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);

    assert.equal(await world.equipWeapon(1, 999), false);
    assert.equal(player.slot_weapon, null);
});

test('equipWeapon отказывает на несуществующем игроке', async () => {
    // ловит: обращение к отсутствующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(await world.equipWeapon(42, 1), false);
});

// ─────────────────────────── unequipWeapon ───────────────────────────

test('unequipWeapon возвращает оружие в инвентарь', async () => {
    // ловит: оружие исчезает при снятии — уходит из слота, но не попадает в инвентарь
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'gun', 1);
    const gunId = findInInventory(world, 1, 'gun').item_id;
    await world.equipWeapon(1, gunId);

    assert.equal(await world.unequipWeapon(1), true);
    assert.equal(player.slot_weapon, null, 'слот должен опустеть');
    assert.equal(findInInventory(world, 1, 'gun').item_id, gunId, 'оружие вернулось в инвентарь');
});

test('unequipWeapon с пустым слотом возвращает false', async () => {
    // ловит: снятие несуществующего оружия рапортует об успехе
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    assert.equal(await world.unequipWeapon(1), false);
});

test('unequipWeapon отказывает, когда в инвентаре нет места', async () => {
    // ловит: оружие снимается в полный инвентарь и пропадает,
    // потому что положить его физически некуда
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    for (let i = 0; i < 8; i++) {
        await world.giveItem(1, 'gun', 1);
    }
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id); // освободился один слот
    await world.giveItem(1, 'gun', 1); // и снова забили его

    assert.equal(await world.unequipWeapon(1), false);
    assert.ok(player.slot_weapon, 'оружие должно остаться в руках, а не потеряться');
    assert.equal(filledSlots(world, 1).length, 8);
});

// ─────────────────────────── useWeapon ───────────────────────────

test('useWeapon без оружия в руках возвращает false', async () => {
    // ловит: выстрел без оружия засчитывается как успешный
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    assert.equal(await world.useWeapon(1), false);
});

test('useWeapon без патронов возвращает false и не уводит счётчик в минус', async () => {
    // ловит: стрельба из пустого оружия проходит успешно,
    // а current_ammo становится отрицательным
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id);

    assert.equal(await world.useWeapon(1), false);
    assert.equal(equippedGun(world, 1).current_ammo, 0, 'счётчик должен остаться нулевым');
});

test('useWeapon на несуществующем игроке возвращает false', async () => {
    // ловит: обращение к отсутствующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(await world.useWeapon(42), false);
});

test('useWeapon тратит ровно один патрон', async () => {
    // ловит: выстрел не расходует боезапас или расходует больше одного патрона
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id);
    await world.reloadWeapon(1);
    const before = equippedGun(world, 1).current_ammo;

    assert.equal(await world.useWeapon(1), true);
    assert.equal(equippedGun(world, 1).current_ammo, before - 1);
});

// ─────────────────────────── reloadWeapon ───────────────────────────

test('reloadWeapon добирает патроны из нескольких коробок за один вызов', async () => {
    // ловит: перезарядка берёт только первую найденную коробку и останавливается,
    // хотя магазин ещё не полон, а патроны в инвентаре есть
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id);

    assert.equal(await world.reloadWeapon(1), true);
    const gun = equippedGun(world, 1);
    assert.equal(gun.current_ammo, gun.max_ammo, 'магазин должен заполниться целиком');
    assert.equal(ammoBoxes(world, 1).length, 0, 'опустевшие коробки должны уйти из инвентаря');
});

test('reloadWeapon на полном оружии возвращает false и не трогает коробку', async () => {
    // ловит: перезарядка полного оружия рапортует об успехе и списывает патроны
    // из коробки в никуда
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id);
    await world.reloadWeapon(1); // магазин полон
    await world.giveItem(1, 'ammo', 1);

    assert.equal(await world.reloadWeapon(1), false);
    assert.equal(ammoBoxes(world, 1)[0]?.ammo_cnt, 10, 'коробка должна остаться нетронутой');
});

test('reloadWeapon без патронов в инвентаре возвращает false', async () => {
    // ловит: перезарядка из пустоты засчитывается как успешная
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id);

    assert.equal(await world.reloadWeapon(1), false);
    assert.equal(equippedGun(world, 1).current_ammo, 0);
});

test('reloadWeapon на несуществующем игроке возвращает false', async () => {
    // ловит: обращение к отсутствующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(await world.reloadWeapon(42), false);
});

test('reloadWeapon без оружия в руках возвращает false', async () => {
    // ловит: перезарядка «в воздух» при пустом слоте оружия
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'ammo', 1);

    assert.equal(await world.reloadWeapon(1), false);
});

// ─────────────────────────── ammo через useItem ───────────────────────────

test('useItem на патронах заряжает оружие', async () => {
    // ловит: use у патронов ничего не меняет в состоянии игрока,
    // хотя задание требует наблюдаемый эффект именно от use
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'ammo').item_id), true);
    assert.equal(equippedGun(world, 1).current_ammo, 10);
});

test('useItem на патронах расходует именно указанную коробку', async () => {
    // ловит: использование конкретной коробки тратит первую попавшуюся,
    // и у игрока пропадают не те патроны, которые он выбрал
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.giveItem(1, 'ammo', 1);
    await world.equipWeapon(1, findInInventory(world, 1, 'gun').item_id);

    const boxes = ammoBoxes(world, 1);
    assert.equal(boxes.length, 2, 'предусловие: две коробки');
    const chosen = boxes[1];
    const untouched = boxes[0];
    assert.ok(chosen && untouched);

    assert.equal(await world.useItem(1, chosen.item_id), true);
    const left = ammoBoxes(world, 1);
    assert.equal(left.length, 1, 'выбранная коробка опустела и убрана');
    assert.equal(left[0]?.item_id, untouched.item_id, 'нетронутой должна остаться другая коробка');
});

test('useItem на патронах без оружия в руках возвращает false', async () => {
    // ловит: патроны расходуются впустую, когда заряжать нечего
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'ammo', 1);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'ammo').item_id), false);
    assert.equal(ammoBoxes(world, 1).length, 1, 'коробка должна остаться в инвентаре');
});
