import { NormalizedContext, ContextLayer } from './types';
import crypto from 'crypto';

export function normalizeContext(
    layers: {
        profile: ContextLayer | null;
        standards: ContextLayer[];
        specification: ContextLayer | null;
        workflow: ContextLayer | null;
        task: string;
    },
    metadata: {
        source_files: string[];
        template_names: string[];
        artifact_lineage: string[];
        artifact_versions: Record<string, string>;
        composition_trace: string[];
    }
): NormalizedContext {
    const id = crypto.randomUUID();

    // System Prompt: Profile Baseline
    const system_prompt = layers.profile ? `### ROLE: ${layers.profile.name}\n${layers.profile.content}` : '';

    // Developer Prompt: Standards, Specs, and Workflow
    const devSections: string[] = [];
    if (layers.standards.length > 0) {
        const stdText = layers.standards.map(s => `* ${s.name}:\n${s.content}`).join('\n\n');
        devSections.push(`### STANDARDS\n${stdText}`);
    }
    if (layers.specification) {
        devSections.push(`### SPECIFICATION\n${layers.specification.content}`);
    }
    if (layers.workflow) {
        devSections.push(`### WORKFLOW GUIDANCE\n${layers.workflow.content}`);
    }
    const developer_prompt = devSections.join('\n\n---\n\n');

    // User Prompt: Specific Task
    const user_prompt = layers.task ? `### USER TASK\n${layers.task}` : '';

    // Monolithic Fallback
    const full_composed_prompt = [system_prompt, developer_prompt, user_prompt]
        .filter(s => s.length > 0)
        .join('\n\n---\n\n');

    return {
        id,
        version: "1.0.0",
        profile: layers.profile,
        standards: layers.standards,
        specification: layers.specification,
        workflow: layers.workflow,
        task: layers.task,
        system_prompt,
        developer_prompt,
        user_prompt,
        full_composed_prompt,
        layers,
        metadata: {
            timestamp: new Date().toISOString(),
            source_files: metadata.source_files,
            template_names: metadata.template_names,
            format_version: "1.0.0",
            artifact_lineage: metadata.artifact_lineage,
            artifact_versions: metadata.artifact_versions,
            composition_trace: metadata.composition_trace,
            context_version: "1.0.0"
        }
    };
}
