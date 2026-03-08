import matter from 'gray-matter';
import { Artifact } from '../context/types';

export interface ValidationIssue {
    file: string;
    severity: 'error' | 'warning';
    message: string;
    field?: string;
}

export class ArtifactValidator {
    static validate(content: string, filePath: string): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const { data } = matter(content);

        // Required Fields
        const required = ['id', 'type', 'version'];
        required.forEach(field => {
            if (!data[field]) {
                issues.push({
                    file: filePath,
                    severity: 'error',
                    message: `Missing required frontmatter field: ${field}`,
                    field
                });
            }
        });

        // Title/Name Check
        if (!data.title && !data.name) {
            issues.push({
                file: filePath,
                severity: 'error',
                message: `Artifact must have either a 'title' or 'name' field.`,
            });
        }

        // Type Safety
        const validTypes = ['profile', 'standard', 'specification', 'workflow', 'task'];
        if (data.type && !validTypes.includes(data.type)) {
            issues.push({
                file: filePath,
                severity: 'error',
                message: `Invalid artifact type: ${data.type}. Must be one of: ${validTypes.join(', ')}`,
                field: 'type'
            });
        }

        // Circular Dependency (Self-reference)
        if (data.extends === data.id) {
            issues.push({
                file: filePath,
                severity: 'error',
                message: `Artifact cannot extend itself.`,
                field: 'extends'
            });
        }

        if (data.includes && Array.isArray(data.includes) && data.includes.includes(data.id)) {
            issues.push({
                file: filePath,
                severity: 'error',
                message: `Artifact cannot include itself.`,
                field: 'includes'
            });
        }

        return issues;
    }

    static validateRegistry(manifest: any[]): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const ids = new Set<string>();

        manifest.forEach(entry => {
            // Duplicate IDs
            if (ids.has(entry.id)) {
                issues.push({
                    file: entry.file_path,
                    severity: 'error',
                    message: `Duplicate artifact ID detected: ${entry.id}`,
                    field: 'id'
                });
            }
            ids.add(entry.id);

            // Inheritance Check
            if (entry.extends && !manifest.some(e => e.id === entry.extends)) {
                issues.push({
                    file: entry.file_path,
                    severity: 'warning',
                    message: `Artifact extends unknown ID: ${entry.extends}`,
                    field: 'extends'
                });
            }

            // Includes Check
            if (entry.includes && Array.isArray(entry.includes)) {
                entry.includes.forEach((inclId: string) => {
                    if (!manifest.some(e => e.id === inclId)) {
                        issues.push({
                            file: entry.file_path,
                            severity: 'warning',
                            message: `Artifact includes unknown ID: ${inclId}`,
                            field: 'includes'
                        });
                    }
                });
            }
        });

        return issues;
    }
}
