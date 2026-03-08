function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export function downloadStandardTemplate() {
    downloadTextFile(
        'new-standard.md',
        `---
id: new-standard
title: New Standard
category: prompt-engineering
version: 1.0
description: Briefly describe what this standard enforces.
---

## Objective
Describe the goal of this standard.

## Standards
- Rule 1
- Rule 2
- Rule 3

## When to Use
Explain where this standard should be applied.
`
    );
}

export function downloadProfileTemplate() {
    downloadTextFile(
        'new-profile.md',
        `---
id: new-profile
name: New Profile
description: Baseline identity and behavior for a specific AI role.
standards:
  - prompt-engineering/structured-output.md
default_workflow: code-implementation.md
---

This profile defines the default role behavior, tone, and operational preferences.
`
    );
}

export function downloadSpecTemplate() {
    downloadTextFile(
        'new-specification.md',
        `---
type: specification
category: engineering
name: New Specification
description: Aggregated Profile + Standards operational set.
---

## 1. Objective
[Describe the goal]

## 2. Requirements & Inputs
[List constraints, dependencies, and inputs]

## 3. Expected Outputs
[Describe required output files/artifacts]

## 4. Success Criteria
[Define how completion is verified]
`
    );
}
