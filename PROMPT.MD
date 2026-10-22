# Task

[Paste the task , word for word]

# Goal

[One sentence: what the finished thing does]

# Clarifications from the interviewers

- [Answer 1, e.g. "Backend focus, a simple UI is fine"]
- [Answer 2, e.g. "Any libraries allowed"]

# Context

- Stack: TypeScript, Node, [Postgres / SQLite], [SvelteKit / React]
- Input: [shape of the data, e.g. raw email text, a CSV, JSON]
- Output: [what the user sees or the API returns]
- Time: 50 minutes. Keep it simple; working end to end beats extra features.

# How to work

1. Propose a plan first: data model, API endpoints, UI, then tests.
   Do not write code until I approve the plan.
2. Save the approved plan as PLAN.md with a checklist.
3. Do one step at a time. Stop after each step so I can review.
4. After each step run: npx tsc --noEmit && npm test
5. Validate all external input (zod). Use parameterised SQL.
6. Do not add dependencies without asking. Never weaken a test.

# Done when

- [ ] [Core requirement 1 works]
- [ ] [Core requirement 2 works]
- [ ] [Edge case: empty / invalid input returns a clear error]
- [ ] [Edge case: duplicates or missing data handled]
- [ ] Tests cover the core logic and pass
- [ ] tsc passes with no errors
- [ ] README.md explains how to run it, decisions, and what's next
