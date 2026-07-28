# Delve Design System

A cohesive, warm, and approachable design system for the Delve platform.

## Quick Start

Import the design system in your app:

```typescript
import './design-system/tokens.css';
import './design-system/components.css';
```

## Color Palette

### Primary Color
- **#7C3AED** - Main brand color (vibrant purple)
- Used for primary actions, links, and brand emphasis

### Supporting Colors

#### Secondary (Warm Teal)
- **#14B8A6** - Complementary accent for secondary actions
- Light variant: #2DD4BF

#### Accent (Warm Coral)
- **#F97316** - Eye-catching actions and highlights
- Used for calls-to-action, important interactions

#### Semantic Colors
- **Success:** #10B981 (green) - Positive actions, confirmations
- **Warning:** #F59E0B (amber) - Cautions, alerts
- **Error:** #EF4444 (red) - Errors, destructive actions
- **Info:** #3B82F6 (blue) - Information messages

#### Neutrals (Warm Gray)
- **50:** #FAFAF8 (off-white)
- **100-200:** Light backgrounds
- **300-400:** Borders and dividers
- **500-600:** Secondary text
- **700-900:** Primary text and dark elements

## Typography

### Font Families
- **Display:** Syne (headings)
- **Body:** DM Sans (paragraphs, UI text)
- **Mono:** Courier New (code)

### Font Sizes
- `--text-xs` to `--text-6xl`
- Uses a modular scale (1.125x ratio)

### Font Weights
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

## Spacing System

Consistent 4px baseline spacing:
- `--spacing-xs`: 0.25rem (4px)
- `--spacing-sm`: 0.5rem (8px)
- `--spacing-md`: 1rem (16px)
- `--spacing-lg`: 1.5rem (24px)
- `--spacing-xl`: 2rem (32px)
- `--spacing-2xl`: 2.5rem (40px)
- `--spacing-3xl` to `--spacing-6xl`: Larger scales

## Border Radius

- `--radius-sm`: 0.375rem (6px) - Small elements
- `--radius-md`: 0.5rem (8px)
- `--radius-lg`: 0.75rem (12px) - Default for inputs/buttons
- `--radius-xl`: 1rem (16px) - Cards
- `--radius-2xl`: 1.5rem (24px) - Large containers
- `--radius-full`: 9999px - Fully rounded (badges, pills)

## Shadows

Elevation system using depth:
- `--shadow-sm`: Subtle (hover states)
- `--shadow-md`: Default (cards)
- `--shadow-lg`: Elevated (interactive)
- `--shadow-xl`: High elevation
- `--shadow-2xl`: Maximum depth

## Components

### Buttons

#### Primary Button
```html
<button class="btn btn-primary">Primary Action</button>
```
States: hover, active, disabled

#### Secondary Button
```html
<button class="btn btn-secondary">Secondary Action</button>
```

#### Ghost Button
```html
<button class="btn btn-ghost">Outline Action</button>
```

#### Accent Button
```html
<button class="btn btn-accent">Important Action</button>
```

#### Sizes
```html
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary">Regular (default)</button>
<button class="btn btn-primary btn-lg">Large</button>
<button class="btn btn-primary btn-block">Full Width</button>
```

### Cards

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>
```

Variants:
- `.card-sm` - Compact padding
- `.card-lg` - Extra padding
- `.card-primary` - Left accent border
- `.card-secondary` - Alternative accent border

### Form Elements

#### Input
```html
<div class="form-group">
  <label class="label label-required">Email Address</label>
  <input type="email" class="input" placeholder="you@example.com">
  <span class="help-text">We'll never share your email</span>
</div>
```

#### Textarea
```html
<textarea class="textarea" placeholder="Your message"></textarea>
```

#### Select
```html
<select class="select">
  <option>Choose an option</option>
</select>
```

### Badges

```html
<span class="badge badge-primary">Primary</span>
<span class="badge badge-secondary">Secondary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
```

### Alerts

```html
<div class="alert alert-success">Success message</div>
<div class="alert alert-warning">Warning message</div>
<div class="alert alert-error">Error message</div>
<div class="alert alert-info">Info message</div>
```

### Layout Utilities

#### Container
```html
<div class="container">Max-width 1280px with padding</div>
```

#### Grid
```html
<div class="grid grid-3">
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>
```
Responsive: `grid-2`, `grid-3`, `grid-4` (collapses to 1 column on mobile)

#### Flex
```html
<div class="flex flex-between">
  <span>Left</span>
  <span>Right</span>
</div>
```

### Loading States

```html
<div class="spinner"></div>
<div class="skeleton" style="height: 200px;"></div>
```

## Using CSS Variables

All design tokens are available as CSS variables:

```css
.custom-element {
  color: var(--color-primary);
  padding: var(--spacing-lg);
  font-family: var(--font-display);
  border-radius: var(--radius-lg);
}
```

## Responsive Breakpoints

```css
@media (max-width: 640px) { /* Mobile */ }
@media (min-width: 640px) { /* Tablet */ }
@media (min-width: 768px) { /* Medium */ }
@media (min-width: 1024px) { /* Desktop */ }
@media (min-width: 1280px) { /* Large */ }
@media (min-width: 1536px) { /* Extra Large */ }
```

## Best Practices

1. **Use CSS Variables** - Always prefer `var(--color-primary)` over hex codes
2. **Maintain Spacing Rhythm** - Use the spacing scale, don't use custom values
3. **Semantic Colors** - Use success/warning/error for their intended purposes
4. **Font Hierarchy** - Use heading tags (h1-h6) with Syne for emphasis
5. **Mobile First** - Build for mobile, enhance for larger screens
6. **Accessibility** - Ensure sufficient color contrast and focus states
7. **Consistency** - Reuse components and patterns

## Integration with Existing Components

When refactoring existing components:

1. Replace inline styles with classes
2. Use design system colors instead of hardcoded values
3. Apply typography styles through proper semantic HTML
4. Update spacing to use the spacing scale
5. Use component classes for consistent styling

### Example Refactor

**Before:**
```html
<div style="padding: 20px; background-color: #f5f3f0; border-radius: 8px;">
  <h3 style="color: #7C3AED; font-size: 20px;">Title</h3>
</div>
```

**After:**
```html
<div class="card">
  <h3>Title</h3>
</div>
```

## Future Enhancements

- Component variants documentation
- Interactive component showcase
- Accessibility checklist
- Dark mode tokens (when needed)
- Animation guidelines
