---
description: Update project docs based on recent changes
argument-hint: [optional focus area]
allowed-tools: Bash(git log:*), Bash(git diff:*), Read, Edit
---

Recent commits:
!`git log --oneline -10`

Review the recent changes and update:
- docs/architecture.md (only if the structure changed)
- docs/changelog.md (add an entry)
- docs/project-status.md (what's done and where we left off)

Focus on: $ARGUMENTS
