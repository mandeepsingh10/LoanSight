# LoanSight Changelog

All notable changes to the LoanSight loan management application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Defaulter Detection Enhancement**: Improved defaulter detection logic to handle multiple loans per borrower correctly
- **Automatic Data Refresh**: Added automatic refetching for all major components (defaulters, borrowers, loan history, borrower details)
- **Header Count Badges**: Added defaulter and borrower count badges to page headers
- **Back Button Removal**: Removed back button from borrower details page for cleaner navigation
- **Table Improvements**: Added "No." column to defaulters card and improved styling consistency

### Changed
- **Defaulter Page Redesign**: Transformed defaulters page from card layout to comprehensive table format
- **Dashboard Defaulters Card**: Improved styling with better badge layout and removed redundant information
- **Performance Optimization**: Reduced query refetch frequency from 30 seconds to 2 minutes to improve tab switching performance
- **Navigation Enhancement**: Updated defaulters page eye icon to navigate to borrower details instead of showing modal

### Fixed
- **Issue #8 – Payments Page Loading State**: Fixed white glow/flash when switching to Payments tab by simplifying loading state to match other pages' pattern.
- **Multi-Loan Defaulter Detection**: Fixed issue where borrowers with multiple defaulted loans weren't being correctly identified
- **Performance Issues**: Resolved slow tab switching caused by aggressive data refetching
- **Defaulter Count Accuracy**: Fixed defaulter count showing as zero in header due to state management issues

### Technical Details

#### Files Modified
1. `client/src/pages/payments.tsx`
2. `client/src/pages/defaulters.tsx`
3. `client/src/components/dashboard/RecentDefaulters.tsx`
4. `client/src/components/borrowers/BorrowerTable.tsx`
5. `client/src/components/borrowers/BorrowerDetails.tsx`
6. `client/src/components/borrowers/LoanHistory.tsx`
7. `client/src/components/layout/Header.tsx`

#### Key Logic Changes

---

### Defaulter Detection Enhancement

**Files Modified**
1. `client/src/pages/defaulters.tsx`
2. `client/src/components/dashboard/RecentDefaulters.tsx`

**Before:**
```typescript
// Only considered single loan per borrower
borrowers.forEach((borrower: any) => {
  const loan = borrower.loan; // Single loan assumption
  // Process single loan
});
```

**After:**
```typescript
// Fetch all loans for each borrower
const borrowersWithLoans = await Promise.all(
  borrowers.map(async (borrower: any) => {
    const response = await apiRequest("GET", `/api/borrowers/${borrower.id}/loans`);
    const loans = await response.json();
    return { ...borrower, loans };
  })
);

// Process each loan independently
borrowersWithLoans.forEach((borrower: any) => {
  borrower.loans.forEach(loan => {
    // Process each loan separately
  });
});
```

---

### Performance Optimization

**Files Modified**
1. `client/src/pages/defaulters.tsx`
2. `client/src/components/borrowers/BorrowerTable.tsx`
3. `client/src/components/borrowers/BorrowerDetails.tsx`
4. `client/src/components/borrowers/LoanHistory.tsx`

**Before:**
```typescript
refetchInterval: 30000, // Refetch every 30 seconds
refetchOnWindowFocus: true, // Refetch when window regains focus
staleTime: 0 // Consider data stale immediately
```

**After:**
```typescript
refetchInterval: 120000, // Refetch every 2 minutes
refetchOnWindowFocus: false, // Don't refetch on window focus
staleTime: 60000 // Consider data fresh for 1 minute
```

---

### Header Count Badges

**Files Modified**
1. `client/src/components/layout/Header.tsx`

**Added:**
```typescript
// Defaulter count query
const { data: defaultersCount = 0 } = useQuery({
  queryKey: ["/api/defaulters/count"],
  queryFn: async () => {
    // Fetch all payments and borrowers, then calculate defaulter count
    // ... implementation
  }
});

// Borrower count query
const { data: borrowersCount = 0 } = useQuery({
  queryKey: ["/api/borrowers/count"],
  queryFn: async () => {
    const response = await apiRequest("GET", "/api/borrowers");
    const borrowers = await response.json();
    return borrowers.length;
  }
});
```

---

### Defaulter Page Redesign

**Files Modified**
1. `client/src/pages/defaulters.tsx`

**Before:**
```typescript
// Card-based layout with modal
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {defaulters.map(defaulter => (
    <Card>
      <CardContent>
        // Card content
      </CardContent>
    </Card>
  ))}
</div>
```

**After:**
```typescript
// Table-based layout with navigation
<table className="w-full">
  <thead>
    <tr>
      <th>No.</th>
      <th>Borrower</th>
      <th>Contact</th>
      // ... other columns
    </tr>
  </thead>
  <tbody>
    {defaulters.map((defaulter, index) => (
      <tr>
        <td>{index + 1}</td>
        <td>{defaulter.borrowerName}</td>
        // ... other cells
      </tr>
    ))}
  </tbody>
</table>
```

---

### Payments Page Loading State Fix

**Files Modified**
1. `client/src/pages/payments.tsx`

**Before:**
```typescript
// Complex loading skeleton with sidebar layout
if (isLoading) {
  return (
    <div className="flex h-full bg-black">
      <div className="w-64 bg-black border-r border-gray-700 p-4 animate-pulse">
        <div className="h-6 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-10 bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-700 rounded"></div>
        </div>
      </div>
      <div className="flex-1 p-6 bg-black">
        <div className="h-8 bg-gray-700 rounded w-1/4 mb-6"></div>
        <div className="h-64 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}
```

**After:**
```typescript
// Simple loading state consistent with other pages
if (isLoading) {
  return (
    <div className="p-6 space-y-6 min-h-screen bg-black">
      <div className="text-center py-10">
        <p className="text-white/50">Loading payment information...</p>
      </div>
    </div>
  );
}
```

**Impact:**
- ✅ Eliminates white glow/flash when switching to Payments tab
- ✅ Consistent loading experience across all pages
- ✅ Smoother visual transitions
- ✅ No impact on data, schema, or backup/restore functionality

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
- **Issue #5 – Document Number Not Saving**: Fixed Aadhar/document numbers not persisting when editing borrower details. The issue was caused by intentional exclusions in three layers:
  - Frontend mutation was excluding `documentNumber` from update data
  - Backend schema validation was omitting `documentNumber` from `updateBorrowerSchema`
  - Backend storage layer was excluding `documentNumber` from `updateBorrower` function
- **Issue #6 – Document Number Layout**: Fixed document number display alignment to keep label and value on the same line with consistent spacing across all personal detail fields.
- **Issue #7 – End-of-Month Payment Schedule Fix**: Corrected payment schedule generation for EMI and FLAT loans when the loan start date falls on the 29-31st and the following month has fewer days (e.g., 31 Jan → 28/29 Feb).

### Technical Details

#### Files Modified
1. `client/src/pages/borrowers.tsx`
2. `client/src/components/borrowers/BorrowerTable.tsx`
3. `client/src/components/borrowers/BorrowerDetails.tsx`
4. `shared/schema.ts`
5. `server/storage.ts`

#### Schema Changes
- ✅ Modified `updateBorrowerSchema` to allow `documentNumber` updates

#### Backup/Restore Impact
- ❌ None (existing data remains unchanged)

#### Key Logic Changes

---

### Issue #1 – Search Filter Dropdown & Field-Aware Highlighting

**Files Modified**
1. `client/src/pages/borrowers.tsx`

**Before:**
```typescript
// Single search across every field
const searchableText = [...allFields].join(" ").toLowerCase();
return searchableText.includes(searchTerm);

// highlightText always active
highlightText(borrower.address, searchQuery);
```

**After:**
```typescript
// Added filter state & dropdown (default = "borrower")
const [searchFilter, setSearchFilter] = useState("borrower");

// Field-specific matching
if (searchFilter === "borrower") {
  return (borrower.name || "").toLowerCase().includes(searchTerm);
}

// Field-aware highlighting helper
const highlightField = (text, category) => {
  const allow = searchFilter === "all" || searchFilter === category;
  return highlightText(text, allow ? searchQuery : "");
};
```

---

### Issue #2 – Accurate Badge Counts & Debug Text

**Files Modified**
1. `client/src/pages/borrowers.tsx`

**Before:** counts were based on unique borrowers – badges were wrong when a borrower had loans in multiple categories.

**After:**
```typescript
// When filter === "all" count every occurrence (highlight) not just borrowers
const cashResults = cashBorrowers.reduce((sum,b)=> sum + computeMatches(b),0);
```

---

### Issue #3 – Column Sorting in Borrowers Table

**Files Modified**
1. `client/src/components/borrowers/BorrowerTable.tsx`

**Before:** rows rendered in original order only.

**After:**
```typescript
const [sortConfig,setSortConfig] = useState({key:'name',direction:'asc'});
const toggleSort = key => setSortConfig(p=>p.key===key?{key,direction:p.direction==='asc'?'desc':'asc'}:{key,direction:'asc'});
const sorted = [...rows].sort(/* switch on key */);
```

---

### Issue #4 – End-of-Month Payment Schedule Fix

**Files Modified**
1. `server/storage.ts`

**Before:**
```typescript
paymentDate.setMonth(paymentDate.getMonth() + 1); // 31 Jan -> 3 Mar (Feb skipped)
```

**After:**
```typescript
// Safe month increment
paymentDate.setDate(1);
paymentDate.setMonth(paymentDate.getMonth() + 1);
const lastDay = new Date(paymentDate.getFullYear(), paymentDate.getMonth()+1, 0).getDate();
paymentDate.setDate(Math.min(anchorDay, lastDay)); // 31 Jan -> 28/29 Feb
```

---

### Issue #5 – Document Number Not Saving

**Files Modified**
1. `client/src/components/borrowers/BorrowerDetails.tsx`
2. `shared/schema.ts`
3. `server/storage.ts`

**Before:**
```typescript
// Frontend: excluded documentNumber from mutation
const { documentNumber, ...updateData } = data;

// Backend schema: omitted documentNumber
export const updateBorrowerSchema = createInsertSchema(borrowers)
  .omit({ id: true, documentNumber: true }).partial();

// Backend storage: excluded documentNumber from updates
const { id: borrowerId, documentNumber, ...updateData } = borrower as any;
```

**After:**
```typescript
// Frontend: include documentNumber in mutation
const response = await apiRequest("PUT", `/api/borrowers/${borrowerId}`, data);

// Backend schema: allow documentNumber updates
export const updateBorrowerSchema = createInsertSchema(borrowers)
  .omit({ id: true }).partial();

// Backend storage: include documentNumber in allowed fields
if (updateData.documentNumber !== undefined) allowedFields.documentNumber = updateData.documentNumber;
```

---

### Issue #6 – Document Number Layout

**Files Modified**
1. `client/src/components/borrowers/BorrowerDetails.tsx`

**Before:**
```typescript
<div className="flex">
  <dt className="text-gray-400 w-32">Document Number:</dt>
  <dd className="text-white">{borrower.documentNumber}</dd>
</div>
```

**After:**
```typescript
<div className="flex items-start">
  <dt className="text-gray-400 w-36 flex-shrink-0">Document Number:</dt>
  <dd className="text-white break-all">{borrower.documentNumber}</dd>
</div>
```

**Changes Made:**
- Fixed three-layer exclusion of document numbers preventing Aadhar updates
- Improved field alignment with consistent spacing and proper text wrapping
- Updated card styling to match dashboard design with hover effects and separators
- Enhanced edit mode UX by removing hover effects during active editing
- Fixed end-of-month payment schedule generation to prevent skipped months

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

#### Files Modified
1. `client/src/pages/defaulters-new.tsx`
2. `client/src/components/dashboard/RecentDefaulters.tsx`
3. `client/src/components/borrowers/BorrowerTable.tsx`
4. `client/src/components/borrowers/LoanHistory.tsx`
5. `client/src/pages/defaulters.tsx`
6. `server/storage.ts`

#### Schema Changes
- ❌ None (frontend-only changes)

#### Backup/Restore Impact
- ❌ None (frontend-only changes)

#### Key Logic Changes

---

### Issue #1 - Defaulted Loans Not Removed from Defaulter Lists

**Files Modified**
1. `client/src/pages/defaulters-new.tsx`
2. `client/src/components/dashboard/RecentDefaulters.tsx`
3. `client/src/components/borrowers/BorrowerTable.tsx`
4. `client/src/components/borrowers/LoanHistory.tsx`
5. `client/src/pages/defaulters.tsx`

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

---

### Issue #2 - Defaulter Status Priority Logic

**Files Modified**
1. `client/src/pages/defaulters-new.tsx`
2. `client/src/components/dashboard/RecentDefaulters.tsx`
3. `client/src/components/borrowers/BorrowerTable.tsx`
4. `client/src/components/borrowers/LoanHistory.tsx`
5. `client/src/pages/defaulters.tsx`

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

---

### Issue #3 - Dashboard Total Amount Calculation

**Files Modified**
1. `server/storage.ts`

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
- Added loan status checks to exclude completed loans from defaulter lists
- Modified defaulter detection logic to consider loan completion status
- Changed logic to prioritize defaulter status over completed status
- Updated defaulter detection to include borrowers who have any defaulted loans
- Modified the condition to only exclude completed loans that are not also defaulted
- Updated all defaulter-related components to use consistent logic
- Modified `getDashboardStats()` function to exclude completed loans from total amount
- Updated total amount calculation to only include active, defaulted, and cancelled loans

#### Result:
- ✅ When a loan is marked as "completed", it will not be shown as "defaulted"
- ✅ If a borrower has multiple loans and ANY of them are defaulted, they will be shown as a defaulter
- ✅ Defaulter status takes priority over completed status
- ✅ Individual loans that are defaulted will show as "defaulted" even if the borrower has other completed loans
- ✅ Dashboard total amount now excludes completed loans, showing only active outstanding amounts

---

## [Previous Versions]

*Note: This changelog starts from 2024-12-19. Previous changes are not documented here.* 