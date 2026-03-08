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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactRegistry = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const gray_matter_1 = __importDefault(require("gray-matter"));
const crypto_1 = __importDefault(require("crypto"));
class ArtifactRegistry {
    manifest = new Map();
    baseDir;
    constructor(baseDir) {
        this.baseDir = baseDir;
    }
    async buildManifest(paths) {
        this.manifest.clear();
        for (const [type, dir] of Object.entries(paths)) {
            await this.scanDirectory(dir, type);
        }
        return Array.from(this.manifest.values());
    }
    async scanDirectory(dir, type) {
        try {
            const files = await fs.readdir(dir, { recursive: true });
            const mdFiles = files.filter(f => f.endsWith('.md'));
            for (const f of mdFiles) {
                const fullPath = path.join(dir, f);
                const stats = await fs.stat(fullPath);
                const rawContent = await fs.readFile(fullPath, 'utf-8');
                const parsed = (0, gray_matter_1.default)(rawContent);
                const data = parsed.data;
                const entry = {
                    id: data.id || f,
                    type: data.type || type.replace(/s$/, ''), // e.g. profiles -> profile
                    title: data.title || data.name || f,
                    file_path: path.relative(this.baseDir, fullPath),
                    version: data.version || '1.0.0',
                    tags: data.tags || [],
                    extends: data.extends || null,
                    includes: data.includes || [],
                    checksum: crypto_1.default.createHash('sha256').update(rawContent).digest('hex'),
                    last_modified: stats.mtime.toISOString(),
                };
                this.manifest.set(entry.id, entry);
            }
        }
        catch (err) {
            console.error(`Registry scan error in ${dir}:`, err);
        }
    }
    getManifest() {
        return Array.from(this.manifest.values());
    }
    async saveManifest(targetPath) {
        const data = JSON.stringify(this.getManifest(), null, 2);
        await fs.writeFile(targetPath, data, 'utf-8');
    }
}
exports.ArtifactRegistry = ArtifactRegistry;
