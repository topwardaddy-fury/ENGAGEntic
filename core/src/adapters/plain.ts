import { NormalizedContext } from '../context/types';
import { Adapter } from './types';

export const plainAdapter: Adapter<string> = {
    id: 'plain',
    render(ctx: NormalizedContext): string {
        return ctx.full_composed_prompt;
    }
};
