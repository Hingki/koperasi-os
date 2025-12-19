# Ultimate v6.x — Legacy Orchestration Design

This document archives the original Ultimate v6.x orchestration concept
for Koperasi OS.

> **Related:** See [ADR-001](../adr/ADR-001-archive-ultimate-v6x.md) for the decision record.

## Scope
Ultimate v6.x defines a long-term vision for:
- CI/CD orchestration
- Coverage enforcement
- Environment promotion
- Audit-grade workflows

## Status
- **Archived (NOT active)**
- **NOT implemented** (originally planned for Codespace, now Cursor context)
- **NOT required** for current development phase

## Reason for Archiving
Current focus is correctness, security, and feature completion
(member registration, RLS verification).

Ultimate v6.x is intentionally deferred to avoid premature complexity.

**Current replacement:** Minimal local tooling (`kos.ps1`) supports:
- Project structure validation
- RLS verification
- Member registration development
- Local CI sanity checks

See [`tools/kos/kos.md`](../../tools/kos/kos.md) for current workflow.

## Activation Criteria
This design may be revisited when:
- multiple developers are active
- infrastructure is Linux-based
- CI/CD maturity is required
- feature surface is stable

## Note
This is architectural memory, not executable code.
Preserved to prevent decision drift and maintain long-term vision.
