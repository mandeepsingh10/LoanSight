import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlertTriangle, User, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";


interface DefaulterDisplay {
  borrowerId: number;
  borrowerName: string;
  borrowerPhone: string;
  borrowerAddress: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorAddress: string;
  loanId: number;
  loanAmount: number;
  startDate: string;
  tenure: number | null;
  loanType: string;
  missedPayments: number;
  maxDaysOverdue: number;
  totalOutstanding: number;
}

export default function Defaulters() {
  const [, navigate] = useLocation();

  // Fetch all payments with borrower information
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
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

  // Fetch borrowers first
  const { data: borrowers = [], isLoading: borrowersLoading } = useQuery({
    queryKey: ["/api/borrowers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/borrowers");
      if (!response.ok) throw new Error("Failed to fetch borrowers");
      return response.json();
    },
    refetchInterval: 120000, // Refetch every 2 minutes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 60000 // Consider data fresh for 1 minute
  });

  // Then fetch all loans for each borrower
  const { data: borrowersWithLoans = [], isLoading: loansLoading } = useQuery({
    queryKey: ["/api/borrowers/loans", borrowers],
    queryFn: async () => {
      const borrowersWithLoans = await Promise.all(
        borrowers.map(async (borrower: any) => {
          const response = await apiRequest("GET", `/api/borrowers/${borrower.id}/loans`);
          if (!response.ok) return { ...borrower, loans: [] };
          const loans = await response.json();
          return { ...borrower, loans };
        })
      );
      return borrowersWithLoans;
    },
    enabled: borrowers.length > 0,
    refetchInterval: 120000, // Refetch every 2 minutes
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 60000 // Consider data fresh for 1 minute
  });

  const isLoading = paymentsLoading || borrowersLoading || loansLoading;

  // Generate defaulters (borrowers with 2+ consecutive missed payments)
  const getDefaulters = () => {
    if (!Array.isArray(payments) || !Array.isArray(borrowersWithLoans)) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Process each borrower's loans and payments
    const defaultedLoans: any[] = [];
    
    borrowersWithLoans.forEach((borrower: any) => {
      const borrowerLoans = borrower.loans || [];
      
      // Skip if no loans
      if (borrowerLoans.length === 0) return;
      
      // Process each loan
      borrowerLoans.forEach(loan => {
        // Skip completed loans unless marked as defaulted
        if (loan.status === 'completed' && loan.status !== 'defaulted') return;
        
        // Get payments for this loan
        const loanPayments = payments.filter((payment: any) => {
          if (payment.status === "collected") return false;
          if (payment.loanId !== loan.id) return false;
          
          const dueDate = new Date(payment.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          
          if (dueDate >= today) return false; // Not overdue yet
          
          return true;
        });
        
        // Skip if less than 2 missed payments
        if (loanPayments.length < 2) return;
        
        // Calculate days overdue for each payment
        const paymentsWithOverdue = loanPayments.map(payment => {
          const dueDate = new Date(payment.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return { ...payment, daysOverdue };
        });
        
        // Sort by days overdue
        const sortedPayments = paymentsWithOverdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
        const totalOutstanding = paymentsWithOverdue.reduce((sum, p) => sum + p.amount, 0);
        
        defaultedLoans.push({
          borrowerId: borrower.id,
          borrowerName: borrower.name,
          borrowerPhone: borrower.phone,
          borrowerAddress: borrower.address,
          guarantorName: borrower.guarantorName || 'N/A',
          guarantorPhone: borrower.guarantorPhone || 'N/A',
          guarantorAddress: borrower.guarantorAddress || 'N/A',
          loanId: loan.id,
          loanAmount: loan.amount,
          startDate: loan.startDate,
          tenure: loan.tenure,
          loanType: loan.loanStrategy,
          missedPayments: loanPayments.length,
          maxDaysOverdue: sortedPayments[0].daysOverdue,
          totalOutstanding
        });
      });
    });
    
    // Sort by borrower name and then by loan ID
    return defaultedLoans.sort((a, b) => {
      const nameCompare = a.borrowerName.localeCompare(b.borrowerName);
      if (nameCompare !== 0) return nameCompare;
      return a.loanId - b.loanId;
    });
  };

  const defaulters = getDefaulters();



  if (isLoading) {
    return (
      <div className="p-6 space-y-6 min-h-screen bg-black">
        <div className="text-center py-10">
          <LoadingSpinner size="lg" text="Loading defaulter information..." />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-black">
      <div className="bg-black rounded-lg shadow overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider w-12">
                  No.
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                  Borrower
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Contact
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Guarantor
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Loan Amount
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Start Date
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Loan Type
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Tenure
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {defaulters.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-300">
                    No defaulters found
                  </td>
                </tr>
              ) : (
                defaulters.map((defaulter, index) => (
                  <tr 
                    key={`${defaulter.borrowerId}-${defaulter.loanId}`} 
                    className={`hover:bg-[#111111] ${
                      index > 0 && defaulters[index - 1].borrowerId === defaulter.borrowerId
                        ? 'border-t-0' // Remove top border for subsequent loans of same borrower
                        : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white mr-3">
                          <span>{defaulter.borrowerName.charAt(0).toUpperCase()}</span>
                        </div>
                        <div className="font-medium text-white">
                          {defaulter.borrowerName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm">
                        <div className="text-white">{defaulter.borrowerPhone}</div>
                        <div className="text-xs text-gray-300">{defaulter.borrowerAddress}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm">
                        <div className="text-white">{defaulter.guarantorName}</div>
                        <div className="text-xs text-gray-300">{defaulter.guarantorPhone}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                      {formatCurrency(defaulter.loanAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                      {formatDate(defaulter.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge variant="outline" className="border-gray-500 text-gray-400">
                        {defaulter.loanType === 'emi' ? 'EMI' :
                         defaulter.loanType === 'flat' ? 'FLAT' :
                         defaulter.loanType === 'custom' ? 'CUSTOM' :
                         defaulter.loanType === 'gold_silver' ? 'GOLD/SILVER' :
                         defaulter.loanType?.toUpperCase() || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                      {defaulter.tenure || 'N/A'} {defaulter.tenure ? 'months' : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge variant="destructive">
                        {defaulter.missedPayments} missed
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/borrower-details/${defaulter.borrowerId}`)}
                      >
                        <Eye size={16} className="text-blue-400 hover:text-blue-300" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}