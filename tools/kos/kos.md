# Koperasi OS – kos CLI (Minimal)

This is the ONLY supported local workflow.

## Commands

- kos doctor  
  Validate project structure and source-of-truth files.

- kos rls-verify  
  Run SQL-level RLS tests. Must fail if RLS is bypassable.

- kos member-check  
  Ensure prerequisites for member registration feature exist.

- kos ci-sanity  
  Simulate minimal CI locally (doctor + RLS verification).

## Constraints

- Migrations are FINAL.
- RLS is the last security boundary.
- Client must NOT write directly to database.
- All writes go through server-side API.
