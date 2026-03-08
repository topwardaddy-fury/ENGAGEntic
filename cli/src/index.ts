#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
    .name('engagentic')
    .description('ENGAGEntic - The Framework-Agnostic Context Composition CLI')
    .version('1.0.0');

const API_URL = process.env.API_URL || 'http://localhost:9091/api';

// --- Command 1: Standards List ---
program
    .command('standards [action]')
    .description('Manage or view standards (e.g. engagentic standards list)')
    .option('--registry', 'Only show registry standards')
    .action(async (action, options) => {
        if (action === 'list' || !action) {
            try {
                const res = await fetch(`${API_URL}/standards`);
                if (!res.ok) throw new Error('Failed to fetch from engine');
                const data: any[] = await res.json();

                console.log(chalk.bold.blue('\n--- ENGAGEntic Standards ---'));
                const filtered = options.registry ? data.filter(s => s.is_community) : data;

                const core = filtered.filter(s => !s.is_community);
                if (core.length > 0) {
                    console.log(chalk.green(`\nCore Standards (${core.length}):`));
                    core.forEach(s => console.log(`  - ${s.id}`));
                }

                const community = filtered.filter(s => s.is_community);
                if (community.length > 0) {
                    console.log(chalk.cyan(`\nCommunity Registry (${community.length}):`));
                    community.forEach(s => console.log(`  - ${s.id}`));
                }

                console.log();
            } catch (err) {
                console.error(chalk.red("Failed to list standards. Is the engine running?"));
            }
        }
    });

// --- Command 2: Compose ---
program
    .command('compose')
    .description('Compose a normalized AI Context Package from your library')
    .option('-p, --profile <id>', 'Profile ID (e.g. engineering-assistant.md)')
    .option('-s, --standards <ids...>', 'Standard IDs (e.g. secure-coding.md)')
    .option('--spec <id>', 'Specification ID')
    .option('-w, --workflow <id>', 'Workflow ID')
    .option('-t, --task <text>', 'User Task description')
    .action(async (options) => {
        try {
            const body = {
                profile_id: options.profile,
                standards: options.standards,
                specification_id: options.spec,
                workflow_id: options.workflow,
                user_task: options.task
            };

            const res = await fetch(`${API_URL}/session/compose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                console.error(chalk.red(`API Error: ${res.statusText}`));
                process.exit(1);
            }

            const data = await res.json();

            // Output the normalized JSON payload (so it can be piped)
            console.log(JSON.stringify(data.normalized_context, null, 2));

        } catch (err) {
            console.error(chalk.red(`Error connecting to engine at ${API_URL}`));
            console.error(chalk.dim('Is the ENGAGEntic container running?'));
            process.exit(1);
        }
    });

// --- Command 2: Render ---
program
    .command('render')
    .description('Render a Normalized Context Package into a specific framework format (reads from stdin)')
    .option('-f, --format <format>', 'Format: plain, openai, anthropic, generic', 'plain')
    .action(async (options) => {
        try {
            // Read JSON from Stdin
            let input = '';
            for await (const chunk of process.stdin) {
                input += chunk;
            }

            if (!input.trim()) {
                console.error(chalk.red('No input provided. Pipe the output of `engagentic compose` into this command.'));
                process.exit(1);
            }

            const context = JSON.parse(input);

            // Forward to Engine for rendering
            const res = await fetch(`${API_URL}/context/render?format=${options.format}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(context) // We pass the full context object
            });

            if (!res.ok) {
                console.error(chalk.red(`API Error: ${res.statusText}`));
                process.exit(1);
            }

            // Output raw text or json based on format
            if (options.format === 'plain') {
                const text = await res.text();
                // Terminal coloring for plain text
                console.log(chalk.cyan(text));
            } else {
                const json = await res.json();
                console.log(JSON.stringify(json, null, 2));
            }

        } catch (err) {
            console.error(chalk.red("Failed to render context:"), (err as Error).message);
            process.exit(1);
        }
    });

// --- Command 3: Legacy Preview (Convenience Wrapper) ---
program
    .command('preview')
    .description('Compose and render in one step (convenience command)')
    .option('-p, --profile <id>', 'Profile ID')
    .option('-t, --task <text>', 'User Task description')
    .option('-f, --format <format>', 'Format (e.g., openai)', 'plain')
    .action(async (options) => {
        try {
            const body = {
                profile_id: options.profile,
                user_task: options.task
            };

            const res = await fetch(`${API_URL}/context/render?format=${options.format}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (options.format === 'plain') {
                const text = await res.text();
                console.log(chalk.yellow('\n--- Composed Payload ---\n'));
                console.log(chalk.cyan(text));
                console.log(chalk.dim('\n--- End of Context ---'));
            } else {
                const json = await res.json();
                console.log(chalk.yellow(`\n--- ${options.format.toUpperCase()} Payload ---\n`));
                console.log(JSON.stringify(json, null, 2));
            }
        } catch (err) {
            console.error(chalk.red("Failed to execute preview. Is the engine running?"));
            process.exit(1);
        }
    });

program.parse();
