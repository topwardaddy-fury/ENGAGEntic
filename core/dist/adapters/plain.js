"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.plainAdapter = void 0;
exports.plainAdapter = {
    id: 'plain',
    render(ctx) {
        return ctx.full_composed_prompt;
    }
};
