# Dynamic Form Rendering System - PRD

## 1. Product Overview

**Feature Name:** Dynamic Form Rendering with Static Links & Authentication  
**Owner:** Product / Engineering  
**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Prisma, Zod, Shadcn UI, Tailwind CSS  
**Target Users:** External suppliers, internal procurement team, admins  
**Status:** Design Phase

This feature enables **fully dynamic form rendering** from database-configured `FormConfig` records, replacing the current hardcoded form implementation. Forms are accessible via **static, shareable links** with authentication enforcement, following modern multi-step form UX patterns and responsive design principles.

### Key Capabilities

- **Dynamic form generation** from `FormConfig`, `FormSection`, and `FormField` database records
- **Static, shareable URLs** for direct form access (e.g., `/forms/[formId]` or `/forms/[entity]/[geography]`)
- **Authentication enforcement** with redirect to sign-in for unauthenticated users
- **Multi-step wizard interface** with progress tracking and section navigation
- **Responsive design** optimized for mobile, tablet, and desktop
- **Real-time validation** using dynamically generated Zod schemas
- **Draft persistence** with autosave capabilities
- **Field visibility rules** and conditional logic support

---

## 2. Goals & Non-Goals

### 2.1 Goals

1. **Dynamic Form Rendering**
   - Render forms entirely from `FormConfig` database records
   - Support all field types: text, number, email, select, multi-select, checkbox, radio, date, textarea, file
   - Respect field ordering, grouping by sections, and validation rules
   - Handle conditional field visibility based on other field values

2. **Static Form Links**
   - Generate shareable URLs that directly access specific forms
   - Support entity/geography-based routing: `/forms/[entityCode]/[geographyCode]`
   - Support direct form ID routing: `/forms/[formConfigId]`
   - Maintain form state and draft data across sessions

3. **Authentication & Authorization**
   - Enforce authentication before form access
   - Redirect unauthenticated users to sign-in with return URL
   - Support role-based form access (suppliers, procurement, admins)
   - Validate user permissions for specific entity/geography combinations

4. **Multi-Step Form UX**
   - Implement step-by-step wizard with clear progress indication
   - Allow navigation between steps with validation
   - Show completion status per section
   - Provide "Save & Continue" and "Save Draft" actions
   - Display contextual help and field descriptions

5. **Design Excellence**
   - Follow modern form design patterns (Material Design, Ant Design principles)
   - Implement proper error states, loading states, and success feedback
   - Ensure WCAG 2.1 AA accessibility compliance
   - Optimize for mobile-first responsive design
   - Use consistent spacing, typography, and color system

### 2.2 Non-Goals (for v1)

- **Form builder UI** (admin creates forms via API/admin panel, not in this PRD)
- **Real-time collaboration** (multiple users editing same form simultaneously)
- **Form versioning UI** (versioning exists in DB, but UI for managing versions deferred)
- **Offline form completion** (requires service worker implementation)
- **Multi-language form labels** (i18n support deferred to v2)
- **Advanced field types** (signature, rich text editor, matrix/grid fields)

---

## 3. User Stories

### 3.1 Supplier User Stories

**US-1: Access Form via Static Link**
- **As a** supplier
- **I want to** access a form via a direct, shareable link
- **So that** I can bookmark it, share it with colleagues, or access it from email invitations

**US-2: Authenticated Form Access**
- **As a** supplier
- **I want to** be prompted to sign in if I'm not authenticated
- **So that** my form data is securely associated with my account

**US-3: Multi-Step Form Navigation**
- **As a** supplier
- **I want to** complete a form in multiple steps with clear progress indication
- **So that** I don't feel overwhelmed and can track my completion status

**US-4: Save Draft & Resume**
- **As a** supplier
- **I want to** save my progress and resume later
- **So that** I can complete the form at my own pace without losing data

**US-5: Field Validation Feedback**
- **As a** supplier
- **I want to** see clear validation errors as I fill out the form
- **So that** I can correct mistakes before submission

**US-6: Conditional Fields**
- **As a** supplier
- **I want to** see only relevant fields based on my previous answers
- **So that** the form feels personalized and I don't waste time on irrelevant fields

### 3.2 Admin User Stories

**US-7: Form Configuration**
- **As an** admin
- **I want to** configure forms in the database and have them render automatically
- **So that** I can customize forms per entity/geography without code changes

**US-8: Generate Static Links**
- **As an** admin
- **I want to** generate static links for forms
- **So that** I can share them with suppliers via email or documentation

---

## 4. Functional Requirements

### 4.1 Route Structure

#### 4.1.1 Static Form Routes

**Option A: Entity/Geography Based (Recommended)**
```
/forms/[entityCode]/[geographyCode]
```
- Example: `/forms/unimacts/us`
- Fetches active `FormConfig` for entity + geography
- Supports version parameter: `/forms/unimacts/us?version=2`

**Option B: Direct Form ID**
```
/forms/[formConfigId]
```
- Example: `/forms/clx123abc456`
- Direct access to specific form configuration
- Useful for testing specific form versions

**Option C: Application-Based (Existing)**
```
/supplier/onboarding/[applicationId]
```
- Maintains existing route for application-specific forms
- Fetches `FormConfig` from `Application.formConfigId`
- Falls back to entity/geography lookup if `formConfigId` is null

#### 4.1.2 Authentication Routes

```
/signin?returnUrl=/forms/unimacts/us
```
- Redirects unauthenticated users to sign-in
- Preserves intended destination in `returnUrl` query parameter
- After successful authentication, redirects to original form URL

### 4.2 Form Rendering Engine

#### 4.2.1 Form Data Fetching

**Server Component Flow:**
1. Extract route parameters (entity/geography or formConfigId)
2. Query database for `FormConfig` with:
   - `sections` (ordered by `order`)
   - `fields` within each section (ordered by `order`)
   - Related `entity` and `geography` records
3. Validate form exists and is active (`isActive = true`)
4. Check user permissions (if applicable)
5. Fetch existing application data if `applicationId` provided
6. Pass form config to client component for rendering

**Query Structure:**
```typescript
const formConfig = await prisma.formConfig.findFirst({
  where: {
    entity: { code: entityCode },
    geography: { code: geographyCode },
    isActive: true,
    // version handling
  },
  include: {
    entity: true,
    geography: true,
    sections: {
      orderBy: { order: 'asc' },
      include: {
        fields: {
          orderBy: { order: 'asc' },
        },
      },
    },
  },
});
```

#### 4.2.2 Field Type Rendering

**Supported Field Types:**
- `text` → `<input type="text">`
- `email` → `<input type="email">`
- `number` → `<input type="number">`
- `tel` → `<input type="tel">`
- `textarea` → `<textarea>`
- `select` → `<select>` with options from `field.options.values`
- `multi-select` → Multi-select component (Shadcn Combobox)
- `checkbox` → `<input type="checkbox">`
- `radio` → Radio group with options
- `date` → Date picker component
- `file` → File upload component (handled separately, not in form data)

**Field Configuration Mapping:**
```typescript
interface FieldRenderConfig {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  options?: { values: string[] };
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  visibility?: {
    dependsOn: string;
    condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
    value: unknown;
  };
  isSensitive: boolean;
}
```

#### 4.2.3 Multi-Step Wizard Implementation

**Step Structure:**
- Each `FormSection` represents one step in the wizard
- Steps are rendered sequentially with navigation controls
- Progress indicator shows: `Step X of Y` and completion percentage
- Each step validates before allowing progression

**Navigation Rules:**
- **Next Button**: Validates current step, saves data, advances to next step
- **Previous Button**: Allows going back without validation (data preserved)
- **Step Indicator**: Clickable to jump to completed steps (validates current step first)
- **Save Draft**: Saves current progress without validation, allows exit

**State Management:**
```typescript
interface FormWizardState {
  currentStep: number;
  formData: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  completedSteps: Set<number>;
  isDirty: boolean;
  isSubmitting: boolean;
}
```

### 4.3 Validation System

#### 4.3.1 Schema Generation

Use existing `buildFormSchema()` from `lib/form-schema.ts`:
- Generates Zod schema from `FormConfig`
- Handles field types, required flags, and basic validation
- Extends with custom validation rules from `field.validation` JSON

**Enhanced Validation:**
```typescript
function buildEnhancedSchema(config: FormConfigWithFields) {
  const baseSchema = buildFormSchema(config);
  
  // Apply custom validation rules
  config.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.validation) {
        // Apply min, max, pattern, minLength, maxLength
        // Apply custom regex patterns
        // Apply conditional validation rules
      }
    });
  });
  
  return baseSchema;
}
```

#### 4.3.2 Validation Timing

- **On Blur**: Validate field when user leaves it
- **On Change**: Validate for real-time feedback (debounced)
- **On Step Advance**: Validate all fields in current step
- **On Submit**: Full form validation before submission

#### 4.3.3 Error Display

- **Inline Errors**: Display below each field with clear messaging
- **Error Summary**: Show at top of step if step validation fails
- **Focus Management**: Auto-focus first error field on validation failure
- **Error Icons**: Visual indicator (red border, error icon) on invalid fields

### 4.4 Conditional Field Visibility

**Visibility Rules:**
```typescript
interface VisibilityRule {
  dependsOn: string; // Field key
  condition: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
  value: unknown;
}
```

**Implementation:**
- Evaluate visibility rules on form data changes
- Show/hide fields dynamically using React state
- Maintain field values when hidden (don't clear data)
- Re-validate visible fields when dependencies change

### 4.5 Draft Persistence

#### 4.5.1 Autosave Strategy

- **Debounced Autosave**: Save form data after 2 seconds of inactivity
- **Step Completion Save**: Save when advancing to next step
- **Explicit Save Draft**: Manual "Save Draft" button
- **Before Unload**: Warn user if unsaved changes exist

#### 4.5.2 Data Storage

**For Application-Based Routes:**
- Save to `Application.data` JSON field
- Update `Application.updatedAt` timestamp

**For Static Form Routes (New Application):**
- Create `Application` record in `DRAFT` status
- Associate with user's organization
- Store `formConfigId`, `entityId`, `geographyId`
- Save form data to `Application.data`

#### 4.5.3 Resume Flow

- On form load, check for existing `Application` in `DRAFT` status
- Pre-populate form with saved data
- Restore step position (or start from beginning)
- Show "Resume" vs "Start New" option if multiple drafts exist

### 4.6 Authentication & Authorization

#### 4.6.1 Authentication Enforcement

**Middleware/Route Handler:**
```typescript
// app/forms/[...slug]/page.tsx or middleware
export default async function FormPage({ params }) {
  const session = await auth();
  
  if (!session?.user) {
    const returnUrl = `/forms/${params.slug.join('/')}`;
    redirect(`/signin?returnUrl=${encodeURIComponent(returnUrl)}`);
  }
  
  // Continue with form rendering
}
```

#### 4.6.2 Authorization Checks

- **Entity/Geography Access**: Verify user's organization has access to form's entity/geography
- **Role-Based Access**: Different forms for suppliers vs procurement vs admins
- **Form Status**: Only allow access to active forms (`isActive = true`)

#### 4.6.3 Session Management

- Handle session expiration during form completion
- Show warning before session expires
- Auto-save before redirecting to sign-in
- Restore form state after re-authentication

---

## 5. UI/UX Requirements

### 5.1 Multi-Step Wizard Design

#### 5.1.1 Step Indicator

**Desktop Layout:**
```
[Step 1: Supplier Info] → [Step 2: Addresses] → [Step 3: Bank Info] → [Step 4: Documents] → [Step 5: Review]
   ✓ Completed            → In Progress          ○ Not Started          ○ Not Started        ○ Not Started
```

**Mobile Layout:**
```
Step 2 of 5: Addresses
[████████░░░░] 40% Complete
```

**Design Specifications:**
- Use Shadcn UI `Progress` component for mobile
- Use horizontal stepper for desktop (custom component)
- Color coding: Completed (green), Current (blue), Pending (gray)
- Show step labels with icons (optional)

#### 5.1.2 Step Content Layout

**Desktop:**
```
┌─────────────────────────────────────────────────┐
│ Step 2 of 5: Addresses                         │
│ [████████░░░░] 40% Complete                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  Remit-To Address                               │
│  ┌─────────────────────────────────────────┐   │
│  │ Address Line 1 *                         │   │
│  │ [___________________________]            │   │
│  │ Help: Enter the street address          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ City *                                   │   │
│  │ [___________________________]            │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Previous]              [Save Draft]  [Next →]│
└─────────────────────────────────────────────────┘
```

**Mobile:**
- Full-width form fields
- Stacked navigation buttons
- Sticky "Next" button at bottom
- Collapsible help text

#### 5.1.3 Navigation Controls

**Button Placement:**
- **Desktop**: Right-aligned button group at bottom of step
- **Mobile**: Sticky bottom bar with primary action

**Button States:**
- **Previous**: Always enabled (except on first step)
- **Next**: Enabled when current step is valid
- **Save Draft**: Always enabled, secondary style
- **Submit**: Only on final step, primary style

**Loading States:**
- Show spinner on buttons during save/submit
- Disable all buttons during async operations
- Show success toast on save

### 5.2 Field Design

#### 5.2.1 Input Fields

**Standard Input:**
- Label above input (not placeholder)
- Placeholder for examples/hints
- Help text below input (small, muted)
- Error message below help text (red)
- Required indicator: asterisk (*) or "Required" badge

**Field Spacing:**
- 24px gap between fields
- 16px gap between label and input
- 8px gap between input and help text
- 4px gap between help text and error

#### 5.2.2 Select Fields

- Use Shadcn UI `Select` component
- Show placeholder: "Select [field name]"
- Allow search/filter for long option lists (10+ items)
- Show selected value clearly

#### 5.2.3 Checkbox/Radio Groups

- Vertical stacking for options
- Clear labels for each option
- Group label above options
- Help text applies to entire group

#### 5.2.4 Date Fields

- Use date picker component (Shadcn UI or custom)
- Support date format based on geography
- Show calendar icon
- Validate date ranges if specified

#### 5.2.5 Sensitive Fields

- Mask displayed values (e.g., `****1234` for account numbers)
- Show "Reveal" toggle for viewing full value
- Use secure input styling (dotted/masked)
- Warn user about sensitive data handling

### 5.3 Error Handling

#### 5.3.1 Error States

**Field-Level Errors:**
- Red border on input
- Error icon (optional)
- Error message in red text below field
- Focus on first error field automatically

**Step-Level Errors:**
- Error summary at top of step
- List of fields with errors
- Click to scroll to error field
- Prevent step advancement

**Form-Level Errors:**
- Toast notification for save/submit errors
- Error banner at top of form
- Retry mechanism for network errors

#### 5.3.2 Success Feedback

- Toast notification on successful save
- Checkmark animation on step completion
- Progress bar updates
- Confirmation screen on submission

### 5.4 Responsive Design

#### 5.4.1 Breakpoints

- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (md-lg)
- **Desktop**: > 1024px (xl)

#### 5.4.2 Mobile Optimizations

- Single column layout
- Larger touch targets (min 44x44px)
- Sticky navigation bar
- Collapsible sections
- Bottom sheet for long option lists
- Full-screen modals for date pickers

#### 5.4.3 Tablet Optimizations

- Two-column layout for related fields
- Side-by-side navigation buttons
- Optimized step indicator

#### 5.4.4 Desktop Optimizations

- Multi-column layouts where appropriate
- Sidebar for progress/help (optional)
- Keyboard shortcuts (Tab navigation, Enter to submit)
- Hover states for interactive elements

### 5.5 Accessibility (WCAG 2.1 AA)

#### 5.5.1 Keyboard Navigation

- Tab order follows visual order
- Enter key submits form/advances step
- Escape key cancels/closes modals
- Arrow keys navigate radio/select options

#### 5.5.2 Screen Reader Support

- Proper `<label>` associations
- `aria-describedby` for help text
- `aria-invalid` for error states
- `aria-live` regions for dynamic updates
- `role="alert"` for error messages

#### 5.5.3 Visual Accessibility

- Color contrast ratio ≥ 4.5:1 for text
- Color contrast ratio ≥ 3:1 for UI components
- Don't rely solely on color for information
- Focus indicators visible (2px outline)
- Text resizable up to 200% without horizontal scrolling

### 5.6 Loading & Performance

#### 5.6.1 Loading States

- Skeleton screens for form loading
- Spinner for step transitions
- Optimistic UI updates for saves
- Progress indicator for file uploads

#### 5.6.2 Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Form Load Time**: < 2s (including data fetch)
- **Save Response Time**: < 500ms
- **Step Transition**: < 200ms (no perceived delay)

#### 5.6.3 Optimization Strategies

- Code splitting for form components
- Lazy load step content
- Debounce autosave (2s)
- Optimistic updates
- Cache form configurations
- Prefetch next step data

---

## 6. Technical Architecture

### 6.1 Component Structure

```
app/
  forms/
    [entityCode]/
      [geographyCode]/
        page.tsx                    # Server component: fetch form config, auth check
        loading.tsx                 # Loading skeleton
        error.tsx                   # Error boundary
    [formConfigId]/
      page.tsx                      # Alternative route: direct form ID access
  supplier/
    onboarding/
      [applicationId]/
        page.tsx                    # Existing route: application-specific form

components/
  forms/
    dynamic-form-wizard.tsx         # Main wizard container (client component)
    form-step.tsx                   # Individual step renderer
    form-field-renderer.tsx         # Field type renderer (switches on type)
    step-indicator.tsx              # Progress/step navigation UI
    form-navigation.tsx             # Previous/Next/Save buttons
    field-input-text.tsx            # Text input component
    field-input-select.tsx          # Select component
    field-input-checkbox.tsx        # Checkbox component
    field-input-date.tsx            # Date picker component
    form-error-summary.tsx           # Error display component
    draft-save-indicator.tsx         # "Draft saved" feedback
  ui/                               # Existing Shadcn UI components

lib/
  forms/
    form-renderer.ts                # Core rendering logic
    form-validator.ts               # Validation utilities
    form-state.ts                   # State management utilities
    visibility-engine.ts            # Conditional field visibility
    draft-manager.ts                # Draft save/load logic
```

### 6.2 Data Flow

```
1. User navigates to /forms/unimacts/us
   ↓
2. Server Component (page.tsx)
   - Check authentication (redirect if needed)
   - Fetch FormConfig from database
   - Fetch existing Application (if applicationId provided)
   - Pass data to client component
   ↓
3. Client Component (dynamic-form-wizard.tsx)
   - Initialize form state from config
   - Render step indicator
   - Render current step fields
   - Handle user interactions
   ↓
4. User Input
   - Update form state
   - Validate field (on blur/change)
   - Evaluate visibility rules
   - Trigger autosave (debounced)
   ↓
5. Step Navigation
   - Validate current step
   - Save data
   - Update current step
   - Re-render new step
   ↓
6. Form Submission
   - Full form validation
   - Server action: create/update Application
   - Update status to SUBMITTED
   - Redirect to confirmation page
```

### 6.3 State Management

**React State (Client):**
- Form data: `Record<string, unknown>`
- Current step: `number`
- Errors: `Record<string, string>`
- Touched fields: `Set<string>`
- Visibility state: `Record<string, boolean>`

**Server State:**
- Form configuration (fetched once, cached)
- Application data (fetched on load, updated on save)
- User session (checked on each request)

**Persistence:**
- LocalStorage: Temporary draft backup (optional)
- Database: Primary draft storage in `Application.data`
- URL: Step position in query param (optional)

### 6.4 API/Server Actions

```typescript
// app/forms/actions.ts

export async function saveFormDraft(
  formConfigId: string,
  applicationId: string | null,
  formData: Record<string, unknown>
) {
  // Validate session
  // Create or update Application
  // Save formData to Application.data
  // Return applicationId
}

export async function submitForm(
  applicationId: string,
  formData: Record<string, unknown>
) {
  // Validate full form
  // Update Application status to SUBMITTED
  // Create audit log entry
  // Send notifications
  // Return success
}

export async function fetchFormConfig(
  entityCode: string,
  geographyCode: string,
  version?: number
) {
  // Query FormConfig from database
  // Return with sections and fields
}
```

### 6.5 Error Handling

**Error Types:**
- **Authentication Errors**: Redirect to sign-in
- **Authorization Errors**: Show "Access Denied" message
- **Form Not Found**: 404 page
- **Validation Errors**: Display inline
- **Network Errors**: Retry mechanism, offline detection
- **Server Errors**: Error boundary, fallback UI

**Error Boundaries:**
- Wrap form wizard in error boundary
- Show friendly error message
- Provide "Retry" and "Contact Support" options
- Log errors to monitoring service

---

## 7. Implementation Plan

### 7.1 Phase 1: Core Infrastructure (Week 1)

**Tasks:**
1. Create route structure (`/forms/[entityCode]/[geographyCode]`)
2. Implement authentication middleware/check
3. Build form config fetching logic
4. Create basic form wizard container component
5. Implement step indicator component

**Deliverables:**
- Routes accessible with auth enforcement
- Form config fetched and passed to client
- Basic wizard structure (no fields yet)

### 7.2 Phase 2: Field Rendering (Week 2)

**Tasks:**
1. Build `FormFieldRenderer` component with type switching
2. Implement text, email, number, textarea inputs
3. Implement select, checkbox, radio components
4. Implement date picker integration
5. Add field labels, help text, placeholders

**Deliverables:**
- All field types render correctly
- Fields display with proper styling
- Basic form layout functional

### 7.3 Phase 3: Validation & State (Week 3)

**Tasks:**
1. Integrate Zod schema generation
2. Implement field-level validation
3. Implement step-level validation
4. Build error display components
5. Add form state management (React state)

**Deliverables:**
- Validation works for all field types
- Errors display correctly
- Form state updates properly

### 7.4 Phase 4: Multi-Step Navigation (Week 4)

**Tasks:**
1. Implement step navigation logic
2. Add Previous/Next button handlers
3. Implement step validation on advance
4. Add progress tracking
5. Build step completion indicators

**Deliverables:**
- Users can navigate between steps
- Progress tracking works
- Step validation prevents invalid advancement

### 7.5 Phase 5: Draft Persistence (Week 5)

**Tasks:**
1. Implement autosave logic (debounced)
2. Build draft save server action
3. Implement draft load on form mount
4. Add "Save Draft" explicit button
5. Handle resume flow (existing drafts)

**Deliverables:**
- Forms autosave every 2 seconds
- Drafts persist to database
- Users can resume incomplete forms

### 7.6 Phase 6: Conditional Fields (Week 6)

**Tasks:**
1. Build visibility rule evaluation engine
2. Implement field show/hide logic
3. Handle dependent field updates
4. Test complex conditional scenarios
5. Add visibility rule documentation

**Deliverables:**
- Conditional fields work correctly
- Complex visibility rules supported
- Performance optimized (no unnecessary re-renders)

### 7.7 Phase 7: Responsive Design & Polish (Week 7)

**Tasks:**
1. Implement mobile-responsive layouts
2. Optimize for tablet viewports
3. Add loading states and skeletons
4. Implement success/error toasts
5. Polish animations and transitions
6. Accessibility audit and fixes

**Deliverables:**
- Forms work perfectly on all devices
- Smooth animations and transitions
- WCAG 2.1 AA compliant

### 7.8 Phase 8: Testing & Documentation (Week 8)

**Tasks:**
1. Write unit tests for form components
2. Write integration tests for form flows
3. E2E tests for critical paths
4. Update API documentation
5. Create user guide/documentation
6. Performance testing and optimization

**Deliverables:**
- Comprehensive test coverage
- Documentation complete
- Performance targets met

---

## 8. Acceptance Criteria

### 8.1 Functional Criteria

✅ **AC-1: Form Rendering**
- Forms render correctly from any `FormConfig` in database
- All field types display and function properly
- Field ordering matches database configuration
- Sections group fields correctly

✅ **AC-2: Static Links**
- Users can access forms via `/forms/[entity]/[geography]` URL
- Links are shareable and bookmarkable
- Form state persists across page refreshes
- Direct form ID links work: `/forms/[formConfigId]`

✅ **AC-3: Authentication**
- Unauthenticated users redirected to sign-in
- Return URL preserved and used after sign-in
- Authenticated users can access forms
- Session expiration handled gracefully

✅ **AC-4: Multi-Step Wizard**
- Users can navigate between steps
- Progress indicator shows current position
- Step validation prevents invalid advancement
- Completed steps are marked visually

✅ **AC-5: Validation**
- Field-level validation works for all types
- Step-level validation prevents advancement if errors
- Error messages are clear and actionable
- Validation triggers at appropriate times (blur, change, submit)

✅ **AC-6: Draft Persistence**
- Forms autosave every 2 seconds of inactivity
- Explicit "Save Draft" button works
- Drafts load correctly on form resume
- Multiple drafts per user supported

✅ **AC-7: Conditional Fields**
- Fields show/hide based on visibility rules
- Dependent field updates trigger re-evaluation
- Hidden fields preserve their values
- Complex conditional logic works correctly

### 8.2 UX Criteria

✅ **AC-8: Design Quality**
- Forms follow design system (Shadcn UI, Tailwind)
- Consistent spacing, typography, colors
- Professional, polished appearance
- Matches existing application design language

✅ **AC-9: Responsive Design**
- Forms work perfectly on mobile (< 640px)
- Forms work perfectly on tablet (640-1024px)
- Forms work perfectly on desktop (> 1024px)
- Touch targets are appropriately sized
- Layout adapts to screen size

✅ **AC-10: Accessibility**
- WCAG 2.1 AA compliant
- Keyboard navigation works
- Screen reader compatible
- Focus management correct
- Color contrast meets standards

✅ **AC-11: Performance**
- Form loads in < 2 seconds
- Step transitions are smooth (< 200ms)
- Autosave doesn't block UI
- No jank or lag during interactions

### 8.3 Technical Criteria

✅ **AC-12: Code Quality**
- TypeScript with no `any` types
- Components are reusable and modular
- Error handling is comprehensive
- Code follows project conventions

✅ **AC-13: Testing**
- Unit tests for all form components
- Integration tests for form flows
- E2E tests for critical user paths
- Test coverage > 80%

✅ **AC-14: Documentation**
- Component documentation (JSDoc)
- API documentation updated
- User guide created
- Developer guide for extending forms

---

## 9. Risks & Mitigations

### 9.1 Technical Risks

**Risk: Complex Conditional Logic Performance**
- **Impact**: High - Forms with many conditional fields may lag
- **Mitigation**: Optimize visibility evaluation, use React.memo, debounce updates
- **Contingency**: Implement virtual scrolling for large forms

**Risk: Form Config Schema Changes**
- **Impact**: Medium - Breaking changes to FormConfig structure
- **Mitigation**: Version form configs, maintain backward compatibility
- **Contingency**: Migration script for existing configs

**Risk: Validation Complexity**
- **Impact**: Medium - Complex validation rules may be hard to implement
- **Mitigation**: Start with basic validation, extend incrementally
- **Contingency**: Custom validation hook for edge cases

### 9.2 UX Risks

**Risk: Mobile Form Complexity**
- **Impact**: High - Multi-step forms may be cumbersome on mobile
- **Mitigation**: Optimize mobile layout, consider bottom sheets, simplify navigation
- **Contingency**: Single-page mobile view option

**Risk: User Confusion with Conditional Fields**
- **Impact**: Medium - Users may not understand why fields appear/disappear
- **Mitigation**: Clear help text, smooth transitions, visual indicators
- **Contingency**: "Why is this field required?" tooltips

### 9.3 Business Risks

**Risk: Adoption of New Form System**
- **Impact**: Medium - Users may prefer old hardcoded forms
- **Mitigation**: Ensure new forms are clearly better (UX, features)
- **Contingency**: Gradual migration, A/B testing

**Risk: Form Configuration Errors**
- **Impact**: High - Admin misconfiguration breaks forms
- **Mitigation**: Form config validation, preview mode, test environment
- **Contingency**: Rollback mechanism, form versioning

---

## 10. Success Metrics

### 10.1 User Metrics

- **Form Completion Rate**: Target > 80% (vs baseline)
- **Time to Complete**: Target < 15 minutes for average form
- **Draft Resume Rate**: Target > 60% of started forms completed
- **Error Rate**: Target < 5% of submissions have validation errors
- **Mobile Usage**: Track % of forms completed on mobile

### 10.2 Technical Metrics

- **Form Load Time**: Target < 2s (p95)
- **Step Transition Time**: Target < 200ms (p95)
- **Autosave Success Rate**: Target > 99%
- **Error Rate**: Target < 0.1% of form interactions
- **Uptime**: Target > 99.9%

### 10.3 Business Metrics

- **Form Adoption**: % of applications using new dynamic forms
- **Support Tickets**: Reduction in form-related support requests
- **Admin Efficiency**: Time to create/update forms (target 50% reduction)

---

## 11. Open Questions & Future Enhancements

### 11.1 Open Questions

1. **Form Versioning UI**: How should admins manage form versions in UI?
2. **Multi-Language**: When should we add i18n support for form labels?
3. **Offline Support**: Is offline form completion a requirement?
4. **Form Analytics**: What analytics should we track (field-level abandonment, etc.)?
5. **A/B Testing**: Should we support A/B testing different form configurations?

### 11.2 Future Enhancements (v2+)

- **Form Builder UI**: Visual form builder for admins
- **Advanced Field Types**: Signature, rich text, matrix/grid fields
- **Form Templates**: Pre-built form templates for common scenarios
- **Conditional Logic Builder**: Visual UI for building visibility rules
- **Form Analytics Dashboard**: Insights into form performance
- **Multi-Language Support**: i18n for form labels and help text
- **Offline Mode**: Service worker for offline form completion
- **Form Versioning UI**: Manage and compare form versions
- **Custom Validation Rules UI**: Visual builder for complex validation
- **Form Preview Mode**: Test forms before publishing

---

## 12. References & Resources

### 12.1 Design References

- [Material Design Forms](https://material.io/components/text-fields)
- [Ant Design Form Patterns](https://ant.design/components/form)
- [Form Design Best Practices](https://www.nngroup.com/articles/web-form-design/)
- [Multi-Step Form UX](https://www.smashingmagazine.com/2017/06/designing-efficient-web-forms/)

### 12.2 Technical References

- [React Hook Form](https://react-hook-form.com/) - Form state management library (consideration)
- [Zod Documentation](https://zod.dev/) - Schema validation
- [Shadcn UI Components](https://ui.shadcn.com/) - UI component library
- [Next.js App Router](https://nextjs.org/docs/app) - Routing framework

### 12.3 Accessibility References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Appendix A: Example Form Configuration

```json
{
  "id": "clx123abc456",
  "entity": { "code": "unimacts", "name": "Unimacts" },
  "geography": { "code": "us", "name": "United States" },
  "version": 1,
  "isActive": true,
  "title": "US Supplier Onboarding Form",
  "sections": [
    {
      "id": "sec1",
      "key": "supplier_info",
      "label": "Supplier Information",
      "order": 1,
      "fields": [
        {
          "id": "f1",
          "key": "supplier_name",
          "label": "Supplier Name",
          "type": "text",
          "required": true,
          "placeholder": "Enter your company name",
          "helpText": "This is the legal name of your company",
          "order": 1
        },
        {
          "id": "f2",
          "key": "payment_terms",
          "label": "Payment Terms",
          "type": "select",
          "required": true,
          "options": {
            "values": ["Net 30", "Net 60", "Net 90", "Due on Receipt"]
          },
          "order": 2
        }
      ]
    },
    {
      "id": "sec2",
      "key": "addresses",
      "label": "Addresses",
      "order": 2,
      "fields": [
        {
          "id": "f3",
          "key": "remit_address_line1",
          "label": "Remit-To Address Line 1",
          "type": "text",
          "required": true,
          "order": 1
        },
        {
          "id": "f4",
          "key": "ordering_same_as_remit",
          "label": "Ordering address same as remit-to?",
          "type": "checkbox",
          "required": false,
          "order": 2,
          "visibility": {
            "dependsOn": "remit_address_line1",
            "condition": "isNotEmpty",
            "value": null
          }
        },
        {
          "id": "f5",
          "key": "ordering_address_line1",
          "label": "Ordering Address Line 1",
          "type": "text",
          "required": true,
          "order": 3,
          "visibility": {
            "dependsOn": "ordering_same_as_remit",
            "condition": "equals",
            "value": false
          }
        }
      ]
    }
  ]
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: Product/Engineering Team  
**Status**: Ready for Implementation
```

This PRD covers:

1. Dynamic form rendering from database configs
2. Static, shareable form links
3. Authentication enforcement with redirects
4. Multi-step wizard with progress tracking
5. Responsive design for all devices
6. Design practices and accessibility

The document is structured for implementation and includes technical architecture, component structure, and a phased implementation plan. Should I create any additional documentation or clarify any sections?
