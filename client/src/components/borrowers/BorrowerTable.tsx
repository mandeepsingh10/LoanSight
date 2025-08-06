import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, Eye, ChevronDown, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/ui/status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { Borrower, Loan } from "@/types";
import BorrowerDetails from "./BorrowerDetails";
import { LoanDetailsModal } from "./LoanDetailsModal";
import { format } from "date-fns";

interface BorrowerTableProps {
  borrowers: Borrower[];
  searchQuery?: string;
  searchFilter: string; // all | borrower | guarantor | borrower_address | guarantor_address
  activeTab: "cash" | "gold-silver";
}

interface BorrowerWithLoans extends Borrower {
  loans?: Array<{
    id: number;
    amount: number;
    formattedAmount: number;
    interestRate: number | null;
    interestType: string | null;
    formattedInterest: string;
    paymentType: string | null;
    startDate: string | Date;
    tenure: number | null;
    loanStrategy: string;
    customEmiAmount: number | null;
    flatMonthlyAmount: number | null;
    status: string;
    nextPayment?: string;
    guarantorName?: string;
    guarantorPhone?: string;
    guarantorAddress?: string;
  }>;
}

const BorrowerTable = ({ borrowers, searchQuery = "", searchFilter, activeTab }: BorrowerTableProps) => {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState<{ borrowerId: number; loanId: number } | null>(null);
  const [selectedBorrower, setSelectedBorrower] = useState<number | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedLoanNumber, setSelectedLoanNumber] = useState<number>(0);
  const [showLoanDetailsModal, setShowLoanDetailsModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [expandedBorrowers, setExpandedBorrowers] = useState<Set<number>>(new Set());
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{key: string; direction: 'asc' | 'desc'}>({key: 'name', direction: 'asc'});

  const toggleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // Function to highlight search terms in text
  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim() || !text) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      // Check if this part matches the search term (case-insensitive)
      if (part.toLowerCase() === searchTerm.toLowerCase()) {
        return <span key={index} className="bg-yellow-200 text-black font-semibold px-1 rounded">{part}</span>;
      }
      return part;
    });
  };

  // Wrapper to apply highlighting only for allowed field categories
  const highlightField = (text: any, category: string) => {
    const allow = searchFilter === "all" || searchFilter === category;
    return highlightText(text, allow ? searchQuery : "");
  };

  // Fetch loans for all borrowers
  const { data: borrowersWithLoans = [], isLoading: loansLoading } = useQuery({
    queryKey: ["/api/borrowers", "with-loans", borrowers.map(b => b.id), searchQuery],
    queryFn: async () => {
      const borrowersWithLoansData: BorrowerWithLoans[] = [];
      
      for (const borrower of borrowers) {
        try {
          const response = await apiRequest("GET", `/api/borrowers/${borrower.id}/loans`);
          if (response.ok) {
            const loans = await response.json();
            // Sort loans by ID (oldest first) to ensure sequential numbering
            const sortedLoans = (loans || []).sort((a: any, b: any) => {
              return a.id - b.id;
            });
            borrowersWithLoansData.push({
              ...borrower,
              loans: sortedLoans
            });
          } else {
            // If no loans found, add borrower with empty loans array
            borrowersWithLoansData.push({
              ...borrower,
              loans: []
            });
          }
        } catch (error) {
          console.error(`Failed to fetch loans for borrower ${borrower.id}:`, error);
          borrowersWithLoansData.push({
            ...borrower,
            loans: []
          });
        }
      }
      
      return borrowersWithLoansData;
    },
    enabled: borrowers.length > 0,
    refetchInterval: 120000, // Refetch every 2 minutes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 60000 // Consider data fresh for 1 minute
  });

  // Fetch payments to detect defaulters
  const { data: payments = [] } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payments");
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    },
    refetchInterval: 120000, // Refetch every 2 minutes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 60000 // Consider data fresh for 1 minute
  });

  // Function to check if a borrower is a defaulter (2+ consecutive missed payments)
  const isDefaulter = (borrowerId: number) => {
    if (!Array.isArray(payments)) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get all payments for this borrower's loans
    const borrower = borrowersWithLoans.find(b => b.id === borrowerId);
    if (!borrower || !borrower.loans || borrower.loans.length === 0) return false;
    
    // Check if any loan is defaulted (prioritize defaulter over completed)
    if (borrower.loans!.some(loan => loan.status === 'defaulted' || isLoanDefaulter(loan.id))) return true;
    
    const borrowerPayments = payments.filter((payment: any) => 
      borrower.loans!.some(loan => loan.id === payment.loanId)
    );
    
    // Sort payments by due date
    const sortedPayments = borrowerPayments.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    let consecutiveMissed = 0;
    let maxConsecutive = 0;

    sortedPayments.forEach((payment) => {
      const dueDate = new Date(payment.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (payment.status === 'collected' || daysOverdue <= 0) {
        // Break the streak
        consecutiveMissed = 0;
      } else {
        consecutiveMissed++;
        if (consecutiveMissed > maxConsecutive) {
          maxConsecutive = consecutiveMissed;
        }
      }
    });

    return maxConsecutive >= 2;
  };

  // Determine if a specific loan is part of a defaulter streak (>=2 consecutive missed payments)
  const isLoanDefaulter = (loanId: number) => {
    if (!Array.isArray(payments)) return false;
    const today = new Date();
    today.setHours(0,0,0,0);

    // First check if the loan is marked as completed - if so, it's not defaulted
    const borrower = borrowersWithLoans.find(b => b.loans?.some(loan => loan.id === loanId));
    const loan = borrower?.loans?.find(loan => loan.id === loanId);
    if (loan && loan.status === 'completed') return false;

    const loanPayments = payments.filter((p: any)=> p.loanId === loanId);
    if (loanPayments.length === 0) return false;

    const sorted = loanPayments.sort((a:any,b:any)=> new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    let streak=0, maxStreak=0;
    sorted.forEach(p=>{
      const dueDate=new Date(p.dueDate);
      const overdue = (today.getTime()-dueDate.getTime())/(1000*60*60*24) >0;
      if(p.status==='collected' || !overdue){
        streak=0;
      }else{
        streak++;
        if(streak>maxStreak) maxStreak=streak;
      }
    });
    return maxStreak>=2;
  };

  // Function to check if a borrower has any defaulted loans
  const hasDefaultedLoans = (borrower: BorrowerWithLoans) => {
    if (!borrower.loans || borrower.loans.length === 0) return false;
    
    // If borrower has any defaulted loans, they are considered defaulted (prioritize defaulter over completed)
    return borrower.loans.some(loan => loan.status === 'defaulted' || isLoanDefaulter(loan.id));
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/borrowers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrowers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/borrowers", "with-loans"] });
      toast({
        title: "Borrower Deleted",
        description: "The borrower has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete borrower: ${error}`,
        variant: "destructive",
      });
    },
  });

  const deleteLoanMutation = useMutation({
    mutationFn: async (loanId: number) => {
      await apiRequest("DELETE", `/api/loans/${loanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrowers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/borrowers", "with-loans"] });
      toast({
        title: "Loan Deleted",
        description: "The loan has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete loan: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteConfirm = () => {
    if (confirmDelete && deleteConfirmText.toLowerCase() === 'delete') {
      deleteMutation.mutate(confirmDelete);
      setConfirmDelete(null);
      setDeleteConfirmText("");
    }
  };

  const handleDeleteLoanConfirm = () => {
    if (confirmDeleteLoan && deleteConfirmText.toLowerCase() === 'delete') {
      deleteLoanMutation.mutate(confirmDeleteLoan.loanId);
      setConfirmDeleteLoan(null);
      setDeleteConfirmText("");
    }
  };

  const handleDeleteDialogClose = () => {
    setConfirmDelete(null);
    setConfirmDeleteLoan(null);
    setDeleteConfirmText("");
  };

  const handleViewLoan = (loan: Loan, loanNumber: number) => {
    setSelectedLoan(loan);
    setSelectedLoanNumber(loanNumber);
    setShowLoanDetailsModal(true);
  };

  const toggleBorrowerExpansion = (borrowerId: number) => {
    const newExpanded = new Set(expandedBorrowers);
    if (newExpanded.has(borrowerId)) {
      newExpanded.delete(borrowerId);
    } else {
      newExpanded.add(borrowerId);
    }
    setExpandedBorrowers(newExpanded);
  };

  // Function to handle edit navigation with tab saving
  const handleEditBorrower = (borrowerId: number) => {
    // Save the current active tab before navigating
    localStorage.setItem("borrowersActiveTab", activeTab);
    navigate(`/edit-borrower/${borrowerId}`);
  };

  const getLoanStrategyDisplay = (strategy: string) => {
    switch (strategy) {
      case "emi":
        return "EMI";
      case "flat":
        return "FLAT";
      case "custom":
        return "CUSTOM";
      case "gold_silver":
        return "GOLD/SILVER";
      default:
        return strategy.toUpperCase();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to filter loans by type
  function filterLoansByType(loans, type) {
    if (!Array.isArray(loans)) return [];
    if (type === 'cash') {
      return loans.filter(
        (loan) =>
          !loan.loanStrategy ||
          loan.loanStrategy === 'emi' ||
          loan.loanStrategy === 'flat' ||
          loan.loanStrategy === 'custom'
      );
    } else if (type === 'gold-silver') {
      return loans.filter((loan) => loan.loanStrategy === 'gold_silver');
    }
    return [];
  }

  // Filter borrowersWithLoans by loans matching the active tab
  const filteredBorrowersWithLoans = borrowersWithLoans
    .map((borrower) => {
      const filteredLoans = filterLoansByType(borrower.loans, activeTab);
      if (filteredLoans.length > 0) {
        return { ...borrower, loans: filteredLoans };
      }
      return null;
    })
    .filter(Boolean) as BorrowerWithLoans[];

  // Apply sorting
  const sortedBorrowersWithLoans = [...filteredBorrowersWithLoans].sort((a, b) => {
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const getFirstLoan = (br: BorrowerWithLoans) => (br.loans && br.loans.length > 0 ? br.loans[0] : undefined);

    switch (sortConfig.key) {
      case 'name':
        return a.name.localeCompare(b.name) * dir;
      case 'amount': {
        const la = getFirstLoan(a)?.amount || 0;
        const lb = getFirstLoan(b)?.amount || 0;
        return (la - lb) * dir;
      }
      case 'date': {
        const da = getFirstLoan(a)?.startDate ? new Date(getFirstLoan(a)!.startDate).getTime() : 0;
        const db = getFirstLoan(b)?.startDate ? new Date(getFirstLoan(b)!.startDate).getTime() : 0;
        return (da - db) * dir;
      }
      case 'loanType': {
        const la = getFirstLoan(a)?.loanStrategy || '';
        const lb = getFirstLoan(b)?.loanStrategy || '';
        return la.localeCompare(lb) * dir;
      }
      case 'status': {
        const la = getFirstLoan(a)?.status || '';
        const lb = getFirstLoan(b)?.status || '';
        return la.localeCompare(lb) * dir;
      }
      default:
        return 0;
    }
  });

  // Debug logging
  console.log("BorrowerTable received borrowers:", borrowers.length);
  console.log("BorrowerTable searchQuery:", searchQuery);
  console.log("BorrowerTable borrowersWithLoans:", borrowersWithLoans.length);

  // Show loading state while fetching loan data
  if (loansLoading) {
    return (
      <div className="bg-black rounded-lg border border-gray-800 p-12">
        <LoadingSpinner size="lg" text="Loading loan data..." />
      </div>
    );
  }

  return (
    <>
      <div className="bg-black rounded-lg shadow overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider w-12">
                  No.
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider cursor-pointer" onClick={() => toggleSort('name')}>
                  Borrower {sortConfig.key==='name' ? (sortConfig.direction==='asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Contact
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Guarantor
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center cursor-pointer" onClick={() => toggleSort('amount')}>
                  Loan Amount {sortConfig.key==='amount' ? (sortConfig.direction==='asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center cursor-pointer" onClick={() => toggleSort('date')}>
                  Start Date {sortConfig.key==='date' ? (sortConfig.direction==='asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center cursor-pointer" onClick={() => toggleSort('loanType')}>
                  Loan Type {sortConfig.key==='loanType' ? (sortConfig.direction==='asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Tenure
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center cursor-pointer" onClick={() => toggleSort('status')}>
                  Status {sortConfig.key==='status' ? (sortConfig.direction==='asc' ? '▲' : '▼') : ''}
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {sortedBorrowersWithLoans.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-300">
                    {searchQuery.trim() 
                      ? `No borrowers found matching "${searchQuery}". Try adjusting your search terms.`
                      : "No borrowers found. Add your first borrower to get started."
                    }
                  </td>
                </tr>
              ) : (
                sortedBorrowersWithLoans.map((borrower, index) => {
                  const loans = borrower.loans || [];
                  const hasMultipleLoans = loans.length > 1;
                  const isExpanded = expandedBorrowers.has(borrower.id);
                  
                  if (loans.length === 0) {
                    // Borrower with no loans
                    return (
                  <tr key={borrower.id} className="hover:bg-[#111111]">
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 ${
                          hasDefaultedLoans(borrower) ? 'bg-red-600' : 'bg-blue-600'
                        }`}>
                          <span>{borrower.name ? borrower.name.charAt(0).toUpperCase() : '?'}</span>
                        </div>
                        <div className="font-medium text-white">
                          {highlightField(borrower.name, 'borrower')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm">
                        <div className="text-white">{highlightField(borrower.phone, 'other')}</div>
                        <div className="text-xs text-gray-300">{highlightField(borrower.address, 'borrower_address')}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-white">
                        {borrower.guarantorName ? highlightField(borrower.guarantorName, 'guarantor') : "-"}
                      </div>
                    </td>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                          No loans
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <StatusBadge status={borrower.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditBorrower(borrower.id)}
                        >
                          {isAdmin ? (
                            <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                          ) : (
                            <Eye size={16} className="text-blue-400 hover:text-blue-300" />
                          )}
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setConfirmDelete(borrower.id)}
                          >
                            <Trash2 size={16} className="text-red-500 hover:text-red-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                    );
                  }

                  // Borrower with loans
                  return loans.map((loan, loanIndex) => {
                    // For single loan borrowers, show loan details directly
                    if (!hasMultipleLoans && loanIndex === 0) {
                      return (
                        <tr key={`${borrower.id}-${loan.id}`} className="hover:bg-[#111111]">
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 font-medium">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 ${
                                isLoanDefaulter(loan.id) ? 'bg-red-600' : 'bg-blue-600'
                              }`}>
                                <span>{borrower.name ? borrower.name.charAt(0).toUpperCase() : '?'}</span>
                              </div>
                              <div>
                                <div className="font-medium text-white">
                                  {highlightField(borrower.name, 'borrower')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="text-sm">
                              <div className="text-white">{highlightField(borrower.phone, 'other')}</div>
                              <div className="text-xs text-gray-300">{highlightField(borrower.address, 'borrower_address')}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-white">
                              <div className="font-medium">
                                {highlightField(loan.guarantorName || borrower.guarantorName || "-", 'guarantor')}
                              </div>
                              <div className="text-xs text-gray-300">
                                {highlightField(loan.guarantorPhone || borrower.guarantorPhone || "", 'other')}
                                {loan.guarantorPhone || borrower.guarantorPhone ? <br /> : null}
                                {highlightField(loan.guarantorAddress || borrower.guarantorAddress || "", 'guarantor_address')}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="font-medium text-white">
                              {formatCurrency(loan.amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                            {loan.startDate ? format(new Date(loan.startDate), "dd MMM yyyy") : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="font-medium text-white">
                              {highlightField(getLoanStrategyDisplay(loan.loanStrategy), 'other')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                            {loan.tenure ? `${loan.tenure} months` : "-"}
                          </td>
                                                      <td className="px-6 py-4 whitespace-nowrap text-center">
                              <StatusBadge status={isLoanDefaulter(loan.id) ? 'defaulted' : loan.status} className="mx-auto" />
                            </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditBorrower(borrower.id)}
                              >
                                {isAdmin ? (
                                  <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                                ) : (
                                  <Eye size={16} className="text-blue-400 hover:text-blue-300" />
                                )}
                              </Button>
                              {isAdmin && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setConfirmDeleteLoan({ borrowerId: borrower.id, loanId: loan.id })}
                                >
                                  <Trash2 size={16} className="text-red-500 hover:text-red-400" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    
                    // For multiple loan borrowers
                    // Show only the first loan by default, or all if expanded
                    const shouldShow = loanIndex === 0 || isExpanded;
                    
                    if (!shouldShow) return null;
                    
                    // For collapsed view with multiple loans, show NA in loan columns
                    const isCollapsedMultipleLoans = loanIndex === 0 && hasMultipleLoans && !isExpanded;
                    
                    return (
                      <>
                        {/* Borrower info row - only for first loan */}
                        {loanIndex === 0 && (
                          <tr key={`${borrower.id}-info`} className="hover:bg-[#111111]">
                            <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 font-medium">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="relative mr-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleBorrowerExpansion(borrower.id)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white p-0 hover:opacity-80 ${
                                      hasDefaultedLoans(borrower) ? 'bg-red-600' : 'bg-blue-600'
                                    }`}
                                  >
                                    <span>{borrower.name ? borrower.name.charAt(0).toUpperCase() : '?'}</span>
                                  </Button>
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold text-black">{loans.length}</span>
                                  </div>
                                </div>
                                <div>
                                  <div className="font-medium text-white">
                                    {highlightField(borrower.name, 'borrower')}
                                  </div>
                                  {!isExpanded && (
                                    <div className="text-xs text-gray-400">
                                      {loans.length} loans
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="text-sm">
                                <div className="text-white">{highlightField(borrower.phone, 'other')}</div>
                                <div className="text-xs text-gray-300">{highlightField(borrower.address, 'borrower_address')}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-400"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="font-medium text-white">
                                {!isExpanded ? "" : ""}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="font-medium text-white">
                                {!isExpanded ? "" : ""}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="font-medium text-white">
                                {!isExpanded ? "" : ""}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                              {!isExpanded ? "" : ""}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {!isExpanded ? (
                                <span className="text-gray-400"></span>
                              ) : (
                                ""
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-3">
                                                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditBorrower(borrower.id)}
                              >
                                  {isAdmin ? (
                                    <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                                  ) : (
                                    <Eye size={16} className="text-blue-400 hover:text-blue-300" />
                                  )}
                                </Button>
                                {isAdmin && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setConfirmDelete(borrower.id)}
                                  >
                                    <Trash2 size={16} className="text-red-500 hover:text-red-400" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {/* Loan details row - only show when expanded */}
                        {loanIndex === 0 && isExpanded && (
                          <tr key={`${borrower.id}-${loan.id}`} className="hover:bg-[#111111]">
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="ml-10 font-bold text-white">
                                • Loan {loanIndex + 1}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="text-sm text-gray-400"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-white">
                                <div className="font-medium">
                                  {highlightField(loan.guarantorName || borrower.guarantorName || "-", 'guarantor')}
                                </div>
                                <div className="text-xs text-gray-300">
                                  {highlightField(loan.guarantorPhone || borrower.guarantorPhone || "", 'other')}
                                  {loan.guarantorPhone || borrower.guarantorPhone ? <br /> : null}
                                  {highlightField(loan.guarantorAddress || borrower.guarantorAddress || "", 'guarantor_address')}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="font-medium text-white">
                                {formatCurrency(loan.amount)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                              {loan.startDate ? format(new Date(loan.startDate), "dd MMM yyyy") : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="font-medium text-white">
                                {highlightField(getLoanStrategyDisplay(loan.loanStrategy), 'other')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                              {loan.tenure ? `${loan.tenure} months` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <StatusBadge status={isLoanDefaulter(loan.id) ? 'defaulted' : loan.status} className="mx-auto" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-3">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleViewLoan(loan, loanIndex + 1)}
                                >
                                  {isAdmin ? (
                                    <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                                  ) : (
                                    <Eye size={16} className="text-blue-400 hover:text-blue-300" />
                                  )}
                                </Button>
                                {isAdmin && hasMultipleLoans && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setConfirmDeleteLoan({ borrowerId: borrower.id, loanId: loan.id })}
                                  >
                                    <Trash2 size={16} className="text-red-500 hover:text-red-400" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        
                        {/* Additional loan details rows - only show when expanded */}
                        {isExpanded && loanIndex > 0 && (
                          <tr key={`${borrower.id}-${loan.id}`} className="hover:bg-[#111111]">
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="ml-10 font-bold text-white">
                                • Loan {loanIndex + 1}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="text-sm text-gray-400"></div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-white">
                                <div className="font-medium">
                                  {highlightField(loan.guarantorName || borrower.guarantorName || "-", 'guarantor')}
                                </div>
                                <div className="text-xs text-gray-300">
                                  {highlightField(loan.guarantorPhone || borrower.guarantorPhone || "", 'other')}
                                  {loan.guarantorPhone || borrower.guarantorPhone ? <br /> : null}
                                  {highlightField(loan.guarantorAddress || borrower.guarantorAddress || "", 'guarantor_address')}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="font-medium text-white">
                                {formatCurrency(loan.amount)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                              {loan.startDate ? format(new Date(loan.startDate), "dd MMM yyyy") : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="font-medium text-white">
                                {highlightField(getLoanStrategyDisplay(loan.loanStrategy), 'other')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                              {loan.tenure ? `${loan.tenure} months` : "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <StatusBadge status={isLoanDefaulter(loan.id) ? 'defaulted' : loan.status} className="mx-auto" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-3">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleViewLoan(loan, loanIndex + 1)}
                                >
                                  {isAdmin ? (
                                    <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                                  ) : (
                                    <Eye size={16} className="text-blue-400 hover:text-blue-300" />
                                  )}
                                </Button>
                                {isAdmin && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setConfirmDeleteLoan({ borrowerId: borrower.id, loanId: loan.id })}
                                  >
                                    <Trash2 size={16} className="text-red-500 hover:text-red-400" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-900 px-6 py-3 flex items-center justify-between border-t border-gray-700">
          <div className="text-sm text-white/70">
            Showing <span className="font-medium text-white">1</span> to{" "}
            <span className="font-medium text-white">{filteredBorrowersWithLoans.length}</span> of{" "}
            <span className="font-medium text-white">{filteredBorrowersWithLoans.length}</span> results
          </div>
          {/* Pagination would go here in a real app with more data */}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this borrower and all associated loan data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Type 'delete' to confirm"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteDialogClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm} 
              className={`${
                deleteConfirmText.toLowerCase() === 'delete'
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={deleteConfirmText.toLowerCase() !== 'delete'}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Loan Confirmation Dialog */}
      <AlertDialog open={confirmDeleteLoan !== null} onOpenChange={handleDeleteDialogClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this specific loan. The borrower will remain, but this loan and all its associated payment data will be removed.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Type 'delete' to confirm"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteDialogClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteLoanConfirm} 
              className={`${
                deleteConfirmText.toLowerCase() === 'delete'
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              disabled={deleteConfirmText.toLowerCase() !== 'delete'}
            >
              Delete Loan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Loan Details Modal */}
      <LoanDetailsModal
        loan={selectedLoan}
        loanNumber={selectedLoanNumber}
        isOpen={showLoanDetailsModal}
        onClose={() => setShowLoanDetailsModal(false)}
      />
    </>
  );
};

export default BorrowerTable;
