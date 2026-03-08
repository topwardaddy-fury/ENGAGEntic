import { NormalizedContext, ChatMessage } from '../context/types';
import { Adapter } from './types';

export const openAIAdapter: Adapter<ChatMessage[]> = {
    id: 'openai',
    render(ctx: NormalizedContext): ChatMessage[] {
        const messages: ChatMessage[] = [];

        if (ctx.system_prompt) {
            messages.push({ role: 'system', content: ctx.system_prompt });
        }

        if (ctx.developer_prompt) {
            messages.push({ role: 'developer', content: ctx.developer_prompt });
        }

        if (ctx.user_prompt) {
            messages.push({ role: 'user', content: ctx.user_prompt });
        }

        return messages;
    }
};
