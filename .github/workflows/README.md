# GitHub Actions Workflow Dependencies

This document describes the workflow dependency structure for the ETSA project.

## Workflow Dependency Chain

All workflows now depend on the successful completion of `push.yml` before running:

```
push.yml (Run pre-commit on push)
    ↓ (on success)
    ├── code-quality.yml (Code Quality & Performance)
    ├── codeql.yml (CodeQL Advanced)
    └── security-scan.yml (Security & Code Quality Scan)
```

## Workflow Triggers

### push.yml

- **Triggers**: Push to any branch except `main`
- **Purpose**: Runs pre-commit hooks and basic validation
- **Status**: Must succeed for other workflows to run

### code-quality.yml

- **Triggers**:
  - `workflow_run` after `push.yml` completes successfully
  - `pull_request` (independent of push.yml)
- **Jobs**: All jobs require push.yml success or PR trigger
  - `code-quality`: Bundle analysis, dependency checks
  - `accessibility`: Accessibility testing with axe-core
  - `performance`: Lighthouse performance testing
  - `docker-security`: Container security (conditional on docker keywords)
  - `summary`: Results summary

### codeql.yml

- **Triggers**:
  - `workflow_run` after `push.yml` completes successfully
  - `pull_request` (independent of push.yml)
  - `schedule` (independent of push.yml)
- **Jobs**: CodeQL static analysis

### security-scan.yml

- **Triggers**:
  - `workflow_run` after `push.yml` completes successfully
  - `pull_request` to main (independent of push.yml)
  - `workflow_dispatch` (manual trigger, independent of push.yml)
- **Jobs**: All jobs require push.yml success, PR trigger, or manual trigger
  - `security-scan`: Snyk, Trivy, Gitleaks, TruffleHog
  - `summary`: Results summary

## Benefits

1. **Prevents Redundant Runs**: No workflows run if basic validation fails
2. **Resource Efficiency**: Saves GitHub Actions minutes
3. **Clear Dependencies**: Logical flow from basic validation to advanced analysis
4. **Flexibility**: PRs and manual triggers can still run independently
5. **Fail Fast**: Issues caught early in the pipeline

## Conditional Logic

Each dependent workflow uses this condition:

```yaml
if: ${{ github.event.workflow_run.conclusion == 'success' || github.event_name == 'pull_request' || github.event_name == 'schedule' || github.event_name == 'workflow_dispatch' }}
```

This ensures workflows run when:

- push.yml succeeded (for push events)
- Direct PR events
- Scheduled events (for CodeQL)
- Manual triggers (for security scans)
