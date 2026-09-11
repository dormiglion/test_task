import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createTestWorld, createTestStorage, silenceLogs,
    filledSlots, findInInventory, equippedGun
} from './helpers.js';

silenceLogs();

// ─────────────────────────── addPlayer ───────────────────────────

test('addPlayer создаёт игрока, и он находится через getPlayer', async () => {
    // ловит: игрок создан, но не попал в реестр мира — тогда все последующие
    // операции по его id молча отвечают «игрока не существует»
    const world = createTestWorld();
    const player = await world.addPlayer(1, 5, 7);
    assert.ok(player, 'addPlayer должен вернуть игрока');

    const found = world.getPlayer(1);
    assert.ok(found, 'созданный игрок должен находиться по id');
    assert.equal(found.player_id, 1);
    assert.equal(found.x, 5);
    assert.equal(found.y, 7);
});

test('addPlayer с занятым id отказывает и не затирает существующего игрока', async () => {
    // ловит: повторный вход под тем же id создаёт нового игрока поверх старого,
    // и первый теряет позицию и инвентарь прямо во время игры
    const world = createTestWorld();
    await world.addPlayer(1, 5, 5);
    await world.giveItem(1, 'medkit', 1);

    assert.equal(await world.addPlayer(1, 40, 40), null, 'вход под занятым id должен вернуть null');

    const player = world.getPlayer(1);
    assert.ok(player);
    assert.equal(player.x, 5, 'позиция первого игрока не должна измениться');
    assert.equal(filledSlots(world, 1).length, 1, 'инвентарь первого игрока должен остаться');
});

test('addPlayer отказывает на координатах вне карты', async () => {
    // ловит: игрок появляется за границей карты, хотя moveTo такие координаты запрещает —
    // одно и то же правило должно действовать на обоих входах
    const world = createTestWorld();
    assert.equal(await world.addPlayer(1, 999, 10), null, 'x за границей карты');
    assert.equal(await world.addPlayer(2, 10, -1), null, 'отрицательный y');
    assert.equal(world.getPlayer(1), null, 'отвергнутый игрок не должен попасть в мир');
});

test('addPlayer отказывает на дробных координатах', async () => {
    // ловит: позиция перестаёт быть целочисленной, и расчёт расстояния
    // до предметов начинает вести себя не так, как задумано
    const world = createTestWorld();
    assert.equal(await world.addPlayer(1, 10.5, 10), null);
    assert.equal(world.getPlayer(1), null);
});

test('новый игрок появляется с полным здоровьем и пустым инвентарём', async () => {
    // ловит: стартовое состояние собрано мимо конфига — например, здоровье
    // берётся из константы, а не из maxHealth
    const world = createTestWorld({ maxHealth: 80 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    assert.equal(player.health, 80, 'здоровье должно браться из конфига');
    assert.equal(player.armor, 0);
    assert.equal(filledSlots(world, 1).length, 0);
    assert.equal(player.slot_weapon, null);
    assert.equal(player.slot_armor, null);
});

// ─────────────────────────── getPlayer / getInventory ───────────────────────────

test('getPlayer на несуществующем игроке возвращает null', async () => {
    // ловит: вместо «нет такого» метод отдаёт мусор, и вызывающий код
    // идёт дальше с пустышкой вместо того, чтобы остановиться
    const world = createTestWorld();
    assert.equal(world.getPlayer(42), null);
});

test('getInventory на несуществующем игроке возвращает пустой массив', async () => {
    // ловит: падение вместо аккуратного отказа при запросе инвентаря
    // у отключившегося или никогда не существовавшего игрока
    const world = createTestWorld();
    assert.deepEqual(world.getInventory(42), []);
});

test('getInventory отдаёт ровно восемь слотов, пустые — как null', async () => {
    // ловит: размер инвентаря разъехался с типом PlayerState,
    // или пустые слоты схлопываются и позиции предметов начинают ехать
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 1);

    const inventory = world.getInventory(1);
    assert.equal(inventory.length, 8, 'слотов всегда восемь');
    assert.equal(inventory.filter(slot => slot === null).length, 7, 'семь из них пустые');
});

test('getInventory отдаёт копии предметов, а не живые объекты игрока', async () => {
    // ловит: наружу утекают сами предметы игрока — тогда любой, кто получил
    // инвентарь, может менять чужое количество и характеристики в обход ядра
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 3);

    const snapshot = world.getInventory(1);
    const slot = snapshot.find(item => item?.item_type === 'medkit');
    assert.ok(slot);
    slot.amount = 999;

    assert.equal(findInInventory(world, 1, 'medkit').amount, 3,
        'правка выданной копии не должна менять инвентарь игрока');
});

// ─────────────────────────── movePlayerTo ───────────────────────────

test('movePlayerTo перемещает игрока внутри карты', async () => {
    // ловит: перемещение отрабатывает как успешное, но позиция не меняется
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);

    assert.equal(world.movePlayerTo(1, 10, 20), true);
    const player = world.getPlayer(1);
    assert.ok(player);
    assert.equal(player.x, 10);
    assert.equal(player.y, 20);
});

test('movePlayerTo за границу карты отказывает и не двигает игрока', async () => {
    // ловит: игрок уходит за пределы карты, и предметы, выброшенные им,
    // оказываются там, куда никто не может дойти
    const world = createTestWorld();
    await world.addPlayer(1, 3, 3);

    assert.equal(world.movePlayerTo(1, 51, 3), false, 'за правой границей');
    assert.equal(world.movePlayerTo(1, -1, 3), false, 'за левой границей');
    assert.equal(world.movePlayerTo(1, 3.5, 3), false, 'дробная координата');

    const player = world.getPlayer(1);
    assert.ok(player);
    assert.equal(player.x, 3, 'после отказов позиция должна остаться прежней');
    assert.equal(player.y, 3);
});

test('movePlayerTo на несуществующем игроке возвращает false', async () => {
    // ловит: обращение к отсутствующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(world.movePlayerTo(42, 1, 1), false);
});

// ─────────────────────────── removePlayer / deletePlayerFromDB ───────────────────────────

test('removePlayer убирает игрока с сервера, но вещи остаются в БД', async () => {
    // ловит: выход из игры трактуется как удаление аккаунта,
    // и игрок возвращается с пустым инвентарём
    const storage = createTestStorage();
    const first = createTestWorld({}, storage);
    await first.addPlayer(1, 0, 0);
    await first.giveItem(1, 'medkit', 1);

    assert.equal(first.removePlayer(1), true);
    assert.equal(first.getPlayer(1), null, 'после выхода игрока нет на сервере');

    const second = createTestWorld({}, storage);
    await second.addPlayer(1, 0, 0);
    assert.equal(filledSlots(second, 1).length, 1, 'вещи должны вернуться при новом входе');
});

test('removePlayer на несуществующем игроке возвращает false', async () => {
    // ловит: отключение того, кого нет, рапортует об успехе
    const world = createTestWorld();
    assert.equal(world.removePlayer(42), false);
});

test('deletePlayerFromDB отказывает, пока игрок ещё на сервере', async () => {
    // ловит: данные удаляются из-под играющего игрока — он остаётся
    // в мире с инвентарём, которого больше нет в хранилище
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'medkit', 1);

    assert.equal(await world.deletePlayerFromDB(1), false, 'сначала игрок должен покинуть сервер');
    assert.equal(filledSlots(world, 1).length, 1, 'инвентарь не должен пострадать');
});

test('deletePlayerFromDB после выхода стирает вещи насовсем', async () => {
    // ловит: удаление не доходит до хранилища, и «удалённый» игрок
    // возвращается со своим старым инвентарём
    const storage = createTestStorage();
    const first = createTestWorld({}, storage);
    await first.addPlayer(1, 0, 0);
    await first.giveItem(1, 'medkit', 1);
    first.removePlayer(1);

    assert.equal(await first.deletePlayerFromDB(1), true);

    const second = createTestWorld({}, storage);
    await second.addPlayer(1, 0, 0);
    assert.equal(filledSlots(second, 1).length, 0, 'инвентарь должен быть пустым');
});

// ─────────────────────────── восстановление из хранилища ───────────────────────────

test('после переподключения восстанавливаются все восемь слотов', async () => {
    // ловит: цикл восстановления с захардкоженной длиной — при инвентаре
    // больше восьми слотов последние молча терялись бы при каждом входе
    const storage = createTestStorage();
    const first = createTestWorld({}, storage);
    await first.addPlayer(1, 0, 0);
    for (let i = 0; i < 8; i++) {
        await first.giveItem(1, 'gun', 1);
    }
    assert.equal(filledSlots(first, 1).length, 8, 'предусловие: инвентарь забит полностью');
    first.removePlayer(1);

    const second = createTestWorld({}, storage);
    await second.addPlayer(1, 0, 0);
    assert.equal(filledSlots(second, 1).length, 8, 'должны вернуться все восемь предметов');
});

test('патроны в оружии переживают переподключение', async () => {
    // ловит: getState или фабрика теряют поля наследников (current_ammo),
    // и оружие возвращается из БД разряженным
    const storage = createTestStorage();
    const first = createTestWorld({}, storage);
    await first.addPlayer(1, 0, 0);
    await first.giveItem(1, 'gun', 1);
    await first.giveItem(1, 'ammo', 1);
    await first.equipWeapon(1, findInInventory(first, 1, 'gun').item_id);
    await first.reloadWeapon(1);
    assert.equal(equippedGun(first, 1).current_ammo, 10, 'предусловие: оружие заряжено');
    first.removePlayer(1);

    const second = createTestWorld({}, storage);
    await second.addPlayer(1, 0, 0);
    assert.equal(equippedGun(second, 1).current_ammo, 10, 'патроны должны сохраниться');
});

test('битый предмет в БД не мешает игроку войти', async () => {
    // ловит: неизвестный тип предмета из хранилища бросает исключение из addPlayer,
    // и один испорченный предмет полностью блокирует вход в игру
    const storage = createTestStorage();
    await storage.saveInventory(1, {
        inventory: [
            { item_id: 10, item_type: 'medkit', amount: 1 },
            { item_id: 11, item_type: 'flamethrower', amount: 1 }, // такого типа нет в реестре
            null, null, null, null, null, null
        ],
        slot_weapon: null,
        slot_armor: null
    });

    const world = createTestWorld({}, storage);
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player, 'игрок должен войти, несмотря на битый предмет');
    assert.equal(filledSlots(world, 1).length, 1, 'уцелевший предмет должен восстановиться');
});

test('надетая броня после переподключения продолжает защищать', async () => {
    // ловит: в слот брони предмет возвращается, а числовое значение player.armor
    // не восстанавливается — после перезахода защита оказывается фиктивной
    const storage = createTestStorage();
    const first = createTestWorld({}, storage);
    await first.addPlayer(1, 0, 0);
    await first.giveItem(1, 'armor', 1);
    await first.useItem(1, findInInventory(first, 1, 'armor').item_id);

    assert.equal(first.getPlayer(1)?.armor, 100, 'предусловие: броня надета и защищает');
    first.removePlayer(1);

    const second = createTestWorld({}, storage);
    const player = await second.addPlayer(1, 0, 0);
    assert.ok(player);
    assert.ok(player.slot_armor, 'броня должна вернуться в слот');
    assert.equal(player.armor, 100, 'и защита должна вернуться вместе с ней');
});
