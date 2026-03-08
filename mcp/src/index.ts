import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

/**
 * ENGAGEntic MCP Server
 * Exposes archetypal context artifacts and composition tools to AI agents.
 */

const BASE_PATH = process.env.ENGAGENTIC_PATH || path.join(process.cwd(), "..");
const MANIFEST_PATH = path.join(BASE_PATH, "artifact_manifest.json");

const server = new Server(
    {
        name: "engagentic-mcp",
        version: "1.0.0",
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

/**
 * Helper to load the manifest
 */
async function loadManifest() {
    try {
        const data = await fs.readFile(MANIFEST_PATH, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
}

/**
 * Resources: Artifacts from the registry
 */
server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const manifest = await loadManifest();
    return {
        resources: manifest.map((artifact: any) => ({
            uri: `engagentic://artifacts/${artifact.type}/${artifact.id}`,
            name: artifact.title,
            description: artifact.description,
            mimeType: "text/markdown",
        })),
    };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = new URL(request.params.uri);
    const pathParts = uri.pathname.split("/").filter(Boolean); // artifacts, type, id
    const artifactId = pathParts[pathParts.length - 1];

    const manifest = await loadManifest();
    const artifact = manifest.find((a: any) => a.id === artifactId);

    if (!artifact) {
        throw new Error(`Artifact not found: ${artifactId}`);
    }

    const fullPath = path.join(BASE_PATH, artifact.file_path);
    const content = await fs.readFile(fullPath, "utf-8");

    return {
        contents: [
            {
                uri: request.params.uri,
                mimeType: "text/markdown",
                text: content,
            },
        ],
    };
});

/**
 * Tools: Composition and Rendering
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "compose_context",
                description: "Compose a normalized context payload using ENGAGEntic artifacts.",
                inputSchema: {
                    type: "object",
                    properties: {
                        profile_id: { type: "string" },
                        standards: { type: "array", items: { type: "string" } },
                        specification_id: { type: "string" },
                        workflow_id: { type: "string" },
                        user_task: { type: "string" },
                    },
                },
            },
            {
                name: "render_context",
                description: "Render a normalized context into a specific provider format (openai, anthropic, plain).",
                inputSchema: {
                    type: "object",
                    properties: {
                        context: { type: "object" },
                        format: { type: "string", enum: ["plain", "openai", "anthropic", "generic", "json"] },
                    },
                    required: ["context", "format"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // These calls will be proxied to the ENGAGEntic Core API
    const CORE_URL = process.env.CORE_URL || "http://localhost:9091";

    switch (name) {
        case "compose_context": {
            const response = await fetch(`${CORE_URL}/api/session/compose`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args),
            });
            const data = await response.json();
            return {
                content: [{ type: "text", text: JSON.stringify(data.normalized_context, null, 2) }],
            };
        }
        case "render_context": {
            const response = await fetch(`${CORE_URL}/api/context/render?format=${args?.format}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(args?.context),
            });
            const data = await response.text();
            return {
                content: [{ type: "text", text: data }],
            };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ENGAGEntic MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
