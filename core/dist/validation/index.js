"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArtifactValidator = void 0;
const gray_matter_1 = __importDefault(require("gray-matter"));
class ArtifactValidator {
    static validate(content, filePath) {
        const issues = [];
        const { data } = (0, gray_matter_1.default)(content);
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
    static validateRegistry(manifest) {
        const issues = [];
        const ids = new Set();
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
                entry.includes.forEach((inclId) => {
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
exports.ArtifactValidator = ArtifactValidator;
