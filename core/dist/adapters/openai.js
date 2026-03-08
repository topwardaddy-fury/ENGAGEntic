"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openAIAdapter = void 0;
exports.openAIAdapter = {
    id: 'openai',
    render(ctx) {
        const messages = [];
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
