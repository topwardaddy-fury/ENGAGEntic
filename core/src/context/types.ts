export interface Artifact {
    id: string;
    path: string;
    type: 'profile' | 'standard' | 'specification' | 'workflow' | 'task';
    markdown_content: string;
    name: string;
    title: string;
    description: string;
    version: string;
    extends?: string;
    includes?: string[];
    category?: string;
    tags?: string[];
    compatibility?: string[];
    is_community?: boolean;
    [key: string]: any;
}

export interface ContextLayer {
    name: string;
    content: string;
}

export interface NormalizedContext {
    id: string;
    version: string;
    profile: ContextLayer | null;
    standards: ContextLayer[];
    specification: ContextLayer | null;
    workflow: ContextLayer | null;
    task: string;
    system_prompt: string;
    developer_prompt: string;
    user_prompt: string;
    full_composed_prompt: string;
    layers: {
        profile: ContextLayer | null;
        standards: ContextLayer[];
        specification: ContextLayer | null;
        workflow: ContextLayer | null;
        task: string;
    };
    metadata: {
        timestamp: string;
        source_files: string[];
        template_names: string[];
        format_version: string;
        artifact_lineage: string[];
        artifact_versions: Record<string, string>;
        composition_trace: string[];
        context_version: string;
    };
}

export interface ChatMessage {
    role: 'system' | 'developer' | 'user' | 'assistant';
    content: string;
}

export interface AnthropicPayload {
    system: string;
    messages: ChatMessage[];
}

export interface GenericContext {
    system_prompt: string;
    developer_prompt: string;
    user_prompt: string;
}
