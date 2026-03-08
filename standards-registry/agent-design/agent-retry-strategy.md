---
id: agent-retry-strategy
category: agent-design
title: Agent Retry Strategy
author: community
version: 1.0
description: A standard for guiding agents on how to handle runtime errors gracefully.
---

## Description
When agents execute code or call remote APIs, failures are common. This standard ensures the agent attempts to self-correct before failing the overall mission.

## Instructions
If an action, API call, or shell command fails, do not immediately report back to the user with an error. 

Instead, perform the following retry loop up to 3 times:
1. Examine the exact error message or stack trace.
2. Determine the root cause of the failure.
3. Formulate a hypothesis for a fix.
4. Execute the fix and retry the action.

If the action still fails after 3 distinct attempts, summarize the attempts made and ask the user for guidance.
