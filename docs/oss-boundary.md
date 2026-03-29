# CEMI OSS Boundary

## Purpose

This document defines what belongs in the open-source CEMI codebase (`cemi-oss`) versus what remains in the private commercial codebase.

The goal is to keep CEMI maintainable as an open-core product:

- one shared OSS foundation
- one private commercial layer
- no separately edited "free" and "paid" twin repos

## Principles

### 1. OSS is the shared foundation

Code belongs in `cemi-oss` if it is broadly useful to all users, required for local or self-hosted use, or forms part of the public developer surface of CEMI.

Examples:

- core domain models
- run and event schemas
- local CLI workflows
- local dashboard foundations
- reusable UI primitives used by the public product
- extension points and plugin interfaces
- public docs, examples, and tests

### 2. Commercial code extends OSS

Commercial features must build on top of the OSS core through:

- adapters
- extension points
- feature flags
- optional packages
- private integrations

Commercial code must not require OSS modules to import private code.

### 3. No reverse dependency

Allowed:

- commercial depends on OSS

Not allowed:

- OSS depends on commercial
- OSS imports from private-only paths
- OSS requires private infrastructure to build

### 4. Local-first features lean OSS

If a feature is necessary for local development, local evaluation, self-hosted use, or public ecosystem adoption, it should strongly lean toward OSS.

### 5. Managed service and premium operations lean private

If a feature primarily exists to support:

- SaaS operations
- enterprise administration
- premium support
- billing
- proprietary hosted infrastructure
- customer-specific integration work

it should remain private.

## Public Scope for CEMI

The following are intended to belong in `cemi-oss`.

### Core data and contracts

- run record schema
- action event schema
- public domain types
- writer logging contracts
- public API request/response contracts used by local or self-hosted workflows

### CLI and runtime foundations

- local CLI entry points
- writer/event emission behavior
- local run creation and inspection flows
- public execution helpers that do not depend on private services

### Dashboard foundations

- workspace shell
- runs page
- compare page foundations
- console page foundations
- onboarding/tour foundations such as Driver.js integration
- reusable public UI components

### Developer experience

- mock data
- demo/example projects
- public tests
- public docs
- contribution guides
- extension/plugin interfaces

## Private Scope for CEMI

The following are intended to remain private.

### Enterprise and hosted features

- hosted control plane
- organization management
- RBAC / SSO / SCIM / enterprise auth
- billing and subscription logic
- admin governance and audit features
- premium analytics and reporting
- customer support and operational tooling
- enterprise deployment automation

### Proprietary integrations and assets

- private connectors
- customer-specific adapters
- proprietary models, datasets, or workflow packs
- internal monitoring and telemetry backends
- internal-only deployment manifests and scripts
- marketing website code and content for the separate public landing site

## Current Export Policy

The private source repository is currently the source of truth. Public content is exported into `cemi-oss`.

### Intended OSS-exported paths

These are the primary candidates for export:

- `src/`
- `cli/`
- `backend/`
- `docs/`
- `scripts/` only if safe and public
- `package.json`
- `package-lock.json`
- `README.md`
- `LICENSE`
- `CITATION.cff`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`

`src/` in the OSS repo is intended to contain the product workspace UI, not the separate marketing website. Public website pages, lead-gen flows, and site-specific content should live in a separate website repository.

### Paths requiring review before export

These should be reviewed case by case before public publication:

- `.github/`
- deployment scripts
- workflow files
- test fixtures
- example configs
- sample datasets
- local environment bootstrap scripts

### Never export

- `.env`
- `.env.*`
- secrets
- internal credentials
- customer data
- internal runbooks
- private deployment manifests
- internal-only automation
- premium-only packages
- customer-specific code

## Boundary Enforcement Rules

The following rules apply to public code:

1. Public paths must build independently of private infrastructure.
2. Public code must not import from private modules.
3. Public documentation must not reference internal systems as requirements.
4. Public tests must pass without internal credentials or private services.
5. Public releases must be usable without access to the private repository.

## Review Process

Any new feature should be classified during design or implementation as one of:

- `oss`
- `private`
- `split`
- `needs-boundary-review`

Use these definitions:

### `oss`
The feature belongs entirely in the public repo.

### `private`
The feature belongs entirely in the private commercial repo.

### `split`
The shared abstraction belongs in OSS, while premium implementation remains private.

### `needs-boundary-review`
The feature touches both public and private concerns and needs explicit architectural review before merging.

## Examples

### Example: Console action stream
- OSS: event schema, console rendering, local event recording
- Private: premium operational views, enterprise observability backends

### Example: Compare workflow
- OSS: compare UI, candidate selection, baseline decision logic
- Private: enterprise policy packs, premium analytics overlays

### Example: Authentication
- OSS: optional local auth stubs or self-host hooks
- Private: SSO, org directories, enterprise RBAC, managed identity features

## Governance

Changes to this document should be reviewed whenever:

- a new premium feature is introduced
- a previously private feature is proposed for OSS release
- the export workflow changes
- public/private package boundaries are reorganized

## Short Decision Rule

When in doubt:

- if it strengthens the platform for everyone, it probably belongs in OSS
- if it creates monetizable enterprise value or depends on internal operations, it should stay private