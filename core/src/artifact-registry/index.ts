import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import { Artifact } from '../context/types';
import crypto from 'crypto';

export interface ManifestEntry {
    id: string;
    type: string;
    title: string;
    file_path: string;
    version: string;
    tags: string[];
    extends: string | null;
    includes: string[];
    checksum: string;
    last_modified: string;
}

export class ArtifactRegistry {
    private manifest: Map<string, ManifestEntry> = new Map();
    private baseDir: string;

    constructor(baseDir: string) {
        this.baseDir = baseDir;
    }

    async buildManifest(paths: Record<string, string>): Promise<ManifestEntry[]> {
        this.manifest.clear();

        for (const [type, dir] of Object.entries(paths)) {
            await this.scanDirectory(dir, type);
        }

        return Array.from(this.manifest.values());
    }

    private async scanDirectory(dir: string, type: string) {
        try {
            const files = await fs.readdir(dir, { recursive: true });
            const mdFiles = (files as string[]).filter(f => f.endsWith('.md'));

            for (const f of mdFiles) {
                const fullPath = path.join(dir, f);
                const stats = await fs.stat(fullPath);
                const rawContent = await fs.readFile(fullPath, 'utf-8');
                const parsed = matter(rawContent);
                const data = parsed.data;

                const entry: ManifestEntry = {
                    id: data.id || f,
                    type: data.type || type.replace(/s$/, ''), // e.g. profiles -> profile
                    title: data.title || data.name || f,
                    file_path: path.relative(this.baseDir, fullPath),
                    version: data.version || '1.0.0',
                    tags: data.tags || [],
                    extends: data.extends || null,
                    includes: data.includes || [],
                    checksum: crypto.createHash('sha256').update(rawContent).digest('hex'),
                    last_modified: stats.mtime.toISOString(),
                };

                this.manifest.set(entry.id, entry);
            }
        } catch (err) {
            console.error(`Registry scan error in ${dir}:`, err);
        }
    }

    getManifest(): ManifestEntry[] {
        return Array.from(this.manifest.values());
    }

    async saveManifest(targetPath: string) {
        const data = JSON.stringify(this.getManifest(), null, 2);
        await fs.writeFile(targetPath, data, 'utf-8');
    }
}
