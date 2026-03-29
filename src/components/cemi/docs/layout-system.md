# CEMI Layout System

## Overview

This document defines the rigid layout system for all CEMI pages. **All pages must follow these rules.**

## Layout Primitives

### Page
- **Location**: `src/components/cemi/layout/Page.tsx`
- **Purpose**: Consistent max-width (1120px), padding, and title/subtitle
- **Usage**: Wrap all page content
```tsx
<Page title="Page Title" subtitle="Optional subtitle">
  {/* page content */}
</Page>
```

### BentoGrid
- **Location**: `src/components/cemi/layout/BentoGrid.tsx`
- **Purpose**: 12-column CSS grid with 16px gap (8px spacing scale)
- **Usage**: All bento layouts
```tsx
<BentoGrid>
  <Card className="col-span-8">...</Card>
  <Card className="col-span-4">...</Card>
</BentoGrid>
```

### CardHeader
- **Location**: `src/components/cemi/layout/CardHeader.tsx`
- **Purpose**: Standardized card header with title, subtitle, chip, actions
- **Usage**: All card headers
```tsx
<Card>
  <CardHeader title="Title" subtitle="Subtitle" chip={{ label: "Badge" }} />
  <CardContent>...</CardContent>
</Card>
```

### Stack
- **Location**: `src/components/cemi/layout/Stack.tsx`
- **Purpose**: Vertical spacing using 8px scale (8/16/24/32/48)
- **Usage**: Consistent vertical spacing
```tsx
<Stack spacing={2}> {/* 16px spacing */}
  <div>Item 1</div>
  <div>Item 2</div>
</Stack>
```

### FilterBar
- **Location**: `src/components/cemi/layout/FilterBar.tsx`
- **Purpose**: Centralized filter placement
- **Usage**: All filters go here, not scattered in cards

## Page Templates

### Template A: "Hero + Rail"
- **Grid**: 12 columns
- **Hero**: `col-span-8`
- **Rail**: `col-span-4` (stacked cards)
- **Use for**: Overview, Monitoring

### Template B: "Table + Rail"
- **Grid**: 12 columns
- **Table**: `col-span-9`
- **Rail**: `col-span-3`
- **Use for**: Runs

### Template C: "Summary + Tabs"
- **Summary row**: 3 cards max at top (4 cols each)
- **Tabs below**: Metrics, Params, Artifacts, Notes
- **Use for**: Run Detail

## Rules

### Spacing Scale
- **Only use**: 8px, 16px, 24px, 32px, 48px
- **Tailwind classes**: `gap-4` (16px), `space-y-4` (16px), `p-6` (24px), `mb-8` (32px)

### Max Width
- **All pages**: 1120px (`max-w-[1120px]`)
- **Enforced by**: `<Page>` component

### Grid System
- **All grids**: 12 columns
- **Gap**: 16px (`gap-4`)
- **No custom grids**: Use `<BentoGrid>` only

### Cards
- **Max per page**: 6 cards (Overview: 7 max)
- **One chart per card**: No multi-panel cards
- **Consistent padding**: Use `<CardHeader>` and `<CardContent>`

### Empty States
- **Use**: `<EmptyState>` component
- **Consistent**: Same visual pattern everywhere

## Dos and Don'ts

### ✅ DO
- Use `<Page>` wrapper for all pages
- Use `<BentoGrid>` for all grid layouts
- Use `<CardHeader>` for all card headers
- Use `<Stack>` for vertical spacing
- Use `<FilterBar>` for filters
- Follow one of the three templates
- Use 8px spacing scale only

### ❌ DON'T
- Create custom grid classes
- Use inline styles
- Use absolute positioning
- Mix spacing scales
- Put filters in card headers
- Create more than 6 cards per page (7 for Overview)
- Put multiple charts in one card

## Examples

### Overview Page (Template A)
```tsx
<Page title="Overview" subtitle="Monitor key metrics">
  <BentoGrid>
    <Card className="col-span-8">
      <CardHeader title="Edge Performance Snapshot" />
      <CardContent>...</CardContent>
    </Card>
    <Card className="col-span-4">
      <CardHeader title="Compression Summary" />
      <CardContent>...</CardContent>
    </Card>
  </BentoGrid>
</Page>
```

### Runs Page (Template B)
```tsx
<Page title="Runs" subtitle="View and manage runs">
  <BentoGrid>
    <Card className="col-span-9">
      <CardHeader title="Runs" actions={<Input />} />
      <CardContent>...</CardContent>
    </Card>
    <div className="col-span-3">
      <Stack spacing={2}>
        <Card>...</Card>
        <Card>...</Card>
      </Stack>
    </div>
  </BentoGrid>
</Page>
```





