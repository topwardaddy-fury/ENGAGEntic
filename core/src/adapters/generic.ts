import { NormalizedContext, GenericContext } from '../context/types';
import { Adapter } from './types';

export const genericAdapter: Adapter<GenericContext> = {
    id: 'generic',
    render(ctx: NormalizedContext): GenericContext {
        return {
            system_prompt: ctx.system_prompt,
            developer_prompt: ctx.developer_prompt,
            user_prompt: ctx.user_prompt
        };
    }
};
