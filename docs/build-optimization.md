# Build Optimization Guide

## Overview

This document explains the optimizations made to resolve memory issues during the Next.js build process and provides guidance on type checking workflows.

## Problem

The project was experiencing "JavaScript heap out of memory" errors during `npm run build`. The build process would crash after ~7 minutes during the TypeScript type checking phase, with the heap reaching ~4GB.

### Root Cause

The issue was caused by:
- **Large Prisma-generated types**: The Prisma schema with 18 models, complex relations, and JSON fields generates a 42,174-line type definition file
- **Memory-intensive TypeScript analysis**: TypeScript's type checker exhausts available memory when analyzing these large generated types during the build

## Solution

We've implemented several optimizations to resolve this issue:

### 1. Separated Type Checking from Build

**File: `next.config.ts`**
- Added `typescript.ignoreBuildErrors: true` to skip type checking during build
- This allows the build to complete without running out of memory
- Type checking is now done separately (see below)

### 2. Optimized TypeScript Configuration

**File: `tsconfig.json`**
- `skipLibCheck: true` - Skips type checking of declaration files (already enabled)
- `incremental: true` - Uses incremental compilation for faster subsequent builds (already enabled)
- `noUnusedLocals: false` - Reduces analysis overhead
- `noUnusedParameters: false` - Reduces analysis overhead

### 3. Added Type Check Script

**File: `package.json`**
- New script: `npm run type-check` - Runs TypeScript type checking separately with increased memory
- Uses `NODE_OPTIONS='--max-old-space-size=8192'` to allocate 8GB heap for type checking
- This can be run on-demand or in CI/CD pipelines

### 4. Optimized Prisma Configuration

**File: `prisma/schema.prisma`**
- Removed deprecated preview features
- Using Prisma v6.19.0 with stable features for optimal type generation

### 5. Removed Redundant Dependencies

**File: `package.json`**
- Removed `baseline-browser-mapping` from devDependencies
- It's already included as a transitive dependency via `eslint-config-next`
- Reduces direct dependency count and potential version conflicts

## Usage

### Building for Production

```bash
npm run build
```

This will now complete successfully without memory errors. Type errors will not block the build.

### Type Checking

To check for TypeScript errors, run:

```bash
npm run type-check
```

This runs `tsc --noEmit` to check types without building. Use this:
- Before committing code
- In your IDE for real-time feedback
- In CI/CD pipelines (recommended)

### Development Workflow

During development:
1. Run `npm run dev` as usual
2. Your IDE will show type errors in real-time
3. Run `npm run type-check` before committing to catch any type issues
4. Build will succeed even with type errors (but fix them!)

## CI/CD Integration

### Recommended Pipeline

```yaml
# Example for GitHub Actions, GitLab CI, etc.
steps:
  - name: Install dependencies
    run: npm ci
  
  - name: Generate Prisma Client
    run: npm run prisma:generate
  
  - name: Type Check
    run: npm run type-check
  
  - name: Lint
    run: npm run lint
  
  - name: Run Tests
    run: npm run test
  
  - name: Build
    run: npm run build
```

### Why Separate Type Checking?

1. **Build Success**: Builds complete without memory issues
2. **Faster Feedback**: Type checking can run in parallel with other checks
3. **Better Control**: You can configure type checking differently than builds
4. **Standard Pattern**: Used by many large Next.js projects (Vercel, etc.)

## Trade-offs

### Pros
- ✅ Builds complete successfully without memory errors
- ✅ Faster build times (no type checking overhead)
- ✅ More control over when type checking happens
- ✅ Standard pattern used by large-scale Next.js applications

### Cons
- ⚠️ Type errors won't block builds (must catch in CI/CD or pre-commit hooks)
- ⚠️ Developers must remember to run `npm run type-check` separately
- ⚠️ Potential for deploying code with type errors if CI/CD isn't configured properly

## Best Practices

1. **Always run type checking in CI/CD** - Make it a required check before merging PRs
2. **Use pre-commit hooks** - Consider adding type checking to git hooks
3. **IDE Integration** - Ensure your IDE's TypeScript language server is running for real-time feedback
4. **Regular checks** - Run `npm run type-check` before committing significant changes

## Monitoring

### If Memory Issues Return

If you encounter memory issues again, consider:

1. **Increase Node.js memory limit further**:
   The type-check script already uses 8GB. If needed, you can increase this in `package.json`:
   ```json
   "type-check": "NODE_OPTIONS='--max-old-space-size=16384' tsc --noEmit"
   ```

2. **Review Prisma schema complexity**:
   - Simplify complex relations where possible
   - Consider splitting large JSON fields
   - Review if all relations are necessary

3. **Update dependencies**:
   - Keep Prisma, TypeScript, and Next.js updated
   - Newer versions often have performance improvements

## Additional Resources

- [Next.js TypeScript Configuration](https://nextjs.org/docs/app/building-your-application/configuring/typescript)
- [Prisma Performance Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [TypeScript Performance](https://github.com/microsoft/TypeScript/wiki/Performance)

## Support

If you encounter issues with this setup:
1. Check that all dependencies are up to date
2. Verify `npm run type-check` passes
3. Review CI/CD pipeline configuration
4. Contact the development team for assistance
