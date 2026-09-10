import test from 'node:test';
import assert from 'node:assert/strict';
import { createTestWorld, silenceLogs, filledSlots, findInInventory } from './helpers.js';

silenceLogs();

// ─────────────────────────── medkit ───────────────────────────

test('аптечка восстанавливает здоровье на величину из конфига', async () => {
    // ловит: эффект зашит константой мимо конфига, и настройка medkit_healing
    // перестаёт на что-либо влиять
    const world = createTestWorld({ medkit_healing: 30 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 50;
    await world.giveItem(1, 'medkit', 1);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'medkit').item_id), true);
    assert.equal(player.health, 80);
});

test('аптечка не поднимает здоровье выше максимума', async () => {
    // ловит: здоровье переваливает за maxHealth и игрок становится
    // живучее, чем позволяют правила
    const world = createTestWorld({ maxHealth: 100, medkit_healing: 25 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 90;
    await world.giveItem(1, 'medkit', 1);

    await world.useItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.equal(player.health, 100, 'должно упереться в потолок, а не стать 115');
});

test('аптечка расходуется даже при полном здоровье', async () => {
    // закрепляет осознанное решение автора: использование на полном здоровье
    // всё равно тратит аптечку. Тест упадёт, если поведение поменяют случайно
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'medkit', 1);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'medkit').item_id), true);
    assert.equal(player.health, 100, 'здоровье и так было полным');
    assert.equal(filledSlots(world, 1).length, 0, 'аптечка израсходована');
});

test('использование аптечки из стака тратит ровно одну штуку', async () => {
    // ловит: расходуется весь стак целиком или, наоборот, не расходуется ничего
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 10;
    await world.giveItem(1, 'medkit', 3);

    await world.useItem(1, findInInventory(world, 1, 'medkit').item_id);
    assert.equal(findInInventory(world, 1, 'medkit').amount, 2);
});

// ─────────────────────────── bandage ───────────────────────────

test('бинт не лечит мгновенно, а вешает эффект и сразу расходуется', async () => {
    // ловит: бинт срабатывает как аптечка — весь эффект применяется в момент
    // использования, и «эффект во времени» из задания превращается в разовый
    const world = createTestWorld({ bandage_duration_ticks: 3 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 50;
    await world.giveItem(1, 'bandage', 1);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'bandage').item_id), true);
    assert.equal(player.health, 50, 'до первого тика здоровье меняться не должно');
    assert.equal(filledSlots(world, 1).length, 0, 'сам бинт израсходован сразу');
    assert.ok(player.activeEffects['bandage'], 'эффект должен висеть на игроке');
});

test('бинт лечит понемногу на каждом тике', async () => {
    // ловит: эффект висит, но обработчик на тике не вызывается —
    // лечение не наступает вообще
    const world = createTestWorld({ bandage_healing: 10, bandage_duration_ticks: 3 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 50;
    await world.giveItem(1, 'bandage', 1);
    await world.useItem(1, findInInventory(world, 1, 'bandage').item_id);

    await world.tick();
    assert.equal(player.health, 60, 'после первого тика +10');
    await world.tick();
    assert.equal(player.health, 70, 'после второго ещё +10');
});

test('эффект бинта спадает через заданное число тиков', async () => {
    // ловит: эффект не снимается и лечит вечно — счётчик тиков
    // не уменьшается или не проверяется
    const world = createTestWorld({ bandage_healing: 10, bandage_duration_ticks: 3 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 10;
    await world.giveItem(1, 'bandage', 1);
    await world.useItem(1, findInInventory(world, 1, 'bandage').item_id);

    for (let i = 0; i < 3; i++) {
        await world.tick();
    }
    assert.equal(player.health, 40, 'три тика по 10');
    assert.equal(player.activeEffects['bandage'], undefined, 'эффект должен быть снят');

    await world.tick();
    assert.equal(player.health, 40, 'после снятия эффекта лечение прекращается');
});

test('повторное применение бинта продлевает эффект заново', async () => {
    // ловит: второй бинт не обновляет счётчик, а тратится впустую —
    // или, наоборот, ломает уже идущий эффект
    const world = createTestWorld({ bandage_healing: 10, bandage_duration_ticks: 3 });
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    player.health = 10;
    await world.giveItem(1, 'bandage', 2);
    await world.useItem(1, findInInventory(world, 1, 'bandage').item_id);

    await world.tick();
    assert.equal(player.activeEffects['bandage']?.remaining_ticks, 2, 'предусловие: один тик прошёл');

    await world.useItem(1, findInInventory(world, 1, 'bandage').item_id);
    assert.equal(player.activeEffects['bandage']?.remaining_ticks, 3, 'счётчик должен встать заново');
});

test('эффекты на тике применяются ко всем игрокам, а не только к первому', async () => {
    // ловит: обход игроков в applyActiveEffects выходит после первого —
    // тогда у всех, кроме одного, эффекты просто не работают
    const world = createTestWorld({ bandage_healing: 10, bandage_duration_ticks: 3 });
    const first = await world.addPlayer(1, 0, 0);
    const second = await world.addPlayer(2, 5, 5);
    assert.ok(first && second);
    first.health = 20;
    second.health = 20;

    await world.giveItem(1, 'bandage', 1);
    await world.giveItem(2, 'bandage', 1);
    await world.useItem(1, findInInventory(world, 1, 'bandage').item_id);
    await world.useItem(2, findInInventory(world, 2, 'bandage').item_id);

    await world.tick();
    assert.equal(first.health, 30, 'первый игрок должен лечиться');
    assert.equal(second.health, 30, 'и второй тоже');
});

// ─────────────────────────── armor ───────────────────────────

test('броня при использовании поднимает защиту и уходит из инвентаря в слот', async () => {
    // ловит: броня «надевается», но значение armor не меняется,
    // либо предмет остаётся лежать в инвентаре и его можно надеть дважды
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'armor', 1);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'armor').item_id), true);
    assert.equal(player.armor, 100, 'защита должна вырасти');
    assert.ok(player.slot_armor, 'броня должна оказаться в слоте');
    assert.equal(filledSlots(world, 1).length, 0, 'и уйти из инвентаря');
});

test('unequipArmor снимает броню и возвращает её в инвентарь', async () => {
    // ловит: броню невозможно снять — она уходит из слота, но не попадает
    // в инвентарь, либо защита продолжает считаться после снятия
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'armor', 1);
    await world.useItem(1, findInInventory(world, 1, 'armor').item_id);

    assert.equal(await world.unequipArmor(1), true);
    assert.equal(player.armor, 0, 'защита должна вернуться к нулю');
    assert.equal(player.slot_armor, null, 'слот брони должен опустеть');
    assert.equal(filledSlots(world, 1).length, 1, 'броня должна вернуться в инвентарь');
});

test('unequipArmor с пустым слотом брони возвращает false', async () => {
    // ловит: снятие несуществующей брони рапортует об успехе
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    assert.equal(await world.unequipArmor(1), false);
});

test('unequipArmor отказывает, когда в инвентаре нет места', async () => {
    // ловит: броня снимается в полный инвентарь и пропадает,
    // потому что положить её физически некуда
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'armor', 1);
    await world.useItem(1, findInInventory(world, 1, 'armor').item_id); // слот инвентаря освободился
    for (let i = 0; i < 8; i++) {
        await world.giveItem(1, 'gun', 1);
    }

    assert.equal(await world.unequipArmor(1), false);
    assert.ok(player.slot_armor, 'броня должна остаться надетой, а не потеряться');
    assert.equal(player.armor, 100, 'и продолжать защищать');
});

test('unequipArmor на несуществующем игроке возвращает false', async () => {
    // ловит: обращение к отсутствующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(await world.unequipArmor(42), false);
});

test('надевание второй брони меняет её местами с уже надетой', async () => {
    // ловит: прежняя броня пропадает при замене вместо того,
    // чтобы вернуться в освободившийся слот инвентаря
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'armor', 1);
    await world.giveItem(1, 'armor', 1);
    const [first, second] = filledSlots(world, 1);
    assert.ok(first && second);

    await world.useItem(1, first.item_id);
    assert.equal(await world.useItem(1, second.item_id), true);

    assert.equal(player.slot_armor?.item_id, second.item_id, 'надета вторая броня');
    const inInventory = filledSlots(world, 1);
    assert.equal(inInventory.length, 1, 'прежняя броня не должна потеряться');
    assert.equal(inInventory[0]?.item_id, first.item_id);
});

test('use на уже надетой броне ничего не меняет', async () => {
    // закрепляет разделение операций: use только надевает, снятие — отдельный вызов.
    // ловит возврат к старому поведению-переключателю, при котором повторный use
    // молча снимал бы броню
    const world = createTestWorld();
    const player = await world.addPlayer(1, 0, 0);
    assert.ok(player);
    await world.giveItem(1, 'armor', 1);
    const armorId = findInInventory(world, 1, 'armor').item_id;
    await world.useItem(1, armorId);

    assert.equal(await world.useItem(1, armorId), false, 'в инвентаре этой брони уже нет');
    assert.ok(player.slot_armor, 'броня должна остаться надетой');
    assert.equal(player.armor, 100);
});

// ─────────────────────────── общие отказы useItem ───────────────────────────

test('useItem на несуществующем предмете возвращает false', async () => {
    // ловит: применение отсутствующего предмета даёт эффект из воздуха
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    assert.equal(await world.useItem(1, 999), false);
});

test('useItem на несуществующем игроке возвращает false', async () => {
    // ловит: обращение к отсутствующему игроку роняет мир вместо отказа
    const world = createTestWorld();
    assert.equal(await world.useItem(42, 1), false);
});

test('оружие в рюкзаке использовать нельзя — его нужно экипировать', async () => {
    // ловит: из инвентаря можно стрелять, минуя слот оружия,
    // и экипировка перестаёт что-либо значить
    const world = createTestWorld();
    await world.addPlayer(1, 0, 0);
    await world.giveItem(1, 'gun', 1);

    assert.equal(await world.useItem(1, findInInventory(world, 1, 'gun').item_id), false);
});
