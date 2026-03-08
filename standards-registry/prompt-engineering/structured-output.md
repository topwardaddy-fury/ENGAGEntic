---
id: structured-output
category: prompt-engineering
title: Structured Output Pattern
author: community
version: 1.0
description: Ensure AI outputs predictable JSON or schema-driven responses.
---

## Description
This standard ensures that AI responses follow a consistent schema.

## Instructions
Always respond using the following JSON format:

```json
{
  "result": "",
  "confidence": ""
}
```

## When to Use
Use this when building APIs or automation workflows where the output will be parsed by code.
