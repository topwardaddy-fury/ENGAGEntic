"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genericAdapter = void 0;
exports.genericAdapter = {
    id: 'generic',
    render(ctx) {
        return {
            system_prompt: ctx.system_prompt,
            developer_prompt: ctx.developer_prompt,
            user_prompt: ctx.user_prompt
        };
    }
};
