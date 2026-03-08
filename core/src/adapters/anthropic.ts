import { NormalizedContext, AnthropicPayload } from '../context/types';
import { Adapter } from './types';

export const anthropicAdapter: Adapter<AnthropicPayload> = {
    id: 'anthropic',
    render(ctx: NormalizedContext): AnthropicPayload {
        return {
            system: `${ctx.system_prompt}\n\n${ctx.developer_prompt}`.trim(),
            messages: [
                { role: 'user', content: ctx.user_prompt }
            ]
        };
    }
};
