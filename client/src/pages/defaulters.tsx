import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, User } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { BorrowerDetails } from "@/components/borrowers/BorrowerDetails";

interface DefaulterDisplay {
  borrowerId: number;
  borrowerName: string;
  borrowerPhone: string;
  borrowerAddress: string;
  guarantorName: string;
  guarantorPhone: string;
  guarantorAddress: string;
  latestAmount: number;
  latestDueDate: string;
  latestDaysOverdue: number;
  consecutiveMissed: number;
  totalOutstanding: number;
  defaultedLoans: number; // Number of loans in default
  defaultedLoanIds: number[]; // IDs of defaulted loans
}

export default function Defaulters() {
  const [selectedBorrower, setSelectedBorrower] = useState<number | null>(null);

  // Fetch all payments with borrower information
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

  // Generate defaulters (borrowers with 2+ consecutive missed payments)
  const getDefaulters = () => {
    if (!Array.isArray(payments) || !Array.isArray(borrowersWithLoans)) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group payments by borrower and loan
    const borrowerPayments: { [key: number]: any } = {};
    
    // Process each borrower's loans and payments
    borrowersWithLoans.forEach((borrower: any) => {
      const borrowerLoans = borrower.loans || [];
      
      // Skip if no loans
      if (borrowerLoans.length === 0) return;
      
      // Initialize borrower's payment tracking
      borrowerPayments[borrower.id] = {
        loans: new Map(),
        borrower,
        defaultedLoans: 0,
        defaultedLoanIds: [],
        totalOutstanding: 0,
        maxDaysOverdue: 0,
        totalMissedPayments: 0
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
        
        // Update borrower's default statistics
        borrowerPayments[borrower.id].loans.set(loan.id, paymentsWithOverdue);
        borrowerPayments[borrower.id].defaultedLoans++;
        borrowerPayments[borrower.id].defaultedLoanIds.push(loan.id);
        borrowerPayments[borrower.id].totalOutstanding += paymentsWithOverdue.reduce((sum, p) => sum + p.amount, 0);
        borrowerPayments[borrower.id].maxDaysOverdue = Math.max(
          borrowerPayments[borrower.id].maxDaysOverdue,
          Math.max(...paymentsWithOverdue.map(p => p.daysOverdue))
        );
        borrowerPayments[borrower.id].totalMissedPayments += paymentsWithOverdue.length;
      });
      
      // Remove borrowers with no defaulted loans
      if (borrowerPayments[borrower.id].defaultedLoans === 0) {
        delete borrowerPayments[borrower.id];
      }
    });
    
    // Convert to defaulters array
    const defaulters: DefaulterDisplay[] = Object.entries(borrowerPayments)
      .map(([borrowerId, data]: [string, any]) => {
        const { borrower, defaultedLoans, defaultedLoanIds, totalOutstanding, maxDaysOverdue, totalMissedPayments } = data;
        
        return {
          borrowerId: parseInt(borrowerId),
          borrowerName: borrower.name,
          borrowerPhone: borrower.phone,
          borrowerAddress: borrower.address,
          guarantorName: borrower.guarantorName || 'N/A',
          guarantorPhone: borrower.guarantorPhone || 'N/A',
          guarantorAddress: borrower.guarantorAddress || 'N/A',
          latestAmount: totalOutstanding / totalMissedPayments, // Average payment amount
          latestDueDate: new Date().toISOString(), // Current date as reference
          latestDaysOverdue: maxDaysOverdue,
          consecutiveMissed: totalMissedPayments,
          totalOutstanding,
          defaultedLoans,
          defaultedLoanIds
        };
      });
    
    // Sort defaulters by number of defaulted loans first, then by days overdue
    return defaulters.sort((a, b) => {
      if (b.defaultedLoans !== a.defaultedLoans) {
        return b.defaultedLoans - a.defaultedLoans;
      }
      return b.latestDaysOverdue - a.latestDaysOverdue;
    });
  };

  const defaulters = getDefaulters();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 min-h-screen bg-black">
        <div className="text-center py-10">
          <p className="text-white/50">Loading defaulter information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-black">
        <Card className="bg-black border-gray-800">
          <CardHeader>
            <p className="text-gray-400">Borrowers with multiple missed payments (2 or more)</p>
          </CardHeader>
          <CardContent>
          {defaulters.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No defaulters found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {defaulters.map((defaulter, index) => (
                <Card key={`${defaulter.borrowerId}-${index}`} className="border-red-600 bg-black">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white mr-4">
                          <User className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{defaulter.borrowerName}</h3>
                            <Badge 
                              variant="destructive" 
                              className={`${defaulter.defaultedLoans > 1 ? 'bg-red-700' : ''}`}
                            >
                              {defaulter.defaultedLoans > 1 ? 'Multiple Defaults' : 'Single Default'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-300">{defaulter.borrowerPhone}</p>
                          <p className="text-sm text-gray-400">{defaulter.borrowerAddress}</p>
                          <div className="mt-2">
                            <p className="text-sm font-medium text-white">Guarantor: {defaulter.guarantorName}</p>
                            <p className="text-sm text-gray-300">{defaulter.guarantorPhone}</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant="destructive">
                            {defaulter.latestDaysOverdue} days overdue
                          </Badge>
                          <Badge variant="outline" className="border-red-500 text-red-400">
                            {defaulter.defaultedLoans} {defaulter.defaultedLoans === 1 ? 'loan' : 'loans'} defaulted
                          </Badge>
                        </div>
                        <p className="text-2xl font-bold text-red-400 mt-2">
                          {formatCurrency(defaulter.totalOutstanding)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  {/* Bottom summary message */}
                  <div className="px-6 pb-4 text-sm text-white/80">
                    {`${defaulter.borrowerName} has defaulted on ${defaulter.defaultedLoans} ${defaulter.defaultedLoans === 1 ? 'loan' : 'loans'} with ${defaulter.consecutiveMissed} total missed payments, amounting to ${formatCurrency(defaulter.totalOutstanding)}`}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
        </Card>

        {/* Borrower Details Modal */}
        {selectedBorrower && (
          <BorrowerDetails
            borrowerId={selectedBorrower}
            isOpen={!!selectedBorrower}
            onClose={() => setSelectedBorrower(null)}
            fullScreen={false}
            readOnly={false}
          />
        )}
    </div>
  );
}