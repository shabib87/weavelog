# Skill Template

Copy this structure when creating a new skill. Fill in the brackets.

## Directory structure

```
skill-name/
├── SKILL.md
├── references/        (optional)
├── scripts/           (optional)
├── assets/            (optional)
└── evals/             (optional)
    └── evals.json
```

## SKILL.md template

```yaml
---
name: skill-name
description: >-
  Use when [trigger scenario]. [What the skill does]. Apply when [additional
  contexts, including non-obvious ones].
metadata:
  author: your-handle
  version: "1.0.0"
---

# Skill Name

**What this is.** [One sentence: what the skill does and when to use it.]

## Procedure

1. [First step]
2. [Second step]
3. [Third step]

## Gotchas

- [Non-obvious fact 1]
- [Non-obvious fact 2]

## References

- [When to load reference 1]: `references/file1.md`
- [When to load reference 2]: `references/file2.md`
```

## Checklist before committing

- [ ] `name` matches parent directory
- [ ] `description` under 1024 chars with WHAT + WHEN
- [ ] SKILL.md body under 500 lines / 5000 tokens
- [ ] References one level deep, relative paths
- [ ] No interactive prompts in scripts
- [ ] version: "1.0.0"
