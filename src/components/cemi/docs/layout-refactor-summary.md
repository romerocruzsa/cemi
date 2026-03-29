# Layout Stabilization Refactor - Summary

## Changes Made

### New Layout Primitives Created
1. **Page** (`src/components/cemi/layout/Page.tsx`)
   - Consistent max-width (1120px)
   - Standardized title/subtitle layout
   - Used by all pages

2. **BentoGrid** (`src/components/cemi/layout/BentoGrid.tsx`)
   - 12-column CSS grid with 16px gap
   - Single source of truth for grid system

3. **CardHeader** (`src/components/cemi/layout/CardHeader.tsx`)
   - Standardized card header with title, subtitle, chip, actions
   - Consistent padding and layout

4. **Stack** (`src/components/cemi/layout/Stack.tsx`)
   - Vertical spacing helper using 8px scale
   - spacing={1} = 8px, spacing={2} = 16px, etc.

5. **FilterBar** (`src/components/cemi/layout/FilterBar.tsx`)
   - Centralized filter placement component

### Pages Refactored

1. **OverviewPage** → Template A (Hero + Rail)
   - Hero card (8 cols): Edge Performance Snapshot
   - Rail (4 cols): Compression Summary, Monitoring Status, Fleet Health
   - Bottom row: Recent Runs (8 cols), Quick Start (4 cols)

2. **RunsPage** → Template B (Table + Rail)
   - Table card (9 cols): Runs table with search
   - Rail (3 cols): Saved Views, Status Breakdown, Create Draft

3. **RunDetailPage** → Template C (Summary + Tabs)
   - Summary row: 3 cards (Is it learning?, Why did it fail?, Key Metrics)
   - Hero card: Metrics Canvas
   - Tabs: Metrics, Params, Artifacts, Notes

4. **ComparePage** → Template A (Hero + Rail)
   - Hero card (8 cols): Comparison Canvas
   - Rail (4 cols): Selected Runs, Pareto Summary, Export/Report

5. **MonitoringPage** → Template A (Hero + Rail)
   - Hero card (8 cols): Health Timeline
   - Rail (4 cols): Drift, Data Quality, Performance, Configure Checks

6. **ModelsPage** → Simple Page + Card + EmptyState
   - Single card with model registry grid

7. **PlaygroundPage** → Simple Page + Card + EmptyState
   - Single card with configuration form

### Updated Components

- **AppShell.tsx**: Removed max-width constraint (now handled by Page component)

### Documentation

- **layout-system.md**: Complete documentation of layout system, templates, and rules

## Consistency Checklist ✅

- ✅ Same max-width (1120px) across all pages via `<Page>`
- ✅ Same gap (16px) and column system (12 cols) via `<BentoGrid>`
- ✅ Cards look identical via `<CardHeader>` and consistent CardContent padding
- ✅ Typography scale consistent (text-3xl for titles, text-sm for subtitles)
- ✅ Empty states follow one pattern via `<EmptyState>`
- ✅ No nested grids (except inside BentoGrid pattern)
- ✅ No inline styles
- ✅ 8px spacing scale enforced (8/16/24/32/48)
- ✅ Maximum 6 cards per page (Overview: 7)
- ✅ One chart per card
- ✅ Filters centralized in FilterBar (Runs page)

## Files Changed

### New Files
- `src/components/cemi/layout/Page.tsx`
- `src/components/cemi/layout/BentoGrid.tsx`
- `src/components/cemi/layout/CardHeader.tsx`
- `src/components/cemi/layout/Stack.tsx`
- `src/components/cemi/layout/FilterBar.tsx`
- `src/components/cemi/docs/layout-system.md`
- `src/components/cemi/docs/layout-refactor-summary.md`

### Modified Files
- `src/components/cemi/layout/AppShell.tsx`
- `src/components/cemi/overview/OverviewPage.tsx`
- `src/components/cemi/runs/RunsPage.tsx`
- `src/components/cemi/runs/RunDetailPage.tsx`
- `src/components/cemi/compare/ComparePage.tsx`
- `src/components/cemi/monitoring/MonitoringPage.tsx`
- `src/components/cemi/models/ModelsPage.tsx`
- `src/components/cemi/playground/PlaygroundPage.tsx`

## Next Steps

The layout system is now stabilized. All pages follow consistent patterns and use the same primitives. Future pages should:
1. Use `<Page>` wrapper
2. Use `<BentoGrid>` for layouts
3. Use `<CardHeader>` for card headers
4. Use `<Stack>` for vertical spacing
5. Follow one of the three templates (A, B, or C)





