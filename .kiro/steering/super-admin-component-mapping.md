---
inclusion: manual
---

# Super Admin Dashboard Component Mapping Guide

## Purpose
This steering document provides comprehensive guidance for identifying and mapping all components, forms, buttons, and interface elements in the super admin dashboard that need to be redesigned with the cybersecurity theme.

## Component Identification Strategy

### Systematic Component Discovery
When working on dashboard or component redesigns, always:

1. **Scan the entire super-admin-frontend/src directory structure**
2. **Identify all React components (.tsx files)**
3. **Map component relationships and imports**
4. **Categorize components by functionality**
5. **Document all interactive elements within each component**

### Component Categories to Map

#### Navigation Components
- Main navigation menus
- Sidebar navigation
- Breadcrumbs
- Tab navigation
- Pagination controls

#### Form Components
- Input fields (text, email, password, etc.)
- Select dropdowns
- Checkboxes and radio buttons
- File upload components
- Form validation displays
- Submit and cancel buttons

#### Data Display Components
- Tables and data grids
- Cards and panels
- Charts and graphs
- Status indicators
- Progress bars
- Badges and labels

#### Interactive Controls
- Action buttons (primary, secondary, danger)
- Icon buttons
- Toggle switches
- Sliders and range inputs
- Search bars
- Filter controls

#### Modal and Overlay Components
- Dialog boxes
- Confirmation modals
- Loading overlays
- Tooltips and popovers
- Notification toasts
- Dropdown menus

#### Layout Components
- Headers and footers
- Sidebars and panels
- Grid layouts
- Container components
- Spacer and divider elements

## RTL (Right-to-Left) Considerations

### RTL-Specific Elements to Identify
- Text alignment and direction
- Icon positioning and orientation
- Navigation flow and positioning
- Form field layouts
- Table column ordering
- Animation directions
- Margin and padding adjustments

### RTL Design Patterns
- Ensure all glassmorphism effects work with RTL layouts
- Adapt neon lighting effects for RTL navigation patterns
- Modify Framer Motion animations to respect RTL directional flow
- Adjust component spacing and positioning for Persian text

## Component Analysis Template

For each component identified, document:

```markdown
### Component: [ComponentName]
- **File Path**: src/components/[path]/[ComponentName].tsx
- **Type**: [Navigation/Form/Display/Control/Modal/Layout]
- **Interactive Elements**: [List all buttons, inputs, clickable elements]
- **Current Styling**: [Current CSS/styling approach]
- **RTL Considerations**: [Specific RTL requirements]
- **Redesign Priority**: [High/Medium/Low]
- **Dependencies**: [Other components this depends on]
```

## Cybersecurity Theme Application Checklist

### Visual Elements to Transform
- [ ] Background colors and gradients
- [ ] Border styles and effects
- [ ] Typography and font choices
- [ ] Icon styles and colors
- [ ] Button designs and states
- [ ] Form field appearances
- [ ] Card and panel styling
- [ ] Navigation styling
- [ ] Status indicator colors
- [ ] Loading and progress indicators

### Glassmorphism Effects to Apply
- [ ] Semi-transparent backgrounds
- [ ] Backdrop blur effects
- [ ] Subtle border highlights
- [ ] Layered depth effects
- [ ] Appropriate opacity levels

### Neon Lighting Integration
- [ ] Active state highlights
- [ ] Hover effects
- [ ] Focus indicators
- [ ] Status color coding
- [ ] Accent lighting placement

### Framer Motion Animations
- [ ] Page transitions
- [ ] Component entrance animations
- [ ] Hover micro-interactions
- [ ] Loading state animations
- [ ] State change transitions

## Implementation Guidelines

### Before Starting Redesign
1. Run component discovery scan
2. Create comprehensive component inventory
3. Identify all interactive elements
4. Map component relationships
5. Plan redesign sequence and priorities

### During Redesign
1. Maintain existing functionality
2. Preserve all props and interfaces
3. Keep same component structure
4. Only modify styling and visual presentation
5. Test RTL layout compatibility
6. Verify animation performance

### Quality Assurance
1. Ensure no components are missed
2. Verify RTL layout correctness
3. Test all interactive states
4. Validate accessibility compliance
5. Confirm performance optimization

This systematic approach ensures comprehensive coverage of all interface elements while maintaining the existing functionality and adding the desired cybersecurity aesthetic with proper RTL support.