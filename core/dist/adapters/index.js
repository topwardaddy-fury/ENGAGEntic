"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdapter = getAdapter;
exports.listAdapters = listAdapters;
exports.renderWithAdapter = renderWithAdapter;
const plain_1 = require("./plain");
const openai_1 = require("./openai");
const anthropic_1 = require("./anthropic");
const generic_1 = require("./generic");
const adapters = {
    [plain_1.plainAdapter.id]: plain_1.plainAdapter,
    [openai_1.openAIAdapter.id]: openai_1.openAIAdapter,
    [anthropic_1.anthropicAdapter.id]: anthropic_1.anthropicAdapter,
    [generic_1.genericAdapter.id]: generic_1.genericAdapter,
};
function getAdapter(id) {
    const adapter = adapters[id];
    if (!adapter) {
        throw new Error(`Adapter not found: ${id}`);
    }
    return adapter;
}
function listAdapters() {
    return Object.keys(adapters);
}
function renderWithAdapter(context, adapterId) {
    const adapter = getAdapter(adapterId);
    return adapter.render(context);
}
__exportStar(require("./types"), exports);
__exportStar(require("./plain"), exports);
__exportStar(require("./openai"), exports);
__exportStar(require("./anthropic"), exports);
__exportStar(require("./generic"), exports);
