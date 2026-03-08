import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import matter from 'gray-matter';

// Import normalized context types and logic
import { Artifact, NormalizedContext } from './context/types';
import { composeContext } from './context/composeContext';
import {
    getAdapter,
    listAdapters,
    renderWithAdapter,
    Adapter
} from './adapters';
import { ArtifactRegistry } from './artifact-registry';
import { ArtifactValidator } from './validation';

dotenv.config();

const app = express();
const port = process.env.PORT || 9091;

// Base Paths from the project root
const BASE_PATH = path.resolve(path.join(__dirname, '../../'));
const PATHS = {
    standards: path.join(BASE_PATH, 'standards-library'),
    standards_registry: path.join(BASE_PATH, 'standards-registry'),
    profiles: path.join(BASE_PATH, 'profiles'),
    specifications: path.join(BASE_PATH, 'spec-templates'),
    workflows: path.join(BASE_PATH, 'workflows'),
};

console.log('--- Startup Path Diagnostics ---');
console.log('__dirname:', __dirname);
console.log('BASE_PATH:', BASE_PATH);
Object.entries(PATHS).forEach(([key, val]) => console.log(`PATH ${key}:`, val));
console.log('--------------------------------');

// Initialize Artifact Registry
const registry = new ArtifactRegistry(BASE_PATH);
const MANIFEST_PATH = path.join(BASE_PATH, 'artifact_manifest.json');

async function startPlatform() {
    console.log('Building artifact manifest...');
    const manifest = await registry.buildManifest(PATHS);
    await registry.saveManifest(MANIFEST_PATH);
    console.log(`Manifest saved to ${MANIFEST_PATH}`);

    console.log('Validating artifacts...');
    const registryIssues = ArtifactValidator.validateRegistry(manifest);
    if (registryIssues.length > 0) {
        console.warn('Registry Validation Issues:', registryIssues);
    } else {
        console.log('Registry validation passed.');
    }
}

startPlatform();
// Middleware
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Database Pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

const TABLE_MISSING = '42P01';
const PLATFORM_VERSION = process.env.PLATFORM_VERSION || 'v0.2.2-stable';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://engagentic_ai:9094';
const EMBEDDING_MODEL = process.env.ENHANCER_EMBEDDING_MODEL || 'nomic-embed-text:latest';
const ENHANCER_MODELS = [
    process.env.ENHANCER_MODEL_FAST || 'llama3.2:latest',
    process.env.ENHANCER_MODEL_DEEP || 'lfm2.5-thinking:latest',
    process.env.ENHANCER_MODEL_STRICT || 'granite4:latest'
];
const ENHANCER_FALLBACK_MODEL = process.env.ENHANCER_FALLBACK_MODEL || ENHANCER_MODELS[2];
const modelProfileEmbeddings = new Map<string, number[]>();
const SCOUT_ENABLED = process.env.SCOUT_ENABLED !== 'false';
const SCOUT_TARGET_COUNT = Math.max(1, parseInt(process.env.SCOUT_TARGET_COUNT || '5', 10));
const SCOUT_INTERVAL_MS = Math.max(20000, parseInt(process.env.SCOUT_INTERVAL_MS || '120000', 10));
const GITHUB_API_URL = process.env.GITHUB_API_URL || 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const SCOUT_REPO_QUERY = process.env.SCOUT_REPO_QUERY
    || 'ai prompt engineering stars:>100 archived:false';

type ScoutState = {
    running: boolean;
    enabled: boolean;
    last_run_at: string | null;
    last_reason: string | null;
    last_error: string | null;
    last_created: number;
    last_scanned: number;
    last_candidates: number;
    last_skipped_no_security: number;
    last_skipped_not_reusable: number;
    last_repo_fetch_errors: number;
    last_search_total: number;
    repo_query: string;
};

type ScoutCandidate = {
    fullName: string;
    htmlUrl: string;
    stars: number;
    description: string;
    readme: string;
};

type ScoutSelectionResult = {
    candidates: ScoutCandidate[];
    scanned: number;
    skippedNoSecurity: number;
    skippedNotReusable: number;
    fetchErrors: number;
    searchTotal: number;
};

const scoutState: ScoutState = {
    running: false,
    enabled: SCOUT_ENABLED,
    last_run_at: null,
    last_reason: null,
    last_error: null,
    last_created: 0,
    last_scanned: 0,
    last_candidates: 0,
    last_skipped_no_security: 0,
    last_skipped_not_reusable: 0,
    last_repo_fetch_errors: 0,
    last_search_total: 0,
    repo_query: SCOUT_REPO_QUERY
};

const ENHANCER_MODEL_PROFILES: Record<string, string> = {
    'llama3.2:latest': 'Fast, concise profile rewriting for straightforward role descriptions and lightweight edits.',
    'lfm2.5-thinking:latest': 'Detailed reasoning for complex technical profiles, nuanced behavior guidance, and multi-constraint restructuring.',
    'granite4:latest': 'High-format reliability and strict markdown/frontmatter compliance when schema adherence is critical.'
};

const ENHANCER_MODEL_SPEED_BONUS: Record<string, number> = {
    'llama3.2:latest': 0.18,
    'lfm2.5-thinking:latest': 0.08,
    'granite4:latest': 0
};

function parseArtifact(rawContent: string) {
    const parsed = matter(rawContent);
    if (Object.keys(parsed.data).length > 0) {
        return parsed;
    }

    // Fallback for legacy files that place a title before frontmatter.
    const legacyMatch = rawContent.match(/^[^\n]*\n---\n[\s\S]*?\n---\n?/);
    if (!legacyMatch) {
        return parsed;
    }

    const frontmatterStart = rawContent.indexOf('---\n');
    if (frontmatterStart < 0) {
        return parsed;
    }

    const legacyBlock = rawContent.slice(frontmatterStart);
    const reparsed = matter(legacyBlock);
    const heading = rawContent.match(/^#\s+(.+)$/m)?.[1]?.trim();
    if (heading && !reparsed.data.name && !reparsed.data.title) {
        reparsed.data.name = heading;
        reparsed.data.title = heading;
    }
    return reparsed;
}

function normalizeArtifactMetadata(filePath: string, data: any, markdownContent: string) {
    const titleFromBody = markdownContent.match(/^#\s+(.+)$/m)?.[1]?.trim();
    const descriptionFromBody = markdownContent
        .replace(/^#.*$/gm, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim()
        .split('\n')
        .map(line => line.trim())
        .find(line => line.length > 0 && !line.startsWith('-') && !line.startsWith('*'));

    const rawName = data.name || data.title || titleFromBody || filePath;
    const normalizedName =
        data.source === 'scout' && typeof rawName === 'string'
            ? rawName
                .replace(/^Scout Profile:\s*/i, '')
                .replace(/^Scout Standard:\s*/i, '')
                .replace(/^Scout Spec:\s*/i, '')
            : rawName;

    return {
        id: filePath,
        ...data,
        name: normalizedName,
        title: data.title || normalizedName,
        description: data.description || descriptionFromBody || `Instruction artifact: ${filePath}`,
        category: data.category || 'uncategorized'
    };
}

function extractProfileValidationIssues(markdown: string): string[] {
    const issues: string[] = [];
    let parsed: matter.GrayMatterFile<string>;
    try {
        parsed = matter(markdown);
    } catch (err) {
        issues.push(`Invalid frontmatter format: ${(err as Error).message}`);
        return issues;
    }
    const data = parsed.data as Record<string, any>;
    const body = parsed.content?.trim() || '';

    if (!data.id || typeof data.id !== 'string') {
        issues.push('Missing required frontmatter field: id');
    }
    if (!data.type || data.type !== 'profile') {
        issues.push('Frontmatter field `type` must be exactly `profile`');
    }
    if (!data.version || typeof data.version !== 'string') {
        issues.push('Missing required frontmatter field: version');
    }
    if (!data.name && !data.title) {
        issues.push('Frontmatter must include `name` or `title`');
    }
    if (!data.description || typeof data.description !== 'string') {
        issues.push('Missing required frontmatter field: description');
    }
    return issues;
}

function extractProfileAdvisoryWarnings(markdown: string): string[] {
    const warnings: string[] = [];
    try {
        const parsed = matter(markdown);
        const body = parsed.content?.trim() || '';
        if (!body || body.length < 60) {
            warnings.push('Profile body is short; consider adding more substantive behavior guidance');
        }
    } catch {
        // Ignore advisory extraction if frontmatter parse already failed in required checks.
    }
    return warnings;
}

function extractStandardValidationIssues(markdown: string): string[] {
    const issues: string[] = [];
    let parsed: matter.GrayMatterFile<string>;
    try {
        parsed = matter(markdown);
    } catch (err) {
        issues.push(`Invalid frontmatter format: ${(err as Error).message}`);
        return issues;
    }
    const data = parsed.data as Record<string, any>;

    if (!data.id || typeof data.id !== 'string') {
        issues.push('Missing required frontmatter field: id');
    }
    if (!data.type || data.type !== 'standard') {
        issues.push('Frontmatter field `type` must be exactly `standard`');
    }
    if (!data.version || typeof data.version !== 'string') {
        issues.push('Missing required frontmatter field: version');
    }
    if (!data.title && !data.name) {
        issues.push('Frontmatter must include `title` or `name`');
    }
    if (!data.category || typeof data.category !== 'string') {
        issues.push('Missing required frontmatter field: category');
    }
    if (!data.description || typeof data.description !== 'string') {
        issues.push('Missing required frontmatter field: description');
    }
    return issues;
}

function extractStandardAdvisoryWarnings(markdown: string): string[] {
    const warnings: string[] = [];
    try {
        const parsed = matter(markdown);
        const body = parsed.content?.trim() || '';
        if (!body || body.length < 80) {
            warnings.push('Standard body is short; include objective, rules, and application guidance');
        }
    } catch {
        // Ignore advisory extraction if parse already failed.
    }
    return warnings;
}

function sanitizeGeneratedMarkdown(content: string): string {
    // Strip fenced wrappers if model returns ```markdown ... ```
    let clean = content.trim().replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();

    const firstFence = clean.indexOf('---');
    if (firstFence > 0) {
        clean = clean.slice(firstFence).trim();
    }

    return clean;
}

function buildEnhancerSystemPrompt(): string {
    return [
        'You are enhancer, an expert prompt/profile editor for ENGAGEntic.',
        'Rewrite and improve a profile markdown document while preserving its original intent.',
        'Return only markdown. Do not use code fences. Do not add commentary.',
        'Output format requirements:',
        '1) Start with valid YAML frontmatter enclosed by ---',
        '2) Required fields: id, type, version, name or title, description',
        '3) type must be exactly: profile',
        '4) Keep standards/default_workflow/extends/includes fields when they exist',
        '5) Body must contain clear, practical role behavior guidance',
        '6) Keep it concise, production-minded, and implementation-oriented',
    ].join('\n');
}

function buildStandardEnhancerSystemPrompt(): string {
    return [
        'You are enhancer, an expert standards editor for ENGAGEntic.',
        'Rewrite and improve a standard markdown document while preserving original intent.',
        'Return only markdown. Do not use code fences. Do not add commentary.',
        'Output format requirements:',
        '1) Start with valid YAML frontmatter enclosed by ---',
        '2) Required fields: id, type, version, title or name, category, description',
        '3) type must be exactly: standard',
        '4) Body should include practical policy/rule guidance with clear usage context',
        '5) Keep it concise and implementation-oriented',
    ].join('\n');
}

async function generateEnhancedProfileMarkdown(markdown: string, model: string, repairIssues?: string[]): Promise<string> {
    const repairInstructions = repairIssues && repairIssues.length > 0
        ? `\n\nRepair the markdown to resolve these validation issues:\n- ${repairIssues.join('\n- ')}`
        : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
            model,
            stream: false,
            options: {
                temperature: 0.2
            },
            system: buildEnhancerSystemPrompt(),
            prompt: `Enhance this profile markdown and return the final markdown only:\n\n${markdown}${repairInstructions}`
        })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`Enhancer model request failed (${response.status})`);
    }

    const payload = await response.json();
    const content = sanitizeGeneratedMarkdown(String(payload?.response || ''));
    if (!content) {
        throw new Error('Enhancer returned empty content');
    }

    return content;
}

async function generateEnhancedProfileBody(markdown: string, model: string, repairIssues?: string[]): Promise<string> {
    const parsed = matter(markdown);
    const data = parsed.data as Record<string, any>;
    const body = parsed.content?.trim() || '';
    const repairInstructions = repairIssues && repairIssues.length > 0
        ? `\n\nFix these issues in the body guidance:\n- ${repairIssues.join('\n- ')}`
        : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
            model,
            stream: false,
            options: { temperature: 0.2 },
            system: [
                'You improve profile guidance for ENGAGEntic.',
                'Return only markdown body content. Do not return YAML frontmatter.',
                'Do not use code fences. Keep structure practical and concise.'
            ].join('\n'),
            prompt: `Profile metadata:\n${JSON.stringify(data, null, 2)}\n\nCurrent body:\n${body}${repairInstructions}`
        })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`Enhancer model request failed (${response.status})`);
    }

    const payload = await response.json();
    const content = sanitizeGeneratedMarkdown(String(payload?.response || ''));
    if (!content) {
        throw new Error('Enhancer returned empty content');
    }

    return content;
}

async function generateEnhancedStandardMarkdown(markdown: string, model: string, repairIssues?: string[]): Promise<string> {
    const repairInstructions = repairIssues && repairIssues.length > 0
        ? `\n\nRepair the markdown to resolve these validation issues:\n- ${repairIssues.join('\n- ')}`
        : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
            model,
            stream: false,
            options: {
                temperature: 0.2
            },
            system: buildStandardEnhancerSystemPrompt(),
            prompt: `Enhance this standard markdown and return the final markdown only:\n\n${markdown}${repairInstructions}`
        })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`Enhancer model request failed (${response.status})`);
    }

    const payload = await response.json();
    const content = sanitizeGeneratedMarkdown(String(payload?.response || ''));
    if (!content) {
        throw new Error('Enhancer returned empty content');
    }

    return content;
}

async function generateEnhancedStandardBody(markdown: string, model: string, repairIssues?: string[]): Promise<string> {
    const parsed = matter(markdown);
    const data = parsed.data as Record<string, any>;
    const body = parsed.content?.trim() || '';
    const repairInstructions = repairIssues && repairIssues.length > 0
        ? `\n\nFix these issues in the body guidance:\n- ${repairIssues.join('\n- ')}`
        : '';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
            model,
            stream: false,
            options: { temperature: 0.2 },
            system: [
                'You improve standards guidance for ENGAGEntic.',
                'Return only markdown body content. Do not return YAML frontmatter.',
                'Do not use code fences. Keep structure practical and concise.'
            ].join('\n'),
            prompt: `Standard metadata:\n${JSON.stringify(data, null, 2)}\n\nCurrent body:\n${body}${repairInstructions}`
        })
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`Enhancer model request failed (${response.status})`);
    }

    const payload = await response.json();
    const content = sanitizeGeneratedMarkdown(String(payload?.response || ''));
    if (!content) {
        throw new Error('Enhancer returned empty content');
    }

    return content;
}

function ensureProfileFrontmatterDefaults(markdown: string): string {
    try {
        const parsed = matter(markdown);
        const data = { ...(parsed.data as Record<string, any>) };
        if (!data.id || typeof data.id !== 'string') data.id = 'enhanced-profile';
        if (!data.type || data.type !== 'profile') data.type = 'profile';
        if (!data.version || typeof data.version !== 'string') data.version = '1.0.0';
        if (!data.name && !data.title) data.name = 'Enhanced Profile';
        if (!data.description || typeof data.description !== 'string') {
            data.description = 'Enhanced profile generated by enhancer agent.';
        }
        return matter.stringify(parsed.content || '', data).trim();
    } catch {
        return markdown;
    }
}

function ensureStandardFrontmatterDefaults(markdown: string): string {
    try {
        const parsed = parseArtifact(markdown);
        const data = { ...(parsed.data as Record<string, any>) };
        const content = (parsed.content || '').trim();
        const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
        const firstSentence = content
            .replace(/^#.*$/gm, '')
            .replace(/```[\s\S]*?```/g, '')
            .trim()
            .split('\n')
            .map(line => line.trim())
            .find(line => line.length > 0 && !line.startsWith('-') && !line.startsWith('*'));

        const slugify = (value: string) =>
            value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

        const inferredTitle = data.title || data.name || heading || 'Enhanced Standard';
        const inferredId = data.id || slugify(String(inferredTitle || 'enhanced-standard')) || 'enhanced-standard';

        if (!data.id || typeof data.id !== 'string') data.id = 'enhanced-standard';
        if (!data.type || data.type !== 'standard') data.type = 'standard';
        if (!data.version || typeof data.version !== 'string') data.version = String(data.version || '1.0.0');
        if (!data.title && !data.name) data.title = inferredTitle;
        data.id = inferredId;
        if (!data.category || typeof data.category !== 'string') data.category = 'general';
        if (!data.description || typeof data.description !== 'string') {
            data.description = String(firstSentence || `${inferredTitle} generated by enhancer agent.`);
        }
        return matter.stringify(content, data).trim();
    } catch {
        return markdown;
    }
}

function normalizeStandardMarkdownOutput(markdown: string): string {
    // Frontmatter is normalized for validity, while body remains model-driven.
    return ensureStandardFrontmatterDefaults(markdown);
}

async function enhanceProfileForScout(markdown: string): Promise<string> {
    const normalizedInput = ensureProfileFrontmatterDefaults(markdown);
    const tags = await getOllamaModelTags();
    const availableModels = resolveAvailableEnhancerModels(tags);
    if (availableModels.length === 0) {
        throw new Error('Scout cannot enhance profile: no enhancer generation models available in Ollama');
    }

    let rankedModels: string[] = [];
    try {
        rankedModels = (await rankEnhancerModels(normalizedInput)).filter(model => availableModels.includes(normalizeModelName(model)));
    } catch {
        rankedModels = [...availableModels];
    }

    const primaryModel = normalizeModelName(rankedModels[0] || availableModels[0]);
    const fallbackModel = normalizeModelName(rankedModels[1] || availableModels[1] || ENHANCER_FALLBACK_MODEL);

    let primary: string;
    try {
        const body = await generateEnhancedProfileBody(normalizedInput, primaryModel);
        const parsed = matter(normalizedInput);
        primary = ensureProfileFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim());
    } catch {
        primary = await generateEnhancedProfileMarkdown(normalizedInput, primaryModel);
    }
    const primaryIssues = extractProfileValidationIssues(primary);
    if (primaryIssues.length === 0) return primary;

    let repaired: string;
    try {
        const body = await generateEnhancedProfileBody(normalizedInput, fallbackModel, primaryIssues);
        const parsed = matter(normalizedInput);
        repaired = ensureProfileFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim());
    } catch {
        repaired = await generateEnhancedProfileMarkdown(normalizedInput, fallbackModel, primaryIssues);
    }
    const repairedIssues = extractProfileValidationIssues(repaired);
    if (repairedIssues.length > 0) {
        throw new Error(`Scout profile enhancement failed validation: ${repairedIssues.join('; ')}`);
    }
    return repaired;
}

async function enhanceStandardForScout(markdown: string): Promise<string> {
    const normalizedInput = ensureStandardFrontmatterDefaults(markdown);
    const tags = await getOllamaModelTags();
    const availableModels = resolveAvailableEnhancerModels(tags);
    if (availableModels.length === 0) {
        throw new Error('Scout cannot enhance standard: no enhancer generation models available in Ollama');
    }

    let rankedModels: string[] = [];
    try {
        rankedModels = (await rankEnhancerModels(normalizedInput)).filter(model => availableModels.includes(normalizeModelName(model)));
    } catch {
        rankedModels = [...availableModels];
    }

    const primaryModel = normalizeModelName(rankedModels[0] || availableModels[0]);
    const fallbackModel = normalizeModelName(rankedModels[1] || availableModels[1] || ENHANCER_FALLBACK_MODEL);

    let primary: string;
    try {
        const body = await generateEnhancedStandardBody(normalizedInput, primaryModel);
        const parsed = matter(normalizedInput);
        primary = normalizeStandardMarkdownOutput(
            ensureStandardFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim())
        );
    } catch {
        primary = normalizeStandardMarkdownOutput(await generateEnhancedStandardMarkdown(normalizedInput, primaryModel));
    }
    const primaryIssues = extractStandardValidationIssues(primary);
    if (primaryIssues.length === 0) return primary;

    let repaired: string;
    try {
        const body = await generateEnhancedStandardBody(normalizedInput, fallbackModel, primaryIssues);
        const parsed = matter(normalizedInput);
        repaired = normalizeStandardMarkdownOutput(
            ensureStandardFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim())
        );
    } catch {
        repaired = normalizeStandardMarkdownOutput(await generateEnhancedStandardMarkdown(normalizedInput, fallbackModel, primaryIssues));
    }
    const repairedIssues = extractStandardValidationIssues(repaired);
    if (repairedIssues.length > 0) {
        throw new Error(`Scout standard enhancement failed validation: ${repairedIssues.join('; ')}`);
    }
    return repaired;
}

async function embedText(text: string): Promise<number[]> {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
            prompt: text
        })
    });

    if (!response.ok) {
        throw new Error(`Embedding request failed (${response.status})`);
    }

    const payload = await response.json();
    const embedding = payload?.embedding || payload?.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Embedding response missing vector');
    }

    return embedding as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    if (len === 0) return -1;
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < len; i++) {
        const av = a[i];
        const bv = b[i];
        dot += av * bv;
        magA += av * av;
        magB += bv * bv;
    }
    if (magA === 0 || magB === 0) return -1;
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function getModelProfileEmbedding(model: string): Promise<number[]> {
    const cached = modelProfileEmbeddings.get(model);
    if (cached) return cached;
    const description = ENHANCER_MODEL_PROFILES[model] || model;
    const vec = await embedText(description);
    modelProfileEmbeddings.set(model, vec);
    return vec;
}

async function rankEnhancerModels(markdown: string): Promise<string[]> {
    const content = markdown.slice(0, 1800);
    const contentEmbedding = await embedText(content);
    const scored: { model: string; score: number }[] = [];

    for (const model of ENHANCER_MODELS) {
        const profileVec = await getModelProfileEmbedding(model);
        const score = cosineSimilarity(contentEmbedding, profileVec) + (ENHANCER_MODEL_SPEED_BONUS[model] || 0);
        scored.push({ model, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.model);
}

function normalizeModelName(name: string): string {
    return name.endsWith(':latest') ? name : `${name}:latest`;
}

function toSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64);
}

function normalizeTags(tags: any): string[] {
    if (Array.isArray(tags)) return tags.map(t => String(t).trim().toLowerCase()).filter(Boolean);
    if (typeof tags === 'string') {
        return tags
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(Boolean);
    }
    return [];
}

function isCommunitySpecification(spec: Artifact): boolean {
    const tags = normalizeTags((spec as any).tags);
    const category = String((spec as any).category || '').toLowerCase();
    const source = String((spec as any).source || '').toLowerCase();
    const pathName = String((spec as any).path || '').toLowerCase();
    return tags.includes('community') || category === 'community' || source === 'scout' || pathName.startsWith('community-spec-');
}

function isCommunityProfile(profile: Artifact): boolean {
    const tags = normalizeTags((profile as any).tags);
    const category = String((profile as any).category || '').toLowerCase();
    const source = String((profile as any).source || '').toLowerCase();
    const pathName = String((profile as any).path || '').toLowerCase();
    return tags.includes('community') || category === 'community' || source === 'scout' || pathName.startsWith('community-profile-');
}

function isCommunityStandard(standard: Artifact): boolean {
    const tags = normalizeTags((standard as any).tags);
    const category = String((standard as any).category || '').toLowerCase();
    const source = String((standard as any).source || '').toLowerCase();
    const pathName = String((standard as any).path || '').toLowerCase();
    return tags.includes('community') || category === 'community' || source === 'scout' || pathName.startsWith('community-standard-');
}

function hasSecuritySignals(text: string): boolean {
    const lower = text.toLowerCase();
    const keywords = ['security', 'secure', 'prompt injection', 'secrets', 'threat', 'safety', 'validation'];
    const hits = keywords.filter(k => lower.includes(k)).length;
    return hits >= 2;
}

function hasReusableSignals(text: string): boolean {
    const lower = text.toLowerCase();
    const keywords = [
        'best practices',
        'guidelines',
        'checklist',
        'patterns',
        'template',
        'framework',
        'policy',
        'playbook',
        'evaluation',
        'rubric',
        'governance',
        'guardrails'
    ];
    return keywords.some(k => lower.includes(k));
}

function hasOneTimeSetupSignals(text: string): boolean {
    const lower = text.toLowerCase();
    const patterns = [
        'quickstart',
        'getting started',
        'installation',
        'install ',
        'set up ',
        'setup ',
        'onboarding',
        'create an account',
        'sign up',
        'docker compose up',
        'npm install',
        'pip install',
        'brew install',
        'clone this repo',
        'run once',
        'one-time setup'
    ];
    return patterns.some(p => lower.includes(p));
}

function shouldRejectScoutRepo(repo: any, readme: string): { reject: boolean; reason: string } {
    const fullName = String(repo?.full_name || '').toLowerCase();
    const description = String(repo?.description || '').toLowerCase();
    const corpus = `${description}\n${readme}`.toLowerCase();

    const disallowedNameTokens = ['awesome-', '-awesome', 'jailbreak', 'prompt-leak', 'prompt-hack'];
    if (disallowedNameTokens.some(token => fullName.includes(token))) {
        return { reject: true, reason: 'disallowed_name_pattern' };
    }
    if (hasOneTimeSetupSignals(corpus)) {
        return { reject: true, reason: 'one_time_setup_content' };
    }
    if (!hasReusableSignals(corpus)) {
        return { reject: true, reason: 'missing_reusable_signals' };
    }
    return { reject: false, reason: '' };
}

function compactText(text: string, maxLen: number): string {
    const trimmed = text.replace(/\r/g, '').trim();
    return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}...` : trimmed;
}

async function githubJson(pathname: string): Promise<any> {
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'ENGAGEntic-Scout-Agent'
    };
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    const res = await fetch(`${GITHUB_API_URL}${pathname}`, { headers });
    if (!res.ok) {
        throw new Error(`GitHub API request failed (${res.status})`);
    }
    return res.json();
}

async function githubRaw(pathname: string): Promise<string> {
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.raw+json',
        'User-Agent': 'ENGAGEntic-Scout-Agent'
    };
    if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    const res = await fetch(`${GITHUB_API_URL}${pathname}`, { headers });
    if (!res.ok) {
        throw new Error(`GitHub raw request failed (${res.status})`);
    }
    return res.text();
}

async function selectScoutCandidates(limit: number, excludeRepos: Set<string>): Promise<ScoutSelectionResult> {
    const payload = await githubJson(`/search/repositories?q=${encodeURIComponent(SCOUT_REPO_QUERY)}&sort=stars&order=desc&per_page=30`);
    const items = Array.isArray(payload?.items) ? payload.items : [];
    const searchTotal = Number(payload?.total_count || 0);
    const candidates: ScoutCandidate[] = [];
    let scanned = 0;
    let skippedNoSecurity = 0;
    let skippedNotReusable = 0;
    let fetchErrors = 0;

    for (const repo of items) {
        if (candidates.length >= limit) break;
        const fullName = String(repo?.full_name || '');
        if (!fullName || excludeRepos.has(fullName)) continue;
        scanned += 1;
        try {
            const [owner, name] = fullName.split('/');
            if (!owner || !name) continue;
            const readme = await githubRaw(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/readme`);
            if (!hasSecuritySignals(readme)) {
                skippedNoSecurity += 1;
                continue;
            }
            if (shouldRejectScoutRepo(repo, readme).reject) {
                skippedNotReusable += 1;
                continue;
            }
            candidates.push({
                fullName,
                htmlUrl: String(repo?.html_url || ''),
                stars: Number(repo?.stargazers_count || 0),
                description: String(repo?.description || ''),
                readme
            });
        } catch {
            // Skip repos without accessible README or with API errors.
            fetchErrors += 1;
        }
    }

    return { candidates, scanned, skippedNoSecurity, skippedNotReusable, fetchErrors, searchTotal };
}

async function pathExists(p: string): Promise<boolean> {
    try {
        await fs.access(p);
        return true;
    } catch {
        return false;
    }
}

async function uniqueFilePath(baseDir: string, baseName: string): Promise<{ fileName: string; fullPath: string }> {
    let attempt = 0;
    while (attempt < 100) {
        const suffix = attempt === 0 ? '' : `-${attempt + 1}`;
        const fileName = `${baseName}${suffix}.md`;
        const fullPath = path.join(baseDir, fileName);
        if (!(await pathExists(fullPath))) {
            return { fileName, fullPath };
        }
        attempt += 1;
    }
    throw new Error(`Unable to allocate unique path for ${baseName}`);
}

async function ingestScoutCandidate(candidate: ScoutCandidate): Promise<void> {
    const slug = toSlug(candidate.fullName.replace('/', '-')) || `repo-${Date.now()}`;
    const profileId = `community-profile-${slug}`;
    const standardId = `community-standard-${slug}`;
    const specBaseName = `community-spec-${slug}`;
    const summary = compactText(candidate.readme.replace(/^#.*$/gm, '').replace(/```[\s\S]*?```/g, ''), 1400);

    const profileDraft = matter.stringify(
        [
            'You are a Community profile for secure AI development guidance.',
            'Use the associated standards to apply secure prompting practices.',
            `Source repository: ${candidate.htmlUrl}`
        ].join('\n\n'),
        {
            id: profileId,
            type: 'profile',
            version: '1.0.0',
            name: candidate.fullName,
            category: 'community',
            tags: ['Community'],
            description: compactText(candidate.description || `Profile derived from ${candidate.fullName}`, 180),
            source_repo: candidate.fullName
        }
    ).trim();

    const standardDraft = matter.stringify(
        [
            '## Objective',
            'Apply reliable and secure AI development prompting guidance derived from the source specification.',
            '',
            '## Standards',
            '- Validate assumptions and inputs.',
            '- Include explicit security and safety checks.',
            '- Keep implementation guidance concise and testable.',
            '',
            '## Source Excerpt',
            summary
        ].join('\n'),
        {
            id: standardId,
            type: 'standard',
            version: '1.0.0',
            title: candidate.fullName,
            category: 'community',
            tags: ['Community'],
            description: compactText(candidate.description || `Standard derived from ${candidate.fullName}`, 180),
            source_repo: candidate.fullName
        }
    ).trim();

    const profileMarkdown = await enhanceProfileForScout(profileDraft);
    const standardMarkdown = await enhanceStandardForScout(standardDraft);

    const specMarkdown = matter.stringify(
        [
            '## Objective',
            `Use this Community specification derived from ${candidate.fullName}.`,
            '',
            '## Source',
            `- Repository: ${candidate.htmlUrl}`,
            `- Stars: ${candidate.stars}`,
            '',
            '## Notes',
            'Community specification with linked profile and standard.'
        ].join('\n'),
        {
            type: 'specification',
            category: 'community',
            name: candidate.fullName,
            description: compactText(candidate.description || `Specification derived from ${candidate.fullName}`, 180),
            tags: ['Community'],
            source_repo: candidate.fullName,
            source_url: candidate.htmlUrl,
            source_stars: candidate.stars,
            profile: `${profileId}.md`,
            standards: [standardId]
        }
    ).trim();

    const profilePath = path.join(PATHS.profiles, `${profileId}.md`);
    const standardPath = path.join(PATHS.standards_registry, `${standardId}.md`);
    const uniqueSpec = await uniqueFilePath(PATHS.specifications, specBaseName);

    await fs.mkdir(path.dirname(profilePath), { recursive: true });
    await fs.mkdir(path.dirname(standardPath), { recursive: true });
    await fs.mkdir(path.dirname(uniqueSpec.fullPath), { recursive: true });

    await fs.writeFile(profilePath, profileMarkdown, 'utf-8');
    await fs.writeFile(standardPath, standardMarkdown, 'utf-8');
    await fs.writeFile(uniqueSpec.fullPath, specMarkdown, 'utf-8');
}

async function runScout(reason: string): Promise<void> {
    if (!SCOUT_ENABLED || scoutState.running) return;
    scoutState.running = true;
    scoutState.last_reason = reason;
    scoutState.last_error = null;
    scoutState.last_created = 0;
    scoutState.last_scanned = 0;
    scoutState.last_candidates = 0;
    scoutState.last_skipped_no_security = 0;
    scoutState.last_skipped_not_reusable = 0;
    scoutState.last_repo_fetch_errors = 0;
    scoutState.last_search_total = 0;
    scoutState.last_run_at = new Date().toISOString();

    try {
        const specs = await loaders.loadSpecs();
        const communitySpecs = specs.filter(isCommunitySpecification);
        const missing = SCOUT_TARGET_COUNT - communitySpecs.length;
        if (missing <= 0) return;

        const knownRepos = new Set(
            communitySpecs
                .map(s => String((s as any).source_repo || '').trim())
                .filter(Boolean)
        );
        const selection = await selectScoutCandidates(missing, knownRepos);
        scoutState.last_scanned = selection.scanned;
        scoutState.last_candidates = selection.candidates.length;
        scoutState.last_skipped_no_security = selection.skippedNoSecurity;
        scoutState.last_skipped_not_reusable = selection.skippedNotReusable;
        scoutState.last_repo_fetch_errors = selection.fetchErrors;
        scoutState.last_search_total = selection.searchTotal;
        for (const candidate of selection.candidates.slice(0, missing)) {
            await ingestScoutCandidate(candidate);
            scoutState.last_created += 1;
        }
    } catch (err) {
        scoutState.last_error = (err as Error).message;
        console.error('Scout agent error:', err);
    } finally {
        scoutState.running = false;
    }
}

function triggerScout(reason: string) {
    if (!SCOUT_ENABLED) return;
    setTimeout(() => {
        void runScout(reason);
    }, 0);
}

function resolveAvailableEnhancerModels(tags: string[]): string[] {
    const normalizedTags = new Set(tags.map(normalizeModelName));
    return ENHANCER_MODELS
        .map(normalizeModelName)
        .filter(model => normalizedTags.has(model));
}

async function getOllamaModelTags(): Promise<string[]> {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) {
        throw new Error(`Ollama tags request failed (${response.status})`);
    }
    const payload = await response.json();
    const models = Array.isArray(payload?.models) ? payload.models : [];
    return models
        .map((m: any) => String(m?.name || '').trim())
        .filter((name: string) => name.length > 0);
}

// Heath Check
app.get('/health', (req, res) => {
    res.json({ status: 'active', tool: 'ENGAGEntic Context Logic Engine', version: PLATFORM_VERSION });
});

// --- Generic Markdown Loader ---
const loadArtifacts = async (dir: string): Promise<Artifact[]> => {
    try {
        const files = await fs.readdir(dir, { recursive: true });
        const mdFiles = (files as string[]).filter(f => f.endsWith('.md'));

        const content = await Promise.all(mdFiles.map(async f => {
            const fullPath = path.join(dir, f);
            const rawContent = await fs.readFile(fullPath, 'utf-8');
            const parsed = parseArtifact(rawContent);
            const normalized = normalizeArtifactMetadata(f, parsed.data, parsed.content.trim());
            return {
                ...normalized,
                raw_content: rawContent,
                markdown_content: parsed.content.trim(),
                path: f
            } as Artifact;
        }));

        return content;
    } catch (err) {
        console.error(`Error loading from ${dir}:`, (err as Error).message);
        return [];
    }
};

const loaders = {
    loadProfiles: async () => {
        const profiles = await loadArtifacts(PATHS.profiles);
        profiles.forEach((p) => {
            const tags = normalizeTags((p as any).tags);
            const category = String((p as any).category || '').toLowerCase();
            const source = String((p as any).source || '').toLowerCase();
            p.is_community = tags.includes('community') || category === 'community' || source === 'scout';
        });
        return profiles;
    },
    loadStandards: async () => {
        const official = await loadArtifacts(PATHS.standards);
        const community = await loadArtifacts(PATHS.standards_registry);

        community.forEach(s => s.is_community = isCommunityStandard(s));
        official.forEach(s => s.is_community = false);

        const merged = new Map<string, Artifact>();
        community.forEach(s => merged.set(s.id, s)); // Load community first
        official.forEach(s => merged.set(s.id, s));  // Official overrides if collision

        return Array.from(merged.values());
    },
    loadSpecs: async () => {
        const specs = await loadArtifacts(PATHS.specifications);
        specs.forEach((s) => {
            s.is_community = isCommunitySpecification(s);
        });
        return specs;
    },
    loadWorkflows: () => loadArtifacts(PATHS.workflows),
};

// --- APIs ---

// ── GET (read all) ──────────────────────────────────────────────
app.get('/api/standards', async (req, res) => {
    const data = await loaders.loadStandards();
    res.json(data);
});

app.get('/api/profiles', async (req, res) => {
    const data = await loaders.loadProfiles();
    res.json(data);
});

app.get('/api/specifications', async (req, res) => {
    const data = await loaders.loadSpecs();
    res.json(data);
});

app.get('/api/workflows', async (req, res) => {
    const data = await loaders.loadWorkflows();
    res.json(data);
});

app.post('/api/agents/enhancer/profile', async (req, res) => {
    const markdown = String(req.body?.markdown || '').trim();
    if (!markdown) {
        return res.status(400).json({ error: 'markdown is required' });
    }
    const normalizedInput = ensureProfileFrontmatterDefaults(markdown);

    try {
        const tags = await getOllamaModelTags();
        const availableModels = resolveAvailableEnhancerModels(tags);
        if (availableModels.length === 0) {
            return res.status(503).json({ error: 'No enhancer generation models available in Ollama' });
        }
        let rankedModels: string[] = [];
        try {
            rankedModels = (await rankEnhancerModels(normalizedInput)).filter(model => availableModels.includes(normalizeModelName(model)));
        } catch (err) {
            console.warn('Enhancer model ranking unavailable, using defaults:', (err as Error).message);
            rankedModels = [...availableModels];
        }
        const primaryModel = normalizeModelName(rankedModels[0] || availableModels[0]);
        const fallbackModel = normalizeModelName(rankedModels[1] || availableModels[1] || ENHANCER_FALLBACK_MODEL);

        let primary: string;
        try {
            const body = await generateEnhancedProfileBody(normalizedInput, primaryModel);
            const parsed = matter(normalizedInput);
            primary = ensureProfileFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim());
        } catch {
            primary = await generateEnhancedProfileMarkdown(normalizedInput, primaryModel);
        }
        const primaryIssues = extractProfileValidationIssues(primary);
        if (primaryIssues.length === 0) {
            const advisories = extractProfileAdvisoryWarnings(primary);
            return res.json({
                enhanced_markdown: primary,
                model: primaryModel,
                model_ranking: rankedModels,
                warnings: advisories
            });
        }

        let repaired: string;
        try {
            const body = await generateEnhancedProfileBody(normalizedInput, fallbackModel, primaryIssues);
            const parsed = matter(normalizedInput);
            repaired = ensureProfileFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim());
        } catch {
            repaired = await generateEnhancedProfileMarkdown(normalizedInput, fallbackModel, primaryIssues);
        }
        const repairedIssues = extractProfileValidationIssues(repaired);
        if (repairedIssues.length > 0) {
            return res.status(422).json({
                error: 'Enhancer output failed profile format validation.',
                warnings: repairedIssues,
                model_ranking: rankedModels
            });
        }

        const advisories = extractProfileAdvisoryWarnings(repaired);
        return res.json({
            enhanced_markdown: repaired,
            model: fallbackModel,
            warnings: [...primaryIssues, ...advisories],
            model_ranking: rankedModels
        });
    } catch (err) {
        console.error('Enhancer agent error:', err);
        return res.status(500).json({ error: (err as Error).message });
    }
});

app.post('/api/agents/enhancer/standard', async (req, res) => {
    const markdown = String(req.body?.markdown || '').trim();
    if (!markdown) {
        return res.status(400).json({ error: 'markdown is required' });
    }
    const normalizedInput = ensureStandardFrontmatterDefaults(markdown);

    try {
        const tags = await getOllamaModelTags();
        const availableModels = resolveAvailableEnhancerModels(tags);
        if (availableModels.length === 0) {
            return res.status(503).json({ error: 'No enhancer generation models available in Ollama' });
        }
        let rankedModels: string[] = [];
        try {
            rankedModels = (await rankEnhancerModels(normalizedInput)).filter(model => availableModels.includes(normalizeModelName(model)));
        } catch (err) {
            console.warn('Enhancer model ranking unavailable, using defaults:', (err as Error).message);
            rankedModels = [...availableModels];
        }
        const primaryModel = normalizeModelName(rankedModels[0] || availableModels[0]);
        const fallbackModel = normalizeModelName(rankedModels[1] || availableModels[1] || ENHANCER_FALLBACK_MODEL);

        let primary: string;
        try {
            const body = await generateEnhancedStandardBody(normalizedInput, primaryModel);
            const parsed = matter(normalizedInput);
            primary = normalizeStandardMarkdownOutput(
                ensureStandardFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim())
            );
        } catch {
            primary = normalizeStandardMarkdownOutput(await generateEnhancedStandardMarkdown(normalizedInput, primaryModel));
        }
        const primaryIssues = extractStandardValidationIssues(primary);
        if (primaryIssues.length === 0) {
            const advisories = extractStandardAdvisoryWarnings(primary);
            return res.json({
                enhanced_markdown: primary,
                model: primaryModel,
                model_ranking: rankedModels,
                warnings: advisories
            });
        }

        let repaired: string;
        try {
            const body = await generateEnhancedStandardBody(normalizedInput, fallbackModel, primaryIssues);
            const parsed = matter(normalizedInput);
            repaired = normalizeStandardMarkdownOutput(
                ensureStandardFrontmatterDefaults(matter.stringify(body, parsed.data as Record<string, any>).trim())
            );
        } catch {
            repaired = normalizeStandardMarkdownOutput(await generateEnhancedStandardMarkdown(normalizedInput, fallbackModel, primaryIssues));
        }
        const repairedIssues = extractStandardValidationIssues(repaired);
        if (repairedIssues.length > 0) {
            return res.status(422).json({
                error: 'Enhancer output failed standard format validation.',
                warnings: repairedIssues,
                model_ranking: rankedModels
            });
        }

        const advisories = extractStandardAdvisoryWarnings(repaired);
        return res.json({
            enhanced_markdown: repaired,
            model: fallbackModel,
            warnings: [...primaryIssues, ...advisories],
            model_ranking: rankedModels
        });
    } catch (err) {
        console.error('Enhancer agent error (standard):', err);
        return res.status(500).json({ error: (err as Error).message });
    }
});

app.get('/api/agents/enhancer/health', async (req, res) => {
    try {
        const tags = await getOllamaModelTags();
        const hasEmbeddingModel = tags.includes(EMBEDDING_MODEL);
        const availableGenerationModels = resolveAvailableEnhancerModels(tags);
        const isActive = hasEmbeddingModel && availableGenerationModels.length > 0;

        return res.json({
            status: isActive ? 'active' : 'degraded',
            version: PLATFORM_VERSION,
            enhancer_active: isActive,
            embedding_model: EMBEDDING_MODEL,
            available_generation_models: availableGenerationModels,
            configured_generation_models: ENHANCER_MODELS.map(normalizeModelName)
        });
    } catch (err) {
        return res.status(503).json({
            status: 'down',
            enhancer_active: false,
            error: (err as Error).message
        });
    }
});

app.get('/api/agents/scout/health', async (req, res) => {
    try {
        const specs = await loaders.loadSpecs();
        const communityCount = specs.filter(isCommunitySpecification).length;
        return res.json({
            status: SCOUT_ENABLED ? 'active' : 'disabled',
            scout_enabled: SCOUT_ENABLED,
            scout_running: scoutState.running,
            scout_target_count: SCOUT_TARGET_COUNT,
            community_spec_count: communityCount,
            deficit: Math.max(0, SCOUT_TARGET_COUNT - communityCount),
            last_run_at: scoutState.last_run_at,
            last_reason: scoutState.last_reason,
            last_created: scoutState.last_created,
            last_scanned: scoutState.last_scanned,
            last_candidates: scoutState.last_candidates,
            last_skipped_no_security: scoutState.last_skipped_no_security,
            last_skipped_not_reusable: scoutState.last_skipped_not_reusable,
            last_repo_fetch_errors: scoutState.last_repo_fetch_errors,
            last_search_total: scoutState.last_search_total,
            repo_query: scoutState.repo_query,
            last_error: scoutState.last_error
        });
    } catch (err) {
        return res.status(500).json({
            status: 'error',
            scout_enabled: SCOUT_ENABLED,
            scout_running: scoutState.running,
            error: (err as Error).message
        });
    }
});

// ── CRUD helper ─────────────────────────────────────────────────
function safeFilename(name: string): string {
    return name.replace(/[^a-z0-9\-_.\/]/gi, '-').replace(/\.md$/i, '') + '.md';
}

function resolveArtifactPath(basePath: string, relativeId: string): string {
    // Normalise — strip any leading slash, resolve within basePath
    // Guarantee .md extension so we never write to an extension-less file
    const rel = relativeId.replace(/^\/+/, '');
    const withExt = rel.endsWith('.md') ? rel : rel + '.md';
    const full = path.resolve(path.join(basePath, withExt));
    if (!full.startsWith(path.resolve(basePath))) {
        throw new Error('Path traversal detected');
    }
    return full;
}

// ── Profiles CRUD ───────────────────────────────────────────────
app.post('/api/profiles', async (req, res) => {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
    try {
        const target = path.join(PATHS.profiles, safeFilename(filename));
        await fs.writeFile(target, content, 'utf-8');
        res.status(201).json({ id: safeFilename(filename), message: 'Profile created' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.put('/api/profiles/*', async (req, res) => {
    const id = (req.params as any)[0] as string;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    try {
        const target = resolveArtifactPath(PATHS.profiles, id);
        await fs.writeFile(target, content, 'utf-8');
        res.json({ message: 'Profile updated' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.delete('/api/profiles/*', async (req, res) => {
    const id = (req.params as any)[0] as string;
    try {
        const target = resolveArtifactPath(PATHS.profiles, id);
        await fs.unlink(target);
        res.json({ message: 'Profile deleted' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// ── Standards CRUD (writes to standards-library by default, registry if body.registry=true) ─
app.post('/api/standards', async (req, res) => {
    const { filename, content, registry } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
    try {
        const baseDir = registry ? PATHS.standards_registry : PATHS.standards;
        const target = path.join(baseDir, safeFilename(filename));
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, content, 'utf-8');
        res.status(201).json({ id: safeFilename(filename), message: 'Standard created' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.put('/api/standards/*', async (req, res) => {
    const id = (req.params as any)[0] as string;
    const { content, registry } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    try {
        const baseDir = registry ? PATHS.standards_registry : PATHS.standards;
        const target = resolveArtifactPath(baseDir, id);
        await fs.writeFile(target, content, 'utf-8');
        res.json({ message: 'Standard updated' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.delete('/api/standards/*', async (req, res) => {
    const id = (req.params as any)[0] as string;
    try {
        // Try library first, then registry
        let target: string;
        try {
            target = resolveArtifactPath(PATHS.standards, id);
            await fs.access(target);
        } catch {
            target = resolveArtifactPath(PATHS.standards_registry, id);
        }
        await fs.unlink(target);
        res.json({ message: 'Standard deleted' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// ── Specifications CRUD ──────────────────────────────────────────
app.post('/api/specifications', async (req, res) => {
    const { filename, content } = req.body;
    if (!filename || !content) return res.status(400).json({ error: 'filename and content required' });
    try {
        const target = path.join(PATHS.specifications, safeFilename(filename));
        await fs.writeFile(target, content, 'utf-8');
        res.status(201).json({ id: safeFilename(filename), message: 'Specification created' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.put('/api/specifications/*', async (req, res) => {
    const id = (req.params as any)[0] as string;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });
    try {
        const target = resolveArtifactPath(PATHS.specifications, id);
        await fs.writeFile(target, content, 'utf-8');
        res.json({ message: 'Specification updated' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.delete('/api/specifications/*', async (req, res) => {
    const id = (req.params as any)[0] as string;
    try {
        const target = resolveArtifactPath(PATHS.specifications, id);
        let deletedWasCommunity = false;
        try {
            const raw = await fs.readFile(target, 'utf-8');
            const parsed = parseArtifact(raw);
            const tags = normalizeTags((parsed.data as any)?.tags);
            const category = String((parsed.data as any)?.category || '').toLowerCase();
            deletedWasCommunity = tags.includes('community') || category === 'community';
        } catch {
            deletedWasCommunity = false;
        }
        await fs.unlink(target);
        if (deletedWasCommunity) {
            triggerScout('community_spec_deleted');
        }
        res.json({ message: 'Specification deleted' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

app.post('/api/community/purge', async (req, res) => {
    try {
        const [profiles, standards, specs] = await Promise.all([
            loaders.loadProfiles(),
            loaders.loadStandards(),
            loaders.loadSpecs()
        ]);

        const communityProfiles = profiles.filter(isCommunityProfile);
        const communityStandards = standards.filter(isCommunityStandard);
        const communitySpecs = specs.filter(isCommunitySpecification);

        const deleted = {
            profiles: 0,
            standards: 0,
            specifications: 0
        };

        for (const p of communityProfiles) {
            const target = resolveArtifactPath(PATHS.profiles, p.path || p.id);
            try {
                await fs.unlink(target);
                deleted.profiles += 1;
            } catch {
                // Continue purge even if one file is already missing.
            }
        }

        for (const s of communityStandards) {
            const baseDir = String((s as any).path || '').startsWith('community-standard-')
                ? PATHS.standards_registry
                : PATHS.standards_registry;
            const target = resolveArtifactPath(baseDir, s.path || s.id);
            try {
                await fs.unlink(target);
                deleted.standards += 1;
            } catch {
                // Continue purge even if one file is already missing.
            }
        }

        for (const sp of communitySpecs) {
            const target = resolveArtifactPath(PATHS.specifications, sp.path || sp.id);
            try {
                await fs.unlink(target);
                deleted.specifications += 1;
            } catch {
                // Continue purge even if one file is already missing.
            }
        }

        triggerScout('community_purge');
        return res.json({
            message: 'Community artifacts purged. Scout refill triggered.',
            deleted
        });
    } catch (err) {
        return res.status(500).json({ error: (err as Error).message });
    }
});



// --- Session Composition Engine (Source of Truth) ---
app.post('/api/session/compose', async (req, res) => {
    try {
        const ctx = await composeContext(req.body, loaders);
        let sessionId: string | null = null;
        let persistenceStatus: 'stored' | 'skipped' = 'stored';

        try {
            const result = await pool.query(
                'INSERT INTO context_sessions (profile_id, specification_id, workflow_id, user_task, assembled_prompt) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [req.body.profile_id, req.body.specification_id, req.body.workflow_id, req.body.user_task, ctx.full_composed_prompt]
            );
            sessionId = result.rows[0].id;
        } catch (err) {
            const code = (err as any)?.code;
            if (code === TABLE_MISSING) {
                persistenceStatus = 'skipped';
                console.warn('Persistence skipped: context_sessions table missing.');
            } else {
                throw err;
            }
        }

        res.json({
            session_id: sessionId,
            persistence_status: persistenceStatus,
            prompt: ctx.full_composed_prompt, // Legacy support for playground UI
            layers: ctx.layers,
            normalized_context: ctx
        });
    } catch (err) {
        console.error("Composition Error:", err);
        res.status(500).json({ error: (err as Error).message });
    }
});

// --- Type guard: detect pre-composed NormalizedContext vs raw selection inputs ---
function isNormalizedContext(body: any): body is NormalizedContext {
    return (
        body !== null &&
        typeof body === 'object' &&
        typeof body.full_composed_prompt === 'string' &&
        typeof body.system_prompt === 'string' &&
        typeof body.developer_prompt === 'string'
    );
}

// --- Universal Format Rendering API ---
// Accepts EITHER:
//   A) Raw composition inputs { profile_id, standards[], ... } → composes then adapts
//   B) Pre-composed NormalizedContext (e.g. from CLI pipe) → adapts directly, no recomposition
app.post('/api/context/render', async (req, res) => {
    const format = req.query.format || 'plain';

    try {
        const ctx: NormalizedContext = isNormalizedContext(req.body)
            ? req.body                                  // B: already normalized — skip composition
            : await composeContext(req.body, loaders);  // A: raw inputs — compose first

        try {
            const output = renderWithAdapter(ctx, format as string);
            if (typeof output === 'string') {
                return res.send(output);
            }
            return res.json(output);
        } catch (err) {
            // Fallback for plain if adapter fails or is default
            return res.send(ctx.full_composed_prompt);
        }
    } catch (err) {
        console.error("Render Error:", err);
        res.status(500).json({ error: (err as Error).message });
    }
});

// --- History API ---
app.get('/api/sessions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM context_sessions ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        if ((err as any)?.code === TABLE_MISSING) {
            return res.json([]);
        }
        res.status(500).json({ error: (err as Error).message });
    }
});

app.get('/api/sessions/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM context_sessions WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) {
        if ((err as any)?.code === TABLE_MISSING) {
            return res.status(404).json({ error: 'Session history unavailable. Schema not initialized.' });
        }
        res.status(500).json({ error: (err as Error).message });
    }
});

app.listen(port, () => {
    console.log(`ENGAGEntic Context Logic Engine running on port ${port}`);
    if (SCOUT_ENABLED) {
        triggerScout('startup');
        setInterval(() => {
            triggerScout('interval');
        }, SCOUT_INTERVAL_MS);
    }
});
