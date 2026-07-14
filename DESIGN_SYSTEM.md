# Jarvis Design System - Liquid Black Glass

## Overview

The Jarvis chat application now uses a premium **Liquid Black Glass** design system with Vercel's carbon-based color palette. This design emphasizes sophistication through frosted glass morphism effects, smooth transitions, and a mobile-first responsive approach.

## Color Palette

### Light Mode (Future)
- Background: Pure white (`#ffffff`)
- Foreground: Deep black (`#145000`)
- Accents: Subtle grays and contrasts

### Dark Mode (Current)
- **Canvas**: `#0a0a0a` - Main background
- **Background**: `#000000` - Deep black
- **Panel**: `#0f0f0f` - Elevated surfaces
- **Surface**: `#1a1a1a` - Interactive elements
- **Text**: `#f5f5f5` - Primary text
- **Muted**: `#8a8a8a` - Secondary text
- **Border**: `#2a2a2a` - Subtle dividers
- **Glass Tokens**:
  - `--glass-light`: `rgba(255, 255, 255, 0.05)`
  - `--glass-lighter`: `rgba(255, 255, 255, 0.08)`
  - `--glass-medium`: `rgba(255, 255, 255, 0.12)`

### Accents
- **Chat**: `#10b981` (Emerald)
- **Builder**: `#f59e0b` (Amber)

## Glass Morphism Components

### `.glass-panel`
Premium frosted glass with 20px blur, used for modal backgrounds and elevated surfaces.

```css
background: rgba(15, 15, 15, 0.7);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 12px;
```

Features:
- Hover state with increased opacity and blur
- Box shadow for depth on desktop
- Smooth transitions (0.3s ease)

### `.glass-card`
Lightweight glass for card-based layouts with 16px blur.

```css
background: rgba(26, 26, 26, 0.6);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.05);
border-radius: 10px;
```

### `.glass-input`
Interactive inputs with 12px blur and focus states.

```css
background: rgba(26, 26, 26, 0.5);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.06);
```

On focus:
- Enhanced blur and opacity
- Elevated border visibility
- Subtle ring shadow

## Mobile-First Responsive Design

All components follow a mobile-first approach with progressive enhancement for larger screens.

### Responsive Classes

#### Typography
- `.heading-hero`: 1.5rem (mobile) → 2.25rem (tablet) → 3rem (desktop)
- `.heading-lg`: 1.25rem (mobile) → 1.5rem (tablet) → 1.875rem (desktop)
- `.heading-md`: 1.125rem (mobile) → 1.25rem (tablet)
- `.text-responsive`: 0.875rem (mobile) → 1rem (tablet) → 1.125rem (desktop)

#### Spacing
- `.container-mobile`: Adaptive padding (1rem → 1.5rem → 2rem)
- `.gap-mobile`: Adaptive gaps (0.75rem → 1rem → 1.25rem → 1.5rem)
- `.safe-area-mobile`: Respects device safe areas (notches, home indicators)

#### Layout
- `.flex-responsive`: Column layout on mobile, row on tablet+
- `.grid-responsive`: 1 column (mobile) → 2 columns (tablet) → 3 columns (desktop)

#### Interactive
- `.button-responsive`: Adaptive button sizing for touch targets
- Touch-friendly minimum size: 44px × 44px on mobile (pointer: coarse)

## Breakpoints

- **Mobile**: < 640px
- **Tablet**: 641px - 1024px
- **Desktop**: 1025px+

Custom breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

## Animations

### Glass Effects
- Smooth transitions on hover (0.3s cubic-bezier)
- Opacity increases on interaction
- Blur depth increases for emphasis

### Streaming & Interactions
- Text blur reveal: 0.4s ease-out
- Slide animations: 0.2s ease
- Fade in: 0.35s cubic-bezier

### Mobile Optimizations
- Reduced motion respects `prefers-reduced-motion`
- Touch feedback via transform scale
- No hover effects on touch devices

## Usage Guidelines

### Best Practices

1. **Always use glass components** for elevated surfaces
   ```jsx
   <div className="glass-panel p-4">
     Content here
   </div>
   ```

2. **Combine with responsive utilities**
   ```jsx
   <div className="flex-responsive gap-mobile container-mobile">
     Responsive layout
   </div>
   ```

3. **Respect safe areas on mobile**
   ```jsx
   <div className="safe-area-mobile">
     Safe content
   </div>
   ```

4. **Use semantic color tokens**
   ```css
   background-color: var(--card);
   color: var(--foreground);
   ```

5. **Test on multiple viewports**
   - Mobile: 375px (iPhone)
   - Tablet: 768px (iPad)
   - Desktop: 1024px+

## Accessibility

- Minimum text size: 14px
- Minimum touch target: 44px × 44px
- Color contrast: WCAG AA compliant
- Focus states: Visible ring with sufficient contrast
- Reduced motion: Supported via media queries

## Performance

- Glass blur via CSS `backdrop-filter` (GPU accelerated)
- Smooth 60fps transitions
- Minimal layout shift (CLS < 0.1)
- Mobile-optimized rendering

## Future Enhancements

- Light mode support with adapted glass colors
- Additional glass blur variants (light, medium, heavy)
- Custom theme builder for accent colors
- Accessibility improvements for reduced motion users
