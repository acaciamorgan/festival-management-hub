# SCROLLING STANDARDS - MANDATORY PATTERNS

## NEVER USE THESE (THEY DON'T WORK):
- `h-full` without specific max-height
- `flex-1` + `min-h-0` combinations
- `overflow-hidden` on main containers without proper height constraints

## ALWAYS USE THESE PATTERNS:

### For Main Page Tables/Lists:
```tsx
<div className="overflow-auto max-h-[calc(100vh-350px)]">
  <table className="min-w-full">
    <thead className="bg-gray-50 sticky top-0">
    ...
```

### For Modals:
```tsx
<div className="bg-white rounded-lg p-6 max-w-4xl w-4/5 max-h-[90vh] overflow-y-auto">
  {/* All content goes here - no nested scroll containers */}
</div>
```

### Key Rules:
1. **Main tables**: Use `max-h-[calc(100vh-350px)]` + `overflow-auto`
2. **Modals**: Use `max-h-[90vh] overflow-y-auto` on the main modal div
3. **Sticky headers**: Always use `sticky top-0` on thead
4. **NO nested scroll containers** - put scroll on the outermost container
5. **NO `h-full`** without explicit max-height calculations

## Working Examples:
- `/modules/screener-access` - Main table scrolling
- `guest-form-modal.tsx` - Modal scrolling
- `/modules/programming-pipeline/ticketing-grid` - Fixed table scrolling

## If scrolling doesn't work:
1. Check if you're using `max-h-[calc(100vh-XXXpx)]` pattern
2. Verify no nested overflow containers
3. Ensure thead has `sticky top-0`
4. Remove any `h-full` without explicit max-height