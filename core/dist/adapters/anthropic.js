"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anthropicAdapter = void 0;
exports.anthropicAdapter = {
    id: 'anthropic',
    render(ctx) {
        return {
            system: `${ctx.system_prompt}\n\n${ctx.developer_prompt}`.trim(),
            messages: [
                { role: 'user', content: ctx.user_prompt }
            ]
        };
    }
};
