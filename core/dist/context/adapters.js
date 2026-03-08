"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlainPrompt = toPlainPrompt;
exports.toOpenAIChatMessages = toOpenAIChatMessages;
exports.toAnthropicMessages = toAnthropicMessages;
exports.toGenericMessages = toGenericMessages;
function toPlainPrompt(ctx) {
    return ctx.full_composed_prompt;
}
function toOpenAIChatMessages(ctx) {
    const messages = [];
    if (ctx.system_prompt) {
        messages.push({ role: 'system', content: ctx.system_prompt });
    }
    if (ctx.developer_prompt) {
        // OpenAI recently introduced 'developer' role, falling back to 'system' if needed
        // but for modern SDKs 'developer' is correct for instructions.
        messages.push({ role: 'developer', content: ctx.developer_prompt });
    }
    if (ctx.user_prompt) {
        messages.push({ role: 'user', content: ctx.user_prompt });
    }
    return messages;
}
function toAnthropicMessages(ctx) {
    return {
        system: `${ctx.system_prompt}\n\n${ctx.developer_prompt}`.trim(),
        messages: [
            { role: 'user', content: ctx.user_prompt }
        ]
    };
}
function toGenericMessages(ctx) {
    return {
        system_prompt: ctx.system_prompt,
        developer_prompt: ctx.developer_prompt,
        user_prompt: ctx.user_prompt
    };
}
