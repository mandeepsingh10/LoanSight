import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { 
  Plus, 
  Pencil, 
  Trash2,
  DollarSign, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle
} from "lucide-react";
import { Loan } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { apiRequest } from "@/lib/queryClient";
import { useQuery as useReactQuery } from "@tanstack/react-query";

interface LoanHistoryProps {
  borrowerId: number;
  onAddLoan: () => void;
  onViewLoan: (loan: Loan, loanNumber?: number) => void;
}

export const LoanHistory = ({ borrowerId, onAddLoan, onViewLoan }: LoanHistoryProps) => {
  const [activeTab, setActiveTab] = useState<"active" | "completed" | "defaulted" | "all">("all");
  const [confirmDeleteLoan, setConfirmDeleteLoan] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [confirmCompleteLoan, setConfirmCompleteLoan] = useState<number | null>(null);
  const [completeConfirmText, setCompleteConfirmText] = useState("");
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  // Fetch all loans for this borrower
  const { data: loans = [], isLoading, error } = useQuery({
    queryKey: ["/api/borrowers", borrowerId, "loans"],
    queryFn: async () => {
      console.log("Fetching loans for borrower:", borrowerId);
      const response = await apiRequest("GET", `/api/borrowers/${borrowerId}/loans`);
      if (!response.ok) {
        throw new Error("Failed to fetch loans");
      }
      let data = await response.json();
      // Patch: ensure each loan has status and borrowerName
      data = data.map((loan: any) => ({
        ...loan,
        status: loan.status || "active",
        borrowerName: loan.borrowerName || ""
      }));
      // Sort loans by ID (oldest first) for sequential numbering
      data = data.sort((a: any, b: any) => {
        return a.id - b.id;
      });
      console.log("Loans data received:", data);
      return data;
    },
  });

  // Delete loan mutation
  const deleteLoanMutation = useMutation({
    mutationFn: async (loanId: number) => {
      await apiRequest("DELETE", `/api/loans/${loanId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrowers", borrowerId, "loans"] });
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

  // Mutation for marking loan as completed
  const markCompletedMutation = useMutation({
    mutationFn: async (loanId: number) => {
      const response = await apiRequest("PATCH", `/api/loans/${loanId}`, { status: "completed" });
      if (!response.ok) {
        throw new Error("Failed to mark loan as completed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/borrowers", borrowerId, "loans"] });
      toast({
        title: "Loan Completed",
        description: "The loan has been marked as completed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to mark loan as completed: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Filter loans based on active tab
  const getFilteredLoans = () => {
    switch (activeTab) {
      case "active":
        return loans.filter((loan: Loan) => loan.status === "active" && !isLoanDefaulted(loan.id));
      case "completed":
        return loans.filter((loan: Loan) => loan.status === "completed");
      case "defaulted":
        return loans.filter((loan: Loan) => isLoanDefaulted(loan.id));
      case "all":
        return loans;
      default:
        return loans;
    }
  };

  // Add EMI calculation function
  const calculateEMIAmount = (loan: Loan) => {
    if (loan.loanStrategy === "emi") {
      if (loan.customEmiAmount) {
        return loan.customEmiAmount;
      } else if (loan.amount && loan.tenure) {
        // Simple EMI calculation (amount / tenure) - you might want to add interest calculation
        return loan.amount / loan.tenure;
      }
    } else if (loan.loanStrategy === "flat" && loan.flatMonthlyAmount) {
      return loan.flatMonthlyAmount;
    }
    return null;
  };

  // Fetch payments for all loans to determine defaulted status (define early)
  const { data: allPayments = [] } = useReactQuery({
    queryKey: ["/api/payments", borrowerId],
  });

  // Add helper before filtering
  function isLoanDefaulted(loanId: number) {
    // First check if the loan is marked as completed - if so, it's not defaulted
    const loan = loans.find(l => l.id === loanId);
    if (loan && loan.status === 'completed') return false;
    
    const payments = (allPayments as any[]).filter(p => p.loanId === loanId);
    if (payments.length === 0) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    let streak=0,maxStreak=0;
    payments.sort((a,b)=> new Date(a.dueDate).getTime()-new Date(b.dueDate).getTime()).forEach(p=>{
      const due=new Date(p.dueDate);
      const overdue=(today.getTime()-due.getTime())/(1000*60*60*24)>0;
      if(p.status==='collected'||!overdue){streak=0;}else{streak++;if(streak>maxStreak)maxStreak=streak;}
    });
    return maxStreak>=2;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "defaulted":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "defaulted":
        return <Badge className="bg-red-100 text-red-800">Defaulted</Badge>;
      case "cancelled":
        return <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
    }
  };

  const getLoanStrategyDisplay = (strategy: string) => {
    switch (strategy) {
      case "emi":
        return "EMI";
      case "flat":
        return "Flat";
      case "custom":
        return "Custom";
      case "gold_silver":
        return "Gold/Silver";
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

  const handleDeleteLoanConfirm = () => {
    if (confirmDeleteLoan && deleteConfirmText.toLowerCase() === 'delete') {
      deleteLoanMutation.mutate(confirmDeleteLoan);
      setConfirmDeleteLoan(null);
      setDeleteConfirmText("");
    }
  };

  const handleDeleteDialogClose = () => {
    setConfirmDeleteLoan(null);
    setDeleteConfirmText("");
  };

  // Sort so most recent loan is at the top
  const filteredLoans = getFilteredLoans().slice().sort((a, b) => {
    // Prefer createdAt if available, else use id
    if (a.createdAt && b.createdAt) {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return b.id - a.id;
  });
  console.log("All loans:", loans);
  console.log("Filtered loans:", filteredLoans);
  console.log("Active tab:", activeTab);
  console.log("isAdmin:", isAdmin);

  if (error) {
    console.error("LoanHistory error:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loan History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-red-500">Error loading loans: {String(error.message || error)}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loan History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading loans...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-black rounded-lg shadow overflow-hidden border border-gray-700">
      <div className="px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="text-lg font-bold text-white">Loan History</div>
        <div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="bg-gray-900 rounded-lg">
              <TabsTrigger value="all">All ({loans.length})</TabsTrigger>
              <TabsTrigger value="active">Active ({loans.filter((l: Loan) => l.status === "active" && !isLoanDefaulted(l.id)).length})</TabsTrigger>
              <TabsTrigger value="defaulted">Defaulted ({loans.filter((l: Loan)=> isLoanDefaulted(l.id)).length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({loans.filter((l: Loan) => l.status === "completed").length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900 text-left">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider w-12 text-center">No.</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-left">Amount</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-left">Type</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">Start Date</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-left">EMI Amount</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">Tenure</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">Next Payment</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">Status</th>
              <th className="px-6 py-3 text-xs font-bold text-white uppercase tracking-wider text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredLoans.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-300">
                  {activeTab === "active" && "No active loans"}
                  {activeTab === "completed" && "No completed loans"}
                  {activeTab === "all" && "No loans found"}
                </td>
              </tr>
            ) : (
              filteredLoans.map((loan: Loan, index: number) => {
                const isDefaulted = isLoanDefaulted(loan.id);
                const rowClass = isDefaulted ? "text-red-500" : "";
                const emiAmount = calculateEMIAmount(loan);

                return (
                  <tr key={loan.id} className={`hover:bg-[#111111] ${rowClass}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-400 font-medium">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium text-left">{formatCurrency(loan.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-white text-left">{getLoanStrategyDisplay(loan.loanStrategy)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                      {format(new Date(loan.startDate), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium text-left">
                      {emiAmount ? formatCurrency(emiAmount) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                      {loan.tenure ? `${loan.tenure} months` : 'NA'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-white">
                      <span className="font-medium whitespace-nowrap">{loan.nextPayment}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                  <StatusBadge status={isLoanDefaulted(loan.id) ? 'defaulted' : loan.status} className="mx-auto" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onViewLoan(loan, index + 1)}
                        >
                          <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setConfirmDeleteLoan(loan.id)}
                          >
                            <Trash2 size={16} className="text-red-500 hover:text-red-400" />
                          </Button>
                        )}
                        {/* Mark as Completed button for eligible loans */}
                        {isAdmin && !["completed", "defaulted", "cancelled"].includes(loan.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Mark as Completed"
                            onClick={() => {
                              setConfirmCompleteLoan(loan.id);
                              setCompleteConfirmText("");
                            }}
                            disabled={markCompletedMutation.isLoading}
                          >
                            <CheckCircle size={16} className="text-green-500 hover:text-green-400" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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

      {/* Mark as Completed Confirmation Dialog */}
      <AlertDialog open={confirmCompleteLoan !== null} onOpenChange={() => { setConfirmCompleteLoan(null); setCompleteConfirmText(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Loan as Completed</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark this loan as <b>completed</b>. This action cannot be undone.<br/>
              To confirm, type <b>complete</b> below:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              type="text"
              value={completeConfirmText}
              onChange={(e) => setCompleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              placeholder="Type 'complete' to confirm"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmCompleteLoan(null); setCompleteConfirmText(""); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmCompleteLoan && completeConfirmText.toLowerCase() === 'complete') {
                  markCompletedMutation.mutate(confirmCompleteLoan);
                  setConfirmCompleteLoan(null);
                  setCompleteConfirmText("");
                }
              }}
              className={
                completeConfirmText.toLowerCase() === 'complete'
                  ? 'bg-green-500 hover:bg-green-600'
                  : 'bg-gray-400 cursor-not-allowed'
              }
              disabled={completeConfirmText.toLowerCase() !== 'complete'}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}; 