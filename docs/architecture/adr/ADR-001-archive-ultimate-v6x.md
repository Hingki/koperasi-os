# ADR-001: Archive Ultimate v6.x Orchestration

## Status
Accepted

## Context
Koperasi OS initially defined a comprehensive orchestration design
(“Ultimate v6.x”) covering CI/CD, environment promotion, and audit-grade workflows.

At the current project phase, the system is focused on:
- database correctness
- security via RLS
- completing core business features (member registration)

Implementing Ultimate v6.x at this stage would introduce
premature complexity and slow down feature delivery.

## Decision
Ultimate v6.x orchestration is archived as architectural memory
and will NOT be implemented in the current development phase.

A minimal, project-local tooling (`kos.ps1`) is adopted instead
to support:
- member registration development
- RLS verification
- local CI sanity checks

## Consequences
### Positive
- Reduced cognitive and operational complexity
- Faster feature iteration
- Clear separation between current needs and future vision

### Negative
- Some long-term automation is deferred
- Manual steps may exist temporarily

## Revisit Criteria
This decision may be revisited when:
- multiple developers are active
- infrastructure standardizes on Linux
- CI/CD maturity becomes a priority
- core feature set is stable

## Notes
This ADR preserves architectural intent and prevents decision drift.
