---
id: chain-of-thought-pattern
category: prompt-engineering
title: Chain-of-Thought Pattern
author: community
version: 1.0
description: Forces the AI to show its work before providing a final answer.
---

## Description
This pattern reduces hallucinations and logical errors by forcing the model to explicitly lay out its reasoning process before concluding.

## Instructions
Before providing your final output, you must wrap your internal reasoning inside a `<thinking>` block.

1. Break the task down into sub-problems.
2. Analyze the context and constraints for each sub-problem.
3. Formulate a hypothesis.
4. Conclude based on the hypothesis.

Only after the `<thinking>` block should you provide the final requested output.

## When to Use
Use this for math problems, complex refactoring, multi-step analysis, and highly analytical tasks.
