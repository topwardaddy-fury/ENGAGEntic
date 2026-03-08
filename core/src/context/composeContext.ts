import { Artifact, NormalizedContext } from './types';
import { normalizeContext } from './normalizeContext';

export async function composeContext(
    params: {
        profile_id?: string;
        standards?: string[];
        specification_id?: string;
        workflow_id?: string;
        user_task?: string;
    },
    loaders: {
        loadProfiles: () => Promise<Artifact[]>;
        loadStandards: () => Promise<Artifact[]>;
        loadSpecs: () => Promise<Artifact[]>;
        loadWorkflows: () => Promise<Artifact[]>;
    }
): Promise<NormalizedContext> {
    const { profile_id, standards: selectedStandardIds, specification_id, workflow_id, user_task } = params;

    const layers: any = {
        profile: null,
        standards: [],
        specification: null,
        workflow: null,
        task: user_task || ''
    };

    const sourceFiles: string[] = [];
    const templateNames: string[] = [];
    const lineage: string[] = [];
    const versions: Record<string, string> = {};
    const trace: string[] = [];

    const allArtifacts = [
        ...(await loaders.loadProfiles()),
        ...(await loaders.loadStandards()),
        ...(await loaders.loadSpecs()),
        ...(await loaders.loadWorkflows())
    ];

    async function resolveArtifact(idOrPath: string, visited: Set<string> = new Set()): Promise<Artifact | null> {
        if (visited.has(idOrPath)) {
            throw new Error(`Circular dependency detected: ${Array.from(visited).join(' -> ')} -> ${idOrPath}`);
        }
        visited.add(idOrPath);

        const artifact = allArtifacts.find(a => a.id === idOrPath || a.path === idOrPath);
        if (!artifact) {
            trace.push(`Unresolved: ${idOrPath}`);
            return null;
        }

        trace.push(`Resolved: ${artifact.type}:${artifact.id}`);
        lineage.push(artifact.id);
        versions[artifact.id] = artifact.version || '1.0.0';
        sourceFiles.push(artifact.path);
        templateNames.push(artifact.name || artifact.id);

        return artifact;
    }

    async function processIncludes(artifact: Artifact, visited: Set<string>) {
        if (artifact.includes && Array.isArray(artifact.includes)) {
            for (const inclId of artifact.includes) {
                const incl = await resolveArtifact(inclId, new Set(visited));
                if (incl) {
                    if (incl.type === 'standard' && !layers.standards.some((s: any) => s.name === `Standard: ${incl.name || incl.id}`)) {
                        layers.standards.push({ name: `Standard: ${incl.name || incl.id}`, content: incl.markdown_content });
                        await processIncludes(incl, visited);
                    }
                }
            }
        }
    }

    // 1. Resolve Profile Inheritance
    if (profile_id) {
        let currentProfileId: string | undefined = profile_id;
        const profileStack: Artifact[] = [];
        const visitedProfiles = new Set<string>();

        while (currentProfileId) {
            const profile = await resolveArtifact(currentProfileId, visitedProfiles);
            if (!profile) break;
            profileStack.unshift(profile); // Parent first
            currentProfileId = profile.extends;
        }

        for (const p of profileStack) {
            layers.profile = { name: p.name || p.id, content: p.markdown_content };
            await processIncludes(p, visitedProfiles);
        }
    }

    // 2. Resolve Explicit Standards
    if (selectedStandardIds && Array.isArray(selectedStandardIds)) {
        for (const id of selectedStandardIds) {
            const std = await resolveArtifact(id);
            if (std) {
                if (!layers.standards.some((s: any) => s.name === `Standard: ${std.name || std.id}`)) {
                    layers.standards.push({ name: `Standard: ${std.name || std.id}`, content: std.markdown_content });
                    await processIncludes(std, new Set([std.id]));
                }
            }
        }
    }

    // 3. Resolve Spec
    if (specification_id) {
        const spec = await resolveArtifact(specification_id);
        if (spec) {
            layers.specification = { name: spec.name || spec.id, content: spec.markdown_content };
            await processIncludes(spec, new Set([spec.id]));
        }
    }

    // 4. Resolve Workflow
    if (workflow_id) {
        const wf = await resolveArtifact(workflow_id);
        if (wf) {
            layers.workflow = { name: wf.name || wf.id, content: wf.markdown_content };
            await processIncludes(wf, new Set([wf.id]));
        }
    }

    return normalizeContext(layers, {
        source_files: Array.from(new Set(sourceFiles)),
        template_names: Array.from(new Set(templateNames)),
        artifact_lineage: Array.from(new Set(lineage)),
        artifact_versions: versions,
        composition_trace: trace
    });
}
