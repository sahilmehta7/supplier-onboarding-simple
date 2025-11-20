# E2E Testing Quick Checklist

**Quick reference for test execution**  
**Full details:** See `docs/e2e-testing-plan.md`

---

## Pre-Test Setup

- [ ] Test database seeded
- [ ] Test users created (Supplier, Procurement, Admin, Member)
- [ ] Test organizations created
- [ ] Test form configurations created
- [ ] Browser DevTools ready
- [ ] Screenshot tool ready
- [ ] Bug tracking ready

---

## Scenario 1: Complete Supplier Submission Journey ⏱️ ~30 min

- [ ] Create application → Status DRAFT, version 1
- [ ] Fill form → Save draft → Version increments
- [ ] Submit → Status SUBMITTED, form read-only, polling starts
- [ ] Procurement reviews → Status IN_REVIEW
- [ ] Status polling detects change → Auto-update, notification
- [ ] Procurement approves → Supplier created
- [ ] Redirect to Company Profile → All data displays

**Pass Criteria:** ✅ All steps pass, no errors, data intact

---

## Scenario 2: Procurement Requests Changes ⏱️ ~25 min

- [ ] Submit application
- [ ] Procurement adds comments with fieldKeys
- [ ] Set status PENDING_SUPPLIER
- [ ] Supplier sees only specified fields editable
- [ ] Other fields read-only with tooltip
- [ ] Edit allowed fields → Save successful
- [ ] Attempt edit non-allowed field → Blocked
- [ ] Resubmit → Status SUBMITTED

**Pass Criteria:** ✅ Field-level editing works, validation prevents unauthorized edits

---

## Scenario 3: Concurrent Edit Detection ⏱️ ~20 min

- [ ] Create application, save draft (version 2)
- [ ] Open same app in second browser (version 2)
- [ ] User A saves → Version 3
- [ ] User B saves → Error: OPTIMISTIC_LOCK_ERROR
- [ ] Error message user-friendly with refresh action
- [ ] User B refreshes → Sees User A's changes
- [ ] User B saves → Success, version 4
- [ ] Verify no data loss

**Pass Criteria:** ✅ Conflicts detected, errors user-friendly, no data loss

---

## Scenario 4: Real-Time Status Updates ⏱️ ~25 min

- [ ] Submit application → Polling starts
- [ ] Verify polling requests every 5 seconds
- [ ] Procurement changes status → IN_REVIEW
- [ ] Supplier view auto-updates (no refresh)
- [ ] Notification appears
- [ ] Multiple status changes → All detected
- [ ] Status APPROVED → Redirect, polling stops
- [ ] DRAFT/REJECTED → No polling

**Pass Criteria:** ✅ Polling works, auto-updates, notifications appear

---

## Scenario 5: Internal Team Submission ⏱️ ~30 min

- [ ] Admin creates application for supplier
- [ ] Admin fills and submits → submissionType INTERNAL
- [ ] Dashboard shows "Internal" badge
- [ ] Supplier sees application (read-only)
- [ ] Procurement reviews → Sees submission source
- [ ] Approve → Supplier created
- [ ] Supplier accesses Company Profile
- [ ] Admin cannot access profile

**Pass Criteria:** ✅ Internal submission works, source tracked, access control correct

---

## Cross-Cutting Tests

### Error Handling
- [ ] Version conflicts show user-friendly errors
- [ ] Network errors retry appropriately
- [ ] Session expiration redirects correctly
- [ ] All errors have actionable next steps

### Accessibility
- [ ] Skip links work (Tab on page load)
- [ ] Keyboard navigation works
- [ ] Screen reader announces status changes
- [ ] ARIA labels present
- [ ] Focus indicators visible

### Performance
- [ ] Status polling doesn't cause performance issues
- [ ] Page loads < 2 seconds
- [ ] API responses < 500ms
- [ ] No memory leaks

---

## Bug Reporting

**Template:**
```
Scenario: [Number]
Step: [Number]
Severity: [Critical/High/Medium/Low]
Expected: [What should happen]
Actual: [What happened]
Steps: [1, 2, 3...]
```

---

## Test Results Summary

**Date:** _____________  
**Tester:** _____________  
**Environment:** _____________

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Complete Journey | ⬜ Pass / ⬜ Fail | |
| 2. Procurement Changes | ⬜ Pass / ⬜ Fail | |
| 3. Concurrent Edits | ⬜ Pass / ⬜ Fail | |
| 4. Status Updates | ⬜ Pass / ⬜ Fail | |
| 5. Internal Submission | ⬜ Pass / ⬜ Fail | |

**Total Bugs Found:** _____  
**Critical Bugs:** _____  
**High Priority Bugs:** _____  

**Overall Result:** ⬜ Pass / ⬜ Fail / ⬜ Pass with Issues

**Recommendation:** ⬜ Deploy to Staging / ⬜ Fix Bugs First / ⬜ Needs More Testing

---

**Next Steps:**
1. Execute tests using this checklist
2. Document bugs found
3. Fix critical bugs
4. Retest
5. Proceed to staging deployment

