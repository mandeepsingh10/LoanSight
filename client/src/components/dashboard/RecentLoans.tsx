import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/ui/status-badge";
import { format } from "date-fns";
import { useState } from "react";
import { Eye, EyeOff, Clock } from "lucide-react";

interface LoanWithBorrower {
  id: number;
  borrowerId: number;
  borrowerName: string;
  amount: number;
  loanStrategy: string;
  status: string;
  nextPayment: string;
  createdAt: string;
  tenure?: number;
}

interface BorrowerWithLoans {
  borrowerId: number;
  borrowerName: string;
  loans: LoanWithBorrower[];
}

const RecentLoans = () => {
  const [, navigate] = useLocation();
  const [isAmountVisible, setIsAmountVisible] = useState(false);
  const [expandedBorrowers, setExpandedBorrowers] = useState<Set<number>>(new Set());

  const toggleAmountVisibility = () => {
    setIsAmountVisible(!isAmountVisible);
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

  const handleViewDetails = (borrowerId: number) => {
    navigate(`/edit-borrower/${borrowerId}`);
  };
  
  const { data: recentLoans, isLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-loans"],
  });

  // Sort all loans by createdAt descending (most recent first)
  const allRecentLoans = (recentLoans || []).slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Loans</CardTitle>
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black border border-gray-700 rounded-lg shadow overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between px-6 pt-3 pb-0 mb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Clock size={20} className="text-blue-400" />
          Recent Loans
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900 text-left">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider w-12 text-center">No.</th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-left">Borrower</th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-left">Amount</th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-left">Type</th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">Tenure</th>
                <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {allRecentLoans.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-300">
                    No recent loans found
                  </td>
                </tr>
              ) : (
                allRecentLoans.map((loan, idx) => (
                  <tr key={loan.id} className="hover:bg-[#111111]">
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium text-left">{loan.borrowerName || 'Unknown'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium text-left">₹{loan.amount?.toLocaleString() || '0'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-white text-left">{loan.loanStrategy ? loan.loanStrategy.toUpperCase() : 'EMI'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white">{loan.tenure ? `${loan.tenure} months` : 'NA'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button 
                        variant="link" 
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium h-auto p-0"
                        onClick={() => handleViewDetails(loan.borrowerId)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentLoans;
