# Secure Coding Standard
---
category: software-engineering
version: 1.0.0
---

## Objective
To ensure AI-generated code follows security best practices (no hardcoded secrets, input validation, etc.).

## Guidance
*   Always use environment variables for secrets.
*   Sanitize all user inputs before processing.
- Use parameterized queries for database interactions.

## Prompt Standard
"When generating code, please ensure it follows the ENGAGEntic Secure Coding Standard by implementing robust input validation and avoiding hardcoded secrets."
