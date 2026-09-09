---
name: cron-automator
description: Self-scheduling autonomous cron triggers with dynamic conditional policies.
auto-activate: true
---

# Cron Automator Skill

When configuring automated recurring tasks:
1. Define cron schedules (e.g. `*/15 * * * *`) in `heartbeat.yml`.
2. Attach health check, metrics snapshot, and financial check tasks.
3. Configure wake conditions to awaken the agent loop whenever abnormal signals or high-priority messages are detected.
