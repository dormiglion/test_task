import { BaseItem } from "./items/BaseItem.js"
import type { ItemState } from "./types/index.js"

// тип для конструктора любого класса-наследника BaseItem
type ItemConstructor = new (state: ItemState) => BaseItem;

// словарь registry, где ключ — это строка типа 'gun', 'medkit' 'ammo' итд, а значение это уже сам класс
const itemRegistry: Map<string, ItemConstructor> = new Map();

// функция для регистрации
export function registerItemType(itemType: string, constructor: ItemConstructor): void {
    itemRegistry.set(itemType, constructor);
}

// Главная фабрика: принимает объект с данными и возвращает готовый экземпляр класса
export function createItemInstance(state: ItemState): BaseItem {
    const ItemClass = itemRegistry.get(state.item_type);

    if (!ItemClass) {
        throw new Error(`Неизвестный тип предмета: ${state.item_type}.`);
    }
    // Создаем экземпляр нужного класса через сохраненный конструктор
    return new ItemClass(state);
}