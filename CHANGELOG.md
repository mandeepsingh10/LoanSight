# LoanSight Changelog

All notable changes to the LoanSight loan management application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No changes yet_

## [2025-08-04] - Borrower Search & Table Enhancements

### Added
- Search filter dropdown on Borrowers page with options: **Borrower** (default), All Fields, Guarantor, Borrower Address, Guarantor Address.
- Highlight logic respects selected filter; only relevant fields are highlighted.
- Per-column sorting on Borrowers table (Borrower, Loan Amount, Start Date, Loan Type, Status).

### Changed
- Badge counts and debug banners now show correct counts per tab and per filter, including total match count for **All Fields** search.
- Filter dropdown styled with modern translucent gray background and focus ring; placed inside the search input on the right.

### Fixed
- Badge counts for Cash vs Gold & Silver tabs when borrowers have multiple loan types.
- Duplicate `getLoanStrategyDisplay` definition removed to prevent ReferenceError.

### Technical Details

#### Files Modified
1. `client/src/pages/borrowers.tsx`
2. `client/src/components/borrowers/BorrowerTable.tsx`

#### Schema Changes
- ❌ None (frontend-only changes)

#### Backup/Restore Impact
- ❌ None

#### Key Logic Changes

**Issue #1 – Search Filter Dropdown & Field-Aware Highlighting**

**Before:**
```typescript
// borrowers.tsx (simplified)
const [searchQuery, setSearchQuery] = useState("");

// A single search input – always searched every field
const searchableText = [
  borrower.name,
  borrower.phone,
  borrower.address,
  borrower.guarantorName,
  borrower.guarantorAddress
].join(" ").toLowerCase();

return searchableText.includes(searchTerm);

// highlightText always applied
highlightText(borrower.address, searchQuery);
```

**After:**
```typescript
// Added filter state & dropdown (default "borrower")
const [searchFilter, setSearchFilter] = useState("borrower");

// Filter-specific match logic
if (searchFilter === "borrower") {
  return (borrower.name || "").toLowerCase().includes(searchTerm);
} else if (searchFilter === "guarantor_address") {
  return (borrower.guarantorAddress || "").toLowerCase().includes(searchTerm);
}

// Field-aware highlighting helper
const highlightField = (text, category) => {
  const allow = searchFilter === "all" || searchFilter === category;
  return highlightText(text, allow ? searchQuery : "");
};

// Usage
highlightField(borrower.address, "borrower_address");
```

**Issue #2 – Accurate Badge Counts & Debug Text**

**Before:** counts were based on unique borrowers; badges mis-matched when borrowers had loans in both categories.

**After:**
```typescript
// borrowers.tsx (excerpt)
const cashResults = /* counts occurrences per field when filter==='all' */
const goldResults = /* same for gold-silver */

<span>{cashResults}</span>
<div>Found {cashResults} borrowers matching ...</div>
```

**Issue #3 – Column Sorting in Borrower Table**

**Before:** rows were rendered in original order only.

**After:**
```typescript
const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });

const toggleSort = (key) =>
  setSortConfig((p) => p.key === key ? { key, direction: p.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" });

const sorted = [...filteredBorrowersWithLoans].sort(/* switch on sortConfig.key */);

// Header
<th onClick={() => toggleSort("amount")}>Loan Amount {sortIndicator}</th>
```

**Changes Made:**
- Added dropdown styling (semi-transparent gray, hover/focus ring) positioned inside search bar.
- Implemented per-column sorting with ▲ / ▼ indicators.
- Refactored highlight logic to respect selected filter.
- Fixed duplicate `getLoanStrategyDisplay` definition.

## [2025-08-03] - Defaulter Logic Fixes & Dashboard Total Amount Update

### Added
- Enhanced defaulter detection logic to consider loan status
- Added loan status priority logic (defaulter over completed)

### Changed
- Updated defaulter detection to prioritize defaulter status over completed status
- Modified StatusBadge logic to show correct loan status
- Updated all defaulter-related components to use consistent logic
- **Dashboard Total Amount:** Modified calculation to exclude completed loans from total amount

### Fixed
- **Issue #1:** Defaulted loans not being removed from defaulter lists when marked as completed
- **Issue #2:** Incorrect priority logic where completed loans were taking precedence over defaulted loans
- **Issue #3:** Dashboard total amount included completed loans (now excluded)

### Technical Details

#### Files Modified:
1. `client/src/pages/defaulters-new.tsx`
2. `client/src/components/dashboard/RecentDefaulters.tsx`
3. `client/src/components/borrowers/BorrowerTable.tsx`
4. `client/src/components/borrowers/LoanHistory.tsx`
5. `client/src/pages/defaulters.tsx`
6. `server/storage.ts` - Updated dashboard total amount calculation

#### Schema Changes:
- ❌ None (frontend-only changes)

#### Backup/Restore Impact:
- ❌ None (frontend-only changes)

#### Key Logic Changes:

**Issue #1 - Defaulted Loans Not Removed from Defaulter Lists:**

**Before:**
```typescript
// Only checked payment status, ignored loan status
payments.forEach((payment: any) => {
  if (payment.status === "collected") return;
  // ... rest of logic
});
```

**After:**
```typescript
// Added loan status check
payments.forEach((payment: any) => {
  if (payment.status === "collected") return;
  
  const borrower = borrowers.find((b: any) => b.loan?.id === payment.loanId);
  if (!borrower) return;
  
  // Skip if the borrower's loan is marked as completed
  if (borrower.loan?.status === 'completed') return;
  
  // ... rest of logic
});
```

**Changes Made:**
- Added loan status checks to exclude completed loans from defaulter lists
- Modified defaulter detection logic to consider loan completion status

**Issue #2 - Defaulter Status Priority Logic:**

**Before:**
```typescript
// Excluded borrowers with completed loans from defaulter lists
payments.forEach((payment: any) => {
  if (payment.status === "collected") return;
  
  const borrower = borrowers.find((b: any) => b.loan?.id === payment.loanId);
  if (!borrower) return;
  
  // Skip if the borrower's loan is marked as completed
  if (borrower.loan?.status === 'completed') return;
  
  // ... rest of logic
});
```

**After:**
```typescript
// Include borrowers with defaulted loans (prioritize defaulter over completed)
payments.forEach((payment: any) => {
  if (payment.status === "collected") return;
  
  const borrower = borrowers.find((b: any) => b.loan?.id === payment.loanId);
  if (!borrower) return;
  
  // Only skip if the loan is completed and not defaulted
  if (borrower.loan?.status === 'completed' && borrower.loan?.status !== 'defaulted') return;
  
  // ... rest of logic
});
```

**Changes Made:**
- Changed logic to prioritize defaulter status over completed status
- Updated defaulter detection to include borrowers who have any defaulted loans
- Modified the condition to only exclude completed loans that are not also defaulted
- Updated all defaulter-related components to use consistent logic

**Issue #3 - Dashboard Total Amount Calculation:**

**Before:**
```typescript
// Included all loans in total amount
for (const loan of allLoans) {
  totalAmount += loan.amount;
}
```

**After:**
```typescript
// Exclude completed loans from total amount
for (const loan of allLoans) {
  if (loan.status !== 'completed') {
    totalAmount += loan.amount;
  }
}
```

**Changes Made:**
- Modified `getDashboardStats()` function to exclude completed loans from total amount
- Updated total amount calculation to only include active, defaulted, and cancelled loans

#### Code Examples:

*Note: Code examples are now included in the "Key Logic Changes" section above for each issue.*

#### Result:
- ✅ When a loan is marked as "completed", it will not be shown as "defaulted"
- ✅ If a borrower has multiple loans and ANY of them are defaulted, they will be shown as a defaulter
- ✅ Defaulter status takes priority over completed status
- ✅ Individual loans that are defaulted will show as "defaulted" even if the borrower has other completed loans
- ✅ Dashboard total amount now excludes completed loans, showing only active outstanding amounts

---

## [Previous Versions]

*Note: This changelog starts from 2024-12-19. Previous changes are not documented here.* 