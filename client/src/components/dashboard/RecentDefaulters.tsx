import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, User } from "lucide-react";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

const RecentDefaulters = () => {
  const [, navigate] = useLocation();

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/payments");
      if (!response.ok) throw new Error("Failed to fetch payments");
      return response.json();
    }
  });

  // Fetch borrowers first
  const { data: borrowers = [], isLoading: borrowersLoading } = useQuery({
    queryKey: ["/api/borrowers"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/borrowers");
      if (!response.ok) throw new Error("Failed to fetch borrowers");
      return response.json();
    }
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
    enabled: borrowers.length > 0
  });

  const isLoading = paymentsLoading || borrowersLoading || loansLoading;

  // Process payments to find defaulters (borrowers with 2+ consecutive missed payments)
  const processDefaulters = () => {
    if (!Array.isArray(payments) || !Array.isArray(borrowersWithLoans)) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group payments by borrower
    const borrowerPayments: { [key: number]: any[] } = {};
    
    // First, process each borrower's loans and payments
    borrowersWithLoans.forEach((borrower: any) => {
      const borrowerLoans = borrower.loans || [];
      
      // Skip if no loans
      if (borrowerLoans.length === 0) return;
      
      // Initialize borrower's payment tracking
      borrowerPayments[borrower.id] = {
        loans: new Map(),
        borrower,
        defaultedLoans: 0
      };
      
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
          return { ...payment, daysOverdue, loan };
        });
        
        // Store loan payments and increment defaulted loans counter
        borrowerPayments[borrower.id].loans.set(loan.id, paymentsWithOverdue);
        borrowerPayments[borrower.id].defaultedLoans++;
      });
      
      // Remove borrowers with no defaulted loans
      if (borrowerPayments[borrower.id].defaultedLoans === 0) {
        delete borrowerPayments[borrower.id];
      }
    });
    
    // Find borrowers with defaulted loans
    const defaulters = Object.entries(borrowerPayments)
      .map(([borrowerId, data]: [string, any]) => {
        const { loans, borrower } = data;
        let totalDefaultedLoans = 0;
        let totalConsecutiveMissed = 0;
        let totalOutstanding = 0;
        let maxDaysOverdue = 0;
        
        // Analyze each loan's payments
        loans.forEach((payments: any[], loanId: number) => {
          if (payments.length < 2) return;
          
          // Sort by days overdue descending
          const sorted = payments.sort((a, b) => b.daysOverdue - a.daysOverdue);
          const consecutiveMissed = payments.length;
          
          if (consecutiveMissed >= 2) {
            totalDefaultedLoans++;
            totalConsecutiveMissed += consecutiveMissed;
            totalOutstanding += payments.reduce((sum, p) => sum + p.amount, 0);
            maxDaysOverdue = Math.max(maxDaysOverdue, sorted[0].daysOverdue);
          }
        });
        
        // Only include borrowers with at least one defaulted loan
        if (totalDefaultedLoans === 0) return null;
        
        return {
          id: parseInt(borrowerId),
          borrowerId: parseInt(borrowerId),
          borrowerName: borrower.name,
          phone: borrower.phone,
          defaultedLoans: totalDefaultedLoans,
          consecutiveMissed: totalConsecutiveMissed,
          totalOutstanding,
          maxDaysOverdue,
          status: 'defaulter'
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // First sort by number of defaulted loans
        if (b.defaultedLoans !== a.defaultedLoans) {
          return b.defaultedLoans - a.defaultedLoans;
        }
        // Then by total consecutive missed payments
        if (b.consecutiveMissed !== a.consecutiveMissed) {
          return b.consecutiveMissed - a.consecutiveMissed;
        }
        // Finally by days overdue
        return b.maxDaysOverdue - a.maxDaysOverdue;
      })
      .slice(0, 4); // Limit to 4 for dashboard display
    
    return defaulters
  };

  const defaulters = processDefaulters();

  const handleViewDetails = (borrowerId: number) => {
    navigate(`/borrower-details/${borrowerId}`);
  };

  if (isLoading) {
    return (
      <Card className="bg-black border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-3 pb-3 border-b border-gray-700">
          <CardTitle className="text-white flex items-center gap-2">
            <User size={20} className="text-red-500" />
            Defaulters
          </CardTitle>
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-800" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle error states
  if (!Array.isArray(payments) || !Array.isArray(borrowers)) {
    return (
      <Card className="bg-black border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between px-6 pt-3 pb-3 border-b border-gray-700">
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" />
            Defaulters
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-gray-400">
            Unable to load defaulter information
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black border-gray-700">
      <CardHeader className="flex flex-row items-center justify-between px-6 pt-3 pb-3 border-b border-gray-700">
        <CardTitle className="text-white flex items-center gap-2">
          <User size={20} className="text-red-500" />
          Defaulters
        </CardTitle>
        <Link href="/defaulters">
          <Button variant="link" className="text-blue-400 font-medium hover:text-blue-300">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {defaulters.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-900 text-left">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                    Missed Payments
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                    Outstanding
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {defaulters.map((defaulter) => (
                  <tr key={defaulter.id} className="hover:bg-[#111111]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white mr-3">
                          <span>{defaulter.borrowerName ? defaulter.borrowerName.charAt(0) : '?'}</span>
                        </div>
                        <div className="text-white font-medium">{defaulter.borrowerName || 'Unknown'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white">{defaulter.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <Badge variant="destructive">
                          {defaulter.defaultedLoans} {defaulter.defaultedLoans === 1 ? 'loan' : 'loans'}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {defaulter.consecutiveMissed} missed payments
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="text-white font-medium">
                          {formatCurrency(defaulter.totalOutstanding)}
                        </span>
                        <span className="text-sm text-gray-400">
                          {defaulter.maxDaysOverdue} days overdue
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant="destructive" 
                        className={`whitespace-nowrap ${defaulter.defaultedLoans > 1 ? 'bg-red-700' : ''}`}
                      >
                        {defaulter.defaultedLoans > 1 ? 'Multiple Defaults' : 'Single Default'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button 
                        variant="link" 
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium h-auto p-0"
                        onClick={() => handleViewDetails(defaulter.borrowerId)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex justify-center items-center h-40 text-slate-400">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white">No defaulters found</p>
                <p className="text-gray-400 text-sm mt-2">Borrowers will appear here after missing 2 consecutive payments</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentDefaulters;