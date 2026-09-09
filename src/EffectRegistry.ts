import type { Player } from './entities/Player.js';
import type { GameConfig } from './types/index.js';

// обработчик эффекта, что делать с игроком на каждом тике
type EffectHandler = (player: Player, config: GameConfig) => void;

// реестр эффектов, регестрируют сами свои эффекты
const effectRegistry: Map<string, EffectHandler> = new Map();

export function registerEffect(effectName: string, handler: EffectHandler): void {
    effectRegistry.set(effectName, handler);
}

export function getEffectHandler(effectName: string): EffectHandler | undefined {
    return effectRegistry.get(effectName);
}