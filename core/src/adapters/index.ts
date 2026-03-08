import { plainAdapter } from './plain';
import { openAIAdapter } from './openai';
import { anthropicAdapter } from './anthropic';
import { genericAdapter } from './generic';
import { Adapter } from './types';
import { NormalizedContext } from '../context/types';

const adapters: Record<string, Adapter> = {
    [plainAdapter.id]: plainAdapter,
    [openAIAdapter.id]: openAIAdapter,
    [anthropicAdapter.id]: anthropicAdapter,
    [genericAdapter.id]: genericAdapter,
};

export function getAdapter(id: string): Adapter {
    const adapter = adapters[id];
    if (!adapter) {
        throw new Error(`Adapter not found: ${id}`);
    }
    return adapter;
}

export function listAdapters(): string[] {
    return Object.keys(adapters);
}

export function renderWithAdapter(context: NormalizedContext, adapterId: string): any {
    const adapter = getAdapter(adapterId);
    return adapter.render(context);
}

export * from './types';
export * from './plain';
export * from './openai';
export * from './anthropic';
export * from './generic';
