---
description: Implementation Plan - Email Sign-Up with OTP Authentication
---

# Email Sign-Up with OTP Authentication - Implementation Plan

## Overview
Add email-based authentication using One-Time Password (OTP) verification alongside the existing Google OAuth provider. This ensures email verification and provides a password-free authentication method.

## Current State Analysis

### Existing Authentication Setup
- **Provider**: Google OAuth only
- **Auth Library**: NextAuth.js v4.24.13
- **Adapter**: Prisma Adapter
- **Session Strategy**: Database sessions
- **Database**: PostgreSQL with Prisma ORM
- **Sign-in Page**: Custom `/signin` page with `SignInCard` component

### Existing Schema Support
The current Prisma schema already supports email authentication:
- `User` model has `email` and `emailVerified` fields
- `Account` model for OAuth providers
- `VerificationToken` model (currently used for CSRF, can be extended for OTP)
- `Session` model for session management

## Implementation Plan

### Phase 1: Backend Infrastructure

#### 1.1 Database Schema Updates
**File**: `prisma/schema.prisma`

**Changes Needed**:
- **Extend VerificationToken model** to support OTP with metadata:
  - Add `type` field to distinguish between different token types (OTP, magic-link, etc.)
  - Add `attempts` field to track verification attempts
  - Add `metadata` JSON field for additional data (e.g., user agent, IP)

**New Migration**:
```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  type       String   @default("email_verification") // "otp", "magic_link", etc.
  attempts   Int      @default(0)
  metadata   Json?
  createdAt  DateTime @default(now())

  @@unique([identifier, token])
  @@index([identifier, type])
}
```

#### 1.2 Email Service Setup
**New Files**:
- `lib/email/email-service.ts` - Email sending abstraction
- `lib/email/templates/otp-email.ts` - OTP email template
- `lib/email/providers/` - Email provider implementations

**Email Provider Options** (choose one):
1. **Resend** (Recommended - simple, modern, generous free tier)
2. **SendGrid** (Enterprise-ready)
3. **AWS SES** (Cost-effective for high volume)
4. **Nodemailer + SMTP** (Self-hosted option)

**Dependencies to Add**:
```json
{
  "resend": "^4.0.0" // or alternative provider
}
```

**Environment Variables**:
```env
# Email Service
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="re_xxxxxx"
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
```

#### 1.3 OTP Generation & Validation Service
**New File**: `lib/auth/otp-service.ts`

**Key Functions**:
- `generateOTP(length?: number): string` - Generate 6-digit OTP
- `sendOTP(email: string): Promise<void>` - Generate and send OTP
- `verifyOTP(email: string, otp: string): Promise<boolean>` - Validate OTP
- `cleanupExpiredTokens(): Promise<void>` - Cleanup job for expired OTPs

**Security Features**:
- Rate limiting per email (max 3 OTPs per 15 minutes)
- OTP expiry (10 minutes default)
- Maximum verification attempts (3 attempts per OTP)
- Cryptographically secure random OTP generation
- Hash OTPs before storing in database

#### 1.4 NextAuth Email Provider Configuration
**File**: `lib/auth.ts`

**Changes**:
- Import NextAuth `EmailProvider`
- Configure custom `sendVerificationRequest` function
- Update `authOptions.providers` array to include email provider
- Add email provider callbacks for user creation

**Updated Configuration**:
```typescript
import EmailProvider from "next-auth/providers/email";

providers: [
  googleProvider,
  EmailProvider({
    from: process.env.EMAIL_FROM,
    sendVerificationRequest: async ({ identifier: email, url, token }) => {
      // Custom OTP sending logic
      await sendOTP(email);
    },
  }),
]
```

### Phase 2: API Routes

#### 2.1 OTP Request API
**New File**: `app/api/auth/otp/send/route.ts`

**Functionality**:
- Validate email format
- Check rate limits
- Generate and send OTP
- Return success/error response

**Request**:
```typescript
POST /api/auth/otp/send
{
  "email": "user@example.com"
}
```

**Response**:
```typescript
{
  "success": true,
  "message": "OTP sent to email",
  "expiresIn": 600 // seconds
}
```

#### 2.2 OTP Verification API
**New File**: `app/api/auth/otp/verify/route.ts`

**Functionality**:
- Validate OTP against stored token
- Check expiry and attempts
- Create/update user account
- Create session via NextAuth
- Return session token

**Request**:
```typescript
POST /api/auth/otp/verify
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response**:
```typescript
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### 2.3 Rate Limiting Middleware
**New File**: `lib/rate-limit.ts`

**Functionality**:
- In-memory rate limiting (or Redis for production)
- Per-email and per-IP limiting
- Configurable windows and limits

**Implementation Options**:
- Simple in-memory Map with cleanup (development)
- Upstash Redis (production) - add `@upstash/redis` and `@upstash/ratelimit`

### Phase 3: Frontend Components

#### 3.1 Update Sign-In Card Component
**File**: `components/auth/signin-card.tsx`

**Changes**:
- Add tabbed interface or toggle between Google and Email auth
- Add email input field
- Add OTP input field (6-digit, auto-focus)
- Add state management for auth flow steps
- Add loading states and error handling

**Flow States**:
1. Initial state: Email input + "Continue with Google" button
2. OTP sent state: OTP input + resend button
3. Loading states: Sending OTP, Verifying OTP
4. Error states: Invalid email, OTP expired, wrong OTP

#### 3.2 Email Input Component
**New File** (Optional): `components/auth/email-input.tsx`

**Features**:
- Email validation
- Accessible form controls
- Loading state during OTP send
- Success feedback

#### 3.3 OTP Input Component
**New File**: `components/auth/otp-input.tsx`

**Features**:
- 6-digit input with auto-advance
- Paste support
- Auto-submit on complete
- Countdown timer for expiry
- Resend OTP functionality
- Visual feedback for invalid OTP

**Recommended Library**: `input-otp` or build custom

**Dependencies** (optional):
```json
{
  "input-otp": "^1.2.4"
}
```

### Phase 4: UI/UX Enhancements

#### 4.1 Sign-In Page Layout
**File**: `components/auth/signin-card.tsx`

**Design Considerations**:
- Clear visual separation between Google and Email auth
- Progressive disclosure (show OTP input only after email submitted)
- Helpful micro-copy (e.g., "Check your email for the code")
- Accessibility (ARIA labels, keyboard navigation)
- Mobile-friendly input (numeric keyboard for OTP)

**Suggested Layout**:
```
┌─────────────────────────────┐
│   Sign in to Supplier Hub   │
├─────────────────────────────┤
│                             │
│  [Email Input Field]        │
│  [Continue with Email] →    │
│                             │
│  ─────── or ───────         │
│                             │
│  [Continue with Google] 🔵  │
│                             │
└─────────────────────────────┘
```

**After email submitted**:
```
┌─────────────────────────────┐
│   Check your email          │
├─────────────────────────────┤
│  We sent a code to          │
│  user@example.com           │
│                             │
│  [  ][  ][  ][  ][  ][  ]  │
│                             │
│  Didn't receive?            │
│  [Resend code] (in 30s)     │
│                             │
│  [← Back]                   │
└─────────────────────────────┘
```

#### 4.2 Error Handling & User Feedback
**Toast Notifications**:
- "OTP sent to your email"
- "Invalid OTP. Please try again"
- "OTP expired. Request a new one"
- "Too many attempts. Please try again later"
- "Email signed in successfully"

### Phase 5: Security & Validation

#### 5.1 Email Validation
**File**: `lib/validation/email-validation.ts`

**Validation Rules**:
- RFC 5322 compliant email format
- Domain validation (optional: check MX records)
- Disposable email detection (optional)
- Organization domain whitelist (optional for internal use)

#### 5.2 Rate Limiting Strategy
**Per Email**:
- Max 3 OTP requests per 15 minutes
- Max 3 verification attempts per OTP

**Per IP**:
- Max 10 OTP requests per hour
- Protection against enumeration attacks

#### 5.3 Security Best Practices
- **Hash OTPs**: Store bcrypt/argon2 hashed OTPs in database
- **HTTPS Only**: Ensure all auth flows over HTTPS
- **CSRF Protection**: Leverage NextAuth's built-in CSRF protection
- **Secure Cookies**: httpOnly, secure, sameSite cookies
- **Audit Logging**: Log authentication attempts in `AuditLog` table

### Phase 6: Testing

#### 6.1 Unit Tests
**New Files**:
- `lib/auth/__tests__/otp-service.test.ts`
- `lib/email/__tests__/email-service.test.ts`
- `lib/validation/__tests__/email-validation.test.ts`

**Test Cases**:
- OTP generation (format, uniqueness)
- OTP validation (valid, expired, invalid, max attempts)
- Email sending (mocked)
- Rate limiting logic

#### 6.2 Integration Tests
**New File**: `e2e/auth/email-otp.spec.ts`

**Test Scenarios**:
1. Complete email sign-in flow
2. OTP expiry handling
3. Invalid OTP handling
4. Resend OTP functionality
5. Rate limiting enforcement
6. Email verification on first sign-in

#### 6.3 E2E Tests with Playwright
**Test Flow**:
1. Navigate to /signin
2. Enter email
3. Submit email form
4. Intercept OTP email (use test email provider or mock)
5. Enter OTP
6. Verify successful sign-in
7. Check session creation

### Phase 7: Documentation & Deployment

#### 7.1 Environment Variables Documentation
**Update**: `env.example`

Add:
```env
# Email Authentication
EMAIL_FROM="noreply@yourdomain.com"
RESEND_API_KEY="re_xxxxxx"
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3
OTP_LENGTH=6

# Rate Limiting (optional - for Redis)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

#### 7.2 README Updates
**File**: `README.md`

**Add Section**:
- Email authentication setup instructions
- Email provider setup (Resend/SendGrid/etc.)
- OTP configuration options
- Testing with development email tools (MailHog, Ethereal, etc.)

#### 7.3 Deployment Checklist
- [ ] Set up email service provider (Resend/SendGrid)
- [ ] Configure DNS records (SPF, DKIM, DMARC for email deliverability)
- [ ] Set production environment variables
- [ ] Test email delivery in staging
- [ ] Set up monitoring for email delivery failures
- [ ] Configure rate limiting (Redis for production)
- [ ] Run database migrations
- [ ] Test complete auth flow in production

## Technical Decisions & Tradeoffs

### 1. Email Provider Choice
**Recommendation**: Resend
- **Pros**: Modern API, React email templates, generous free tier (3K emails/month), excellent DX
- **Cons**: Newer service, less enterprise features than SendGrid

**Alternative**: SendGrid
- **Pros**: Battle-tested, enterprise features, high deliverability
- **Cons**: More complex API, higher cost

### 2. OTP Storage
**Approach**: Hash OTPs with bcrypt before storing
- **Security**: Prevents OTP theft if database compromised
- **Performance**: Slightly slower verification (~100ms)
- **Alternative**: Store plaintext (NOT recommended for production)

### 3. Rate Limiting
**Development**: In-memory Map with TTL
**Production**: Upstash Redis (serverless, edge-compatible)
- **Pros**: Persistent, distributed, compatible with serverless
- **Cons**: Additional service dependency

### 4. OTP Delivery Method
**Email**: Primary method
**SMS**: Future enhancement (requires Twilio/AWS SNS)
- **Email Pros**: Free, async, can include branding
- **Email Cons**: Slower delivery, spam folder risk
- **SMS Pros**: Instant, higher open rate
- **SMS Cons**: Cost per message, requires phone number

### 5. Session Strategy
**Continue with**: Database sessions (already configured)
- **Pros**: Works with both OAuth and email auth, server-side control
- **Cons**: Database query per request
- **Alternative**: JWT sessions (stateless but requires strategy change)

## Migration Strategy

### For Existing Users
Current users authenticate with Google OAuth only. No migration needed as:
1. Email auth is additive, not replacement
2. Existing users can continue using Google
3. Users can link email authentication to existing account (handled by NextAuth adapter)
4. Email field already exists in User model

### Database Migration
1. Run migration to update `VerificationToken` model
2. Zero downtime - new fields have defaults
3. No data migration needed

## Estimated Effort

| Phase | Component | Effort | Priority |
|-------|-----------|--------|----------|
| 1 | Database schema updates | 1 hour | P0 |
| 1 | Email service setup | 2 hours | P0 |
| 1 | OTP service implementation | 3 hours | P0 |
| 1 | NextAuth configuration | 2 hours | P0 |
| 2 | API routes | 3 hours | P0 |
| 2 | Rate limiting | 2 hours | P1 |
| 3 | UI components | 4 hours | P0 |
| 4 | UX improvements | 2 hours | P1 |
| 5 | Security hardening | 2 hours | P0 |
| 6 | Testing | 4 hours | P1 |
| 7 | Documentation | 1 hour | P1 |

**Total Estimated Effort**: 26 hours (~3-4 days)

## Success Metrics

### Functional Metrics
- [ ] Users can sign up with email
- [ ] OTP delivered within 30 seconds
- [ ] OTP verification success rate > 95%
- [ ] Rate limiting prevents abuse

### Non-Functional Metrics
- [ ] Email deliverability > 98%
- [ ] Zero security vulnerabilities
- [ ] Mobile-friendly OTP input
- [ ] Accessible (WCAG 2.1 AA compliant)

## Future Enhancements

### Phase 8 (Future)
1. **SMS OTP**: Alternative to email OTP
2. **Magic Links**: Passwordless link-based auth
3. **Social Providers**: GitHub, Microsoft, etc.
4. **Remember Device**: Reduce OTP frequency for trusted devices
5. **Biometric Auth**: WebAuthn/Passkeys support
6. **Admin Controls**: Require email verification for certain roles
7. **Email Templates**: Rich HTML templates with branding

## References

### Documentation
- [NextAuth.js Email Provider](https://next-auth.js.org/providers/email)
- [Resend Docs](https://resend.com/docs)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

### Libraries
- `next-auth` - Already installed
- `resend` - To be installed
- `input-otp` - Optional, for OTP input component
- `@upstash/redis` + `@upstash/ratelimit` - For production rate limiting

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Email deliverability issues | High | Use reputable provider (Resend), configure SPF/DKIM/DMARC |
| OTP abuse (enumeration) | Medium | Rate limiting per email and IP |
| Users can't access email | Medium | Fallback to Google OAuth, support email |
| Email arrives late | Low | Set generous expiry (10 min), allow resend |
| Database token table growth | Low | Scheduled cleanup job for expired tokens |

## Getting Started

To implement this plan:
1. Review and approve this plan
2. Set up email service provider account (Resend recommended)
3. Start with Phase 1: Backend Infrastructure
4. Implement phases sequentially
5. Test thoroughly at each phase
6. Deploy to staging for QA
7. Deploy to production

---

**Plan Created**: 2025-11-26  
**Author**: Antigravity AI  
**Status**: Pending Approval
