import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Eye,
  Plus,
  Edit,
  Trash2,
  Check,
  ChevronDown,
  CreditCard,
  Pencil,
  X,
  Save,
  History,
  RotateCcw
} from "lucide-react";
import { Loan, Payment } from "@/types";

interface LoanDetailsModalProps {
  loan: Loan | null;
  loanNumber?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const LoanDetailsModal = ({ loan, loanNumber, isOpen, onClose }: LoanDetailsModalProps) => {
  const { toast } = useToast();

  // Payment collection dialog state
  const [collectionDialog, setCollectionDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [upiId, setUpiId] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Payment history dialog state
  const [historyDialog, setHistoryDialog] = useState(false);
  const [selectedPaymentForHistory, setSelectedPaymentForHistory] = useState<Payment | null>(null);

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePayment, setDeletePayment] = useState<Payment | null>(null);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetPayment, setResetPayment] = useState<Payment | null>(null);
  const [resetConfirmation, setResetConfirmation] = useState("");

  // Add payment dialogs state
  const [showAddSinglePayment, setShowAddSinglePayment] = useState(false);
  const [showAddBulkPayments, setShowAddBulkPayments] = useState(false);
  const [singlePaymentForm, setSinglePaymentForm] = useState({
    amount: "",
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ""
  });
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    months: 1,
    customAmount: "",
    customDueDate: format(new Date(), 'yyyy-MM-dd')
  });

  // Edit notes state (match borrower notes logic)
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState("");

  // State for editing a payment transaction in history
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  // Add upiId to editTransactionForm state
  const [editTransactionForm, setEditTransactionForm] = useState({
    amount: '',
    paidDate: '',
    paymentMethod: '',
    notes: '',
    upiId: ''
  });

  // Fetch payments for this specific loan
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["/api/payments", "loan", loan?.id],
    queryFn: async () => {
      if (!loan) return [];
      const response = await apiRequest("GET", `/api/payments/loan/${loan.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch payments");
      }
      const data = await response.json();
      
      // Sort payments by due date (earliest first)
      return data.sort((a: Payment, b: Payment) => {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    },
    enabled: isOpen && !!loan,
  });

  // Fetch payment transactions for each payment
  const { data: paymentTransactionsMap = {}, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/payments/transactions", "loan", loan?.id, payments.length],
    queryFn: async () => {
      if (!loan || !payments.length) return {};
      
      const transactionsMap: { [paymentId: number]: any[] } = {};
      
      // Fetch transactions for each payment that has been paid
      for (const payment of payments) {
        if (payment.paidAmount && payment.paidAmount > 0) {
          try {
            const response = await apiRequest("GET", `/api/payments/${payment.id}/transactions`);
            if (response.ok) {
              const transactions = await response.json();
              transactionsMap[payment.id] = transactions;
            }
          } catch (error) {
            console.error(`Failed to fetch transactions for payment ${payment.id}:`, error);
            transactionsMap[payment.id] = [];
          }
        }
      }
      
      return transactionsMap;
    },
    enabled: isOpen && !!loan && payments.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch when payments change
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Add single payment mutation
  const addSinglePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/loans/${loan?.id}/payments/custom`, {
        amount: parseFloat(data.amount),
        dueDate: data.dueDate,
        notes: data.notes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Payment added successfully.",
      });
      setShowAddSinglePayment(false);
      setSinglePaymentForm({
        amount: "",
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ""
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments", "loan", loan?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add payment: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Add bulk payments mutation
  const addBulkPaymentsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/payments/bulk/${loan?.id}`, {
        months: data.months,
        customAmount: data.customAmount ? parseFloat(data.customAmount) : undefined,
        customDueDate: data.customDueDate
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Successfully added ${data.length} payment(s) to the schedule.`,
      });
      setShowAddBulkPayments(false);
      setBulkPaymentForm({
        months: 1,
        customAmount: "",
        customDueDate: format(new Date(), 'yyyy-MM-dd')
      });
      queryClient.invalidateQueries({ queryKey: ["/api/payments", "loan", loan?.id] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add payments: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Collect payment mutation
  const collectPaymentMutation = useMutation({
    mutationFn: async (data: { id: number; paidAmount: string; paymentMethod: string; notes: string; upiId: string; paymentDate: string }) => {
      const response = await apiRequest("POST", `/api/payments/${data.id}/collect`, {
        paidAmount: data.paidAmount,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        upiId: data.upiId,
        paidDate: data.paymentDate,
        status: "collected"
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to collect payment");
      }
      return response.json();
    },
    onSuccess: async () => {
      toast({
        title: "Success",
        description: "Payment collected successfully",
      });
      setCollectionDialog(false);
      setSelectedPayment(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNotes("");
      setUpiId("");
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      
      // First invalidate payments query and wait for it to refetch
      await queryClient.invalidateQueries({ queryKey: ["/api/payments", "loan", loan?.id] });
      
      // Then invalidate payment transactions query to ensure it refetches with updated payment data
      queryClient.invalidateQueries({ queryKey: ["/api/payments/transactions", "loan", loan?.id] });
      
      // Also refetch payment transactions for the specific payment that was just collected
      if (selectedPayment) {
        queryClient.invalidateQueries({ queryKey: ["/api/payments/" + selectedPayment.id + "/transactions"] });
      }
    },
    onError: (error) => {
      // Extract user-friendly error message
      let errorMessage = "Failed to record payment collection. Please try again.";
      
      if (error instanceof Error) {
        const errorText = error.message;
        if (errorText.includes("Payment amount cannot exceed EMI amount")) {
          errorMessage = "Payment amount cannot exceed the EMI amount.";
        } else if (errorText.includes("Payment not found")) {
          errorMessage = "Payment not found. Please refresh and try again.";
        } else if (errorText.includes("Network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest("DELETE", `/api/payments/${paymentId}`);
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Payment Deleted",
        description: "Payment has been successfully deleted.",
      });
      
      setDeleteDialog(false);
      setDeletePayment(null);
      
      queryClient.invalidateQueries({ queryKey: ["/api/payments", "loan", loan?.id] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed", 
        description: "Could not delete payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Reset payment mutation
  const resetPaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const response = await apiRequest("POST", `/api/payments/${paymentId}/reset`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset payment");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Reset",
        description: "Payment has been successfully reset to its original state.",
      });
      
      // Close the reset dialog and reset state
      setResetDialog(false);
      setResetPayment(null);
      setResetConfirmation("");
      
      // Invalidate and refetch queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/payments", "loan", loan?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/payments/transactions", "loan", loan?.id] });
    },
    onError: (error) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Could not reset payment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update notes mutation (match borrower notes logic)
  const updateNotesMutation = useMutation({
    mutationFn: async (data: { notes: string }) => {
      const response = await apiRequest("PATCH", `/api/loans/${loan?.id}/notes`, data);
      if (!response.ok) {
        throw new Error("Failed to update notes");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Notes updated successfully.",
      });
      setEditingNotes(false);
      queryClient.invalidateQueries({ queryKey: ["/api/loans", loan?.id] });
      if (loan?.borrowerId) {
        queryClient.invalidateQueries({ queryKey: ["/api/loans/borrower/" + loan.borrowerId] });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update notes: ${error}`,
        variant: "destructive",
      });
    },
  });

  const queryClient = useQueryClient();
  const editTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest("PATCH", `/api/payment-transactions/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update transaction");
      }
      return response.json();
    },
    onSuccess: (_data, variables) => {
      setEditingTransactionId(null);
      setEditTransactionForm({ amount: '', paidDate: '', paymentMethod: '', notes: '', upiId: '' });
      toast({ title: "Transaction updated", description: "Payment transaction updated successfully." });
      // Refetch payment history for the selected payment
      if (selectedPaymentForHistory) {
        queryClient.invalidateQueries({ queryKey: ["/api/payments/" + selectedPaymentForHistory.id + "/transactions"] });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update transaction.", variant: "destructive" });
    }
  });

  useEffect(() => {
    setNotes(loan?.notes || "");
  }, [loan]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "defaulted":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <Clock className="h-5 w-5 text-blue-600" />;
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

  const getActualPaymentStatus = (payment: Payment) => {
    if (payment.status === "collected") return "collected";
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(payment.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    
    if (dueDate < today) {
      return "missed";
    } else if (dueDate.getTime() === today.getTime()) {
      return "due_today";
    } else {
      return "upcoming";
    }
  };

  const getPaymentStatusIcon = (payment: Payment) => {
    const status = getActualPaymentStatus(payment);
    switch (status) {
      case "collected":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "missed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "due_today":
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPaymentStatusColor = (payment: Payment) => {
    const status = getActualPaymentStatus(payment);
    switch (status) {
      case "collected":
        return "bg-green-100 text-green-800";
      case "missed":
        return "bg-red-100 text-red-800";
      case "due_today":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getPaymentStatusText = (payment: Payment) => {
    const status = getActualPaymentStatus(payment);
    switch (status) {
      case "collected":
        return "Collected";
      case "missed":
        return "Missed";
      case "due_today":
        return "Due Today";
      default:
        return "Upcoming";
    }
  };

  const handleCollectPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.amount.toString());
    setPaymentMethod("cash");
    setPaymentNotes("");
    setUpiId("");
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setCollectionDialog(true);
  };

  const handleSubmitCollection = () => {
    if (!selectedPayment) return;
    
    // Prepare notes - include UPI ID if UPI payment method is selected
    let finalNotes = paymentNotes;
    if (paymentMethod === "upi" && upiId.trim()) {
      finalNotes = finalNotes ? `${paymentNotes}\nUPI ID: ${upiId}` : `UPI ID: ${upiId}`;
    }
    
    // Check if this is a note-only update for an already collected payment
    const isNoteOnlyUpdate = selectedPayment.paidAmount > 0 && selectedPayment.dueAmount === 0;
    
    if (isNoteOnlyUpdate) {
      // For note-only updates, only send notes
      collectPaymentMutation.mutate({
        id: selectedPayment.id,
        notes: finalNotes,
      });
    } else {
      // For payment collection, send all fields
      const paidAmount = parseFloat(paymentAmount);
      collectPaymentMutation.mutate({
        id: selectedPayment.id,
        paidAmount: paidAmount,
        paymentMethod,
        notes: finalNotes,
        upiId: upiId,
        paymentDate: paymentDate,
      });
    }
  };

  const handleEditPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setPaymentAmount(payment.paidAmount?.toString() || "");
    setPaymentMethod(payment.paymentMethod || "cash");
    setPaymentNotes(payment.notes || "");
    // Set the payment date from the existing payment's paidDate, or current date if not available
    if (payment.paidDate) {
      setPaymentDate(format(new Date(payment.paidDate), 'yyyy-MM-dd'));
    } else {
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    }
    setCollectionDialog(true);
  };

  const handleDeletePayment = (payment: Payment) => {
    setDeletePayment(payment);
    setDeleteDialog(true);
  };

  const handleViewHistory = (payment: Payment) => {
    setSelectedPaymentForHistory(payment);
    setHistoryDialog(true);
  };

  const confirmDeletePayment = () => {
    if (deletePayment) {
      deletePaymentMutation.mutate(deletePayment.id);
    }
  };

  const handleUpdateStatus = (status: string) => {
    // This function can be used to update loan status if needed
    console.log("Update status to:", status);
  };

  // Helper to determine if payment is already collected
  const isCollected = !!selectedPayment && selectedPayment.paidAmount > 0;

  // Helper to determine dialog mode
  const isFirstTimeCollection = !!selectedPayment && (!selectedPayment.paidAmount || selectedPayment.paidAmount === 0);
  const isPartialCollection = !!selectedPayment && selectedPayment.paidAmount > 0 && selectedPayment.dueAmount > 0;
  const isFullyCollected = !!selectedPayment && selectedPayment.paidAmount > 0 && selectedPayment.dueAmount === 0;

  // Handler for resetting a payment
  const handleResetPayment = (payment: Payment) => {
    setResetPayment(payment);
    setResetConfirmation("");
    setResetDialog(true);
  };

  const handleEditTransaction = (transaction: any) => {
    // Try to extract UPI ID from notes if present
    let upiId = '';
    if (transaction.paymentMethod === 'upi' && transaction.notes) {
      const match = transaction.notes.match(/UPI ID: ([^\s]+)/);
      if (match) upiId = match[1];
    }
    setEditingTransactionId(transaction.id);
    setEditTransactionForm({
      amount: transaction.amount.toString(),
      paidDate: transaction.paidDate,
      paymentMethod: transaction.paymentMethod || '',
      notes: transaction.notes ? transaction.notes.replace(/\n?UPI ID: [^\s]+/, '').trim() : '',
      upiId: upiId
    });
  };

  const handleCancelEditTransaction = () => {
    setEditingTransactionId(null);
    setEditTransactionForm({ amount: '', paidDate: '', paymentMethod: '', notes: '', upiId: '' });
  };

  const handleSaveEditTransaction = () => {
    if (!editingTransactionId) return;
    // Compose notes with UPI ID if needed
    let notes = editTransactionForm.notes;
    if (editTransactionForm.paymentMethod === 'upi' && editTransactionForm.upiId) {
      notes = notes ? `${notes}\nUPI ID: ${editTransactionForm.upiId}` : `UPI ID: ${editTransactionForm.upiId}`;
    }
    editTransactionMutation.mutate({
      id: editingTransactionId,
      data: {
        amount: parseFloat(editTransactionForm.amount),
        paidDate: editTransactionForm.paidDate,
        paymentMethod: editTransactionForm.paymentMethod,
        notes: notes
      }
    });
  };

  if (!loan) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle asChild>
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3">
                  {getStatusIcon(loan.status)}
                  <span>Payment Schedule - Loan {loanNumber || loan?.id}</span>
                </div>
                <div className="flex items-center gap-3 mr-8">
                  {(loan.loanStrategy === 'custom' || loan.loanStrategy === 'gold_silver') ? (
                    <Button 
                      size="sm"
                      onClick={() => setShowAddSinglePayment(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Payments
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowAddSinglePayment(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Single Payment
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowAddBulkPayments(true)}>
                          <Calendar className="h-4 w-4 mr-2" />
                          Add X Months
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            {loan?.loanStrategy === "gold_silver" && (
              <div className="mb-6">
                <Card className="bg-gradient-to-br from-black via-zinc-900 to-neutral-900 border-2 border-amber-400/30 shadow-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-amber-400" />
                      Precious Metal Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto rounded-lg border border-amber-400/30 bg-black/40">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-amber-900/40 hover:bg-amber-900/60">
                            <TableHead className="text-amber-200 w-1/5 text-center">Item</TableHead>
                            <TableHead className="text-amber-200 w-1/5 text-center">Type</TableHead>
                            <TableHead className="text-amber-200 w-1/5 text-center">Weight (g)</TableHead>
                            <TableHead className="text-amber-200 w-1/5 text-center">Purity (%)</TableHead>
                            <TableHead className="text-amber-200 w-1/5 text-center">Net Weight</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loan.items?.map((item, idx) => (
                            <TableRow key={idx} className="border-t border-amber-400/10 hover:bg-amber-900/20">
                              <TableCell className="text-white text-center capitalize">{item.itemName.toLowerCase()}</TableCell>
                              <TableCell className="text-white text-center capitalize">{item.pmType === 'gold' ? 'Gold' : 'Silver'}</TableCell>
                              <TableCell className="text-white text-center">{item.metalWeight}</TableCell>
                              <TableCell className="text-white text-center">{item.purity}</TableCell>
                              <TableCell className="text-white text-center">{item.netWeight}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {paymentsLoading ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-gray-500">Loading payments...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No payments found for this loan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Due Date</TableHead>
                      <TableHead>EMI Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Dues</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: Payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.dueDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentStatusIcon(payment)}
                            <Badge className={getPaymentStatusColor(payment)}>
                              {getPaymentStatusText(payment)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.paidAmount && payment.paidAmount > 0 ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {formatCurrency(payment.paidAmount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {format(new Date(payment.paidDate), "MMM d, yyyy")}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">Not collected yet</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.dueAmount > 0 && payment.paidAmount > 0 ? (
                            <div className="text-orange-600 font-medium">
                              {formatCurrency(payment.dueAmount)}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {payment.status !== "collected" ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleCollectPayment(payment)}
                                  className="h-8 w-8 p-0 hover:!bg-black"
                                  title="Collect Payment"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetPayment(payment)}
                                className="h-8 w-8 p-0 hover:!bg-black"
                                title="Reset Payment"
                              >
                                <RotateCcw size={16} className="text-red-400 hover:text-red-300" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewHistory(payment)}
                              className="h-8 w-8 p-0 hover:!bg-black"
                              title="View Payment History"
                            >
                              <History className="h-4 w-4 text-green-400 hover:text-green-300" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeletePayment(payment)}
                              className="h-8 w-8 p-0 hover:!bg-black"
                              title="Delete Payment"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {/* Loan Notes Section */}
          <div className="mt-8">
            <Card className="border border-gray-600">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-bold text-white">Notes</CardTitle>
                {!editingNotes && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingNotes(true)}
                  >
                    <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {editingNotes ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add notes about this loan..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="bg-black border-gray-600 text-white min-h-[120px]"
                      rows={5}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingNotes(false);
                          setNotes(loan?.notes || "");
                        }}
                        className="border-gray-600 text-gray-400 hover:text-white"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateNotesMutation.mutate({ notes });
                        }}
                        disabled={updateNotesMutation.isPending}
                        className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save Notes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[80px]">
                    {notes && notes.trim() ? (
                      <p className="text-white text-sm whitespace-pre-wrap">{notes}</p>
                    ) : (
                      <p className="text-gray-500 text-sm italic">No notes added yet. Click the edit button to add notes.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={historyDialog} onOpenChange={setHistoryDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              Complete payment history for EMI due on {selectedPaymentForHistory && format(new Date(selectedPaymentForHistory.dueDate), "MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedPaymentForHistory && (
              <>
                <div className={`grid grid-cols-2 gap-4 p-4 bg-gray-900 rounded-lg border-2 ${selectedPaymentForHistory.dueAmount && selectedPaymentForHistory.dueAmount > 0 ? 'border-red-500' : 'border-green-500'}`}>
                  <div>
                    <div className="text-sm text-gray-400">EMI Amount</div>
                    <div className="text-lg font-semibold text-white">{formatCurrency(selectedPaymentForHistory.amount)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Outstanding Dues</div>
                    <div className="text-lg font-semibold text-orange-500">{formatCurrency(selectedPaymentForHistory.dueAmount || 0)}</div>
                  </div>
                </div>
                
                {paymentTransactionsMap[selectedPaymentForHistory.id] && paymentTransactionsMap[selectedPaymentForHistory.id].length > 0 ? (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-300">Payment Records</div>
                    <div className="space-y-2">
                      {paymentTransactionsMap[selectedPaymentForHistory.id].map((transaction: any, index: number) => (
                        <div key={transaction.id} className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-600 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden">
                          {/* Sequence Number Header */}
                          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-1.5 border-b border-gray-600">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-white text-blue-700 text-xs font-bold rounded-full flex items-center justify-center shadow-sm">
                                  {index + 1}
                                </div>
                                <span className="text-white font-medium text-xs">Payment #{index + 1}</span>
                              </div>
                              <div className="text-white text-xs opacity-80">
                                {format(new Date(transaction.paidDate), "MMM d, yyyy")}
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            {editingTransactionId === transaction.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="edit-paid-date" className="text-gray-300 font-medium text-xs">Date</Label>
                                    <Input
                                      id="edit-paid-date"
                                      type="date"
                                      value={editTransactionForm.paidDate}
                                      onChange={e => setEditTransactionForm(f => ({ ...f, paidDate: e.target.value }))}
                                      className="mt-1 bg-gray-700 border-gray-600 text-white focus:border-blue-500 h-8 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-amount" className="text-gray-300 font-medium text-xs">Amount</Label>
                                    <Input
                                      id="edit-amount"
                                      type="number"
                                      value={editTransactionForm.amount}
                                      onChange={e => setEditTransactionForm(f => ({ ...f, amount: e.target.value }))}
                                      className="mt-1 bg-gray-700 border-gray-600 text-white focus:border-blue-500 h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor="edit-method" className="text-gray-300 font-medium text-xs">Payment Method</Label>
                                    <select
                                      id="edit-method"
                                      value={editTransactionForm.paymentMethod}
                                      onChange={e => setEditTransactionForm(f => ({ ...f, paymentMethod: e.target.value }))}
                                      className="flex h-8 w-full rounded-md border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-white focus:border-blue-500 mt-1"
                                    >
                                      <option value="">Select</option>
                                      <option value="cash">Cash</option>
                                      <option value="bank_transfer">Bank Transfer</option>
                                      <option value="upi">UPI</option>
                                      <option value="other">Other</option>
                                    </select>
                                  </div>
                                  {editTransactionForm.paymentMethod === "upi" && (
                                    <div>
                                      <Label htmlFor="edit-upi-id" className="text-gray-300 font-medium text-xs">UPI ID</Label>
                                      <Input
                                        id="edit-upi-id"
                                        type="text"
                                        value={editTransactionForm.upiId}
                                        onChange={e => setEditTransactionForm(f => ({ ...f, upiId: e.target.value }))}
                                        className="mt-1 bg-gray-700 border-gray-600 text-white focus:border-blue-500 h-8 text-sm"
                                      />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor="edit-notes" className="text-gray-300 font-medium text-xs">Notes</Label>
                                  <Textarea
                                    id="edit-notes"
                                    placeholder="Add any additional notes about this payment"
                                    value={editTransactionForm.notes}
                                    onChange={e => setEditTransactionForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={2}
                                    className="w-full mt-1 bg-gray-700 border-gray-600 text-white focus:border-blue-500 text-sm"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button size="sm" onClick={handleSaveEditTransaction} className="bg-green-600 hover:bg-green-700 text-white font-medium text-xs h-7 px-3">
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={handleCancelEditTransaction} className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-7 px-3">
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {/* Payment Details */}
                                <div className="grid grid-cols-1 gap-2">
                                  <div className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                                    <span className="text-gray-400 font-medium text-xs">Amount:</span>
                                    <span className="text-green-400 font-bold text-sm">
                                      {formatCurrency(transaction.amount)}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                                    <span className="text-gray-400 font-medium text-xs">Payment mode:</span>
                                    <span className="text-white font-medium text-xs capitalize">
                                      {transaction.paymentMethod ? transaction.paymentMethod.replace('_', ' ') : 'Not specified'}
                                    </span>
                                  </div>
                                  
                                  {/* Show UPI ID if payment method is UPI */}
                                  {transaction.paymentMethod === 'upi' && transaction.notes && transaction.notes.match(/UPI ID: ([^\s]+)/) && (
                                    <div className="flex items-center justify-between p-2 bg-gray-700 rounded-md">
                                      <span className="text-gray-400 font-medium text-xs">UPI ID:</span>
                                      <span className="text-white font-mono text-xs">
                                        {transaction.notes.match(/UPI ID: ([^\s]+)/)[1]}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {/* Notes */}
                                  {transaction.notes && (
                                    (() => {
                                      const notesContent = transaction.paymentMethod === 'upi' 
                                        ? transaction.notes.replace(/\n?UPI ID: [^\s]+/, '').trim() 
                                        : transaction.notes;
                                      
                                      return notesContent ? (
                                        <div className="p-2 bg-gray-700 rounded-md">
                                          <div className="text-gray-400 font-medium text-xs mb-1">Notes:</div>
                                          <div className="text-white text-xs leading-relaxed">
                                            {notesContent}
                                          </div>
                                        </div>
                                      ) : null;
                                    })()
                                  )}
                                </div>
                                
                                {/* Action Button */}
                                <div className="flex justify-end pt-1">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleEditTransaction(transaction)}
                                    className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors h-7 w-7 p-0"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <History className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <div className="text-lg font-medium">No payment records found</div>
                    <div className="text-sm">This EMI payment hasn't been collected yet.</div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Single Payment Dialog */}
      <Dialog open={showAddSinglePayment} onOpenChange={setShowAddSinglePayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Single Payment</DialogTitle>
            <DialogDescription>
              Add a custom payment to this loan. If the payment date is today or earlier, it will be marked as completed automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="single-amount">Payment Amount (₹)</Label>
              <Input
                id="single-amount"
                type="number"
                placeholder="Enter payment amount"
                value={singlePaymentForm.amount}
                onChange={(e) => setSinglePaymentForm({
                  ...singlePaymentForm, 
                  amount: e.target.value
                })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="single-payment-date">Payment Date</Label>
              <Input
                id="single-payment-date"
                type="date"
                value={singlePaymentForm.dueDate}
                onChange={(e) => setSinglePaymentForm({
                  ...singlePaymentForm, 
                  dueDate: e.target.value
                })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="single-notes">Notes (Optional)</Label>
              <Textarea
                id="single-notes"
                placeholder="Add any notes about this payment"
                value={singlePaymentForm.notes}
                onChange={(e) => setSinglePaymentForm({
                  ...singlePaymentForm, 
                  notes: e.target.value
                })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (singlePaymentForm.amount && singlePaymentForm.dueDate) {
                  addSinglePaymentMutation.mutate(singlePaymentForm);
                }
              }}
              disabled={addSinglePaymentMutation.isPending || !singlePaymentForm.amount || !singlePaymentForm.dueDate}
              className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
            >
              {addSinglePaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Bulk Payments Dialog */}
      <Dialog open={showAddBulkPayments} onOpenChange={setShowAddBulkPayments}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Multiple Payments</DialogTitle>
            <DialogDescription>
              Add multiple payments to this loan schedule. You can specify the number of months and optionally a custom amount.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="bulk-months">Number of Months</Label>
              <Input
                id="bulk-months"
                type="number"
                min="1"
                max="60"
                placeholder="Enter number of months"
                value={bulkPaymentForm.months}
                onChange={(e) => setBulkPaymentForm({
                  ...bulkPaymentForm, 
                  months: parseInt(e.target.value) || 1
                })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="bulk-custom-amount">Custom Amount (Optional)</Label>
              <Input
                id="bulk-custom-amount"
                type="number"
                placeholder="Leave empty to use loan's default EMI"
                value={bulkPaymentForm.customAmount}
                onChange={(e) => setBulkPaymentForm({
                  ...bulkPaymentForm, 
                  customAmount: e.target.value
                })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="bulk-start-date">Start Date</Label>
              <Input
                id="bulk-start-date"
                type="date"
                value={bulkPaymentForm.customDueDate}
                onChange={(e) => setBulkPaymentForm({
                  ...bulkPaymentForm, 
                  customDueDate: e.target.value
                })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (bulkPaymentForm.months > 0 && bulkPaymentForm.customDueDate) {
                  addBulkPaymentsMutation.mutate(bulkPaymentForm);
                }
              }}
              disabled={addBulkPaymentsMutation.isPending || bulkPaymentForm.months <= 0 || !bulkPaymentForm.customDueDate}
              className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
            >
              {addBulkPaymentsMutation.isPending ? "Adding..." : "Add Payments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Collection Dialog */}
      <Dialog open={collectionDialog} onOpenChange={setCollectionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {(isFirstTimeCollection || isPartialCollection) ? "Record Payment Collection" : "Edit Payment Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedPayment && selectedPayment.dueDate ? (
                (isFirstTimeCollection || isPartialCollection)
                  ? `Record payment collection for EMI due on ${format(new Date(selectedPayment.dueDate), "MMMM d, yyyy")}`
                  : `Edit details for EMI due on ${format(new Date(selectedPayment.dueDate), "MMMM d, yyyy")}`
              ) : (
                "Payment details"
              )}
            </DialogDescription>
          </DialogHeader>
          
          {/* Due Amount Display - Only show for first time or partial collection */}
          {(isFirstTimeCollection || isPartialCollection) && selectedPayment && selectedPayment.dueAmount > 0 && (
            <div className="p-3 bg-gray-900 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-400">Outstanding Amount:</div>
                <div className="text-lg font-semibold text-orange-500">
                  {formatCurrency(selectedPayment.dueAmount)}
                </div>
              </div>
            </div>
          )}
          <div className="space-y-4">
            {(isFirstTimeCollection || isPartialCollection) ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="amount">Payment Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter payment amount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="bg-black border-gray-600 text-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="payment-date">Payment Date</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="bg-black border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="method">Payment Method</Label>
                  <select
                    id="method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                {paymentMethod === "upi" && (
                  <div>
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      type="text"
                      placeholder="Enter UPI ID (e.g., user@paytm)"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-green-900/20 border border-green-600 rounded-lg">
                <div className="text-sm text-green-400 font-medium mb-2">
                  ✅ Payment Collected
                </div>
                <div className="text-sm text-gray-300">
                  This payment has been collected on {selectedPayment && selectedPayment.paidDate && format(new Date(selectedPayment.paidDate), "MMMM d, yyyy")}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Check payment history for detailed transaction records.
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional information"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleSubmitCollection}
              disabled={collectPaymentMutation.isPending}
              className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
            >
              {collectPaymentMutation.isPending ? "Processing..." : ((isFirstTimeCollection || isPartialCollection) ? "Save" : "Update Notes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Payment Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Payment</DialogTitle>
            <DialogDescription>
              {deletePayment && (
                <>
                  Are you sure you want to permanently delete this payment?
                  <div className="mt-3 p-3 bg-red-900/20 border border-red-600 rounded-md">
                    <div className="text-sm text-white">
                      <p><strong>Amount:</strong> {formatCurrency(deletePayment.amount)}</p>
                      <p><strong>Due Date:</strong> {format(new Date(deletePayment.dueDate), "MMM d, yyyy")}</p>
                      <p><strong>Status:</strong> <span className="capitalize">{deletePayment.status.replace('_', ' ')}</span></p>
                    </div>
                  </div>
                  <p className="text-red-600 font-medium mt-3">
                    ⚠️ This action cannot be undone.
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={confirmDeletePayment}
              disabled={deletePaymentMutation.isPending}
              variant="destructive"
            >
              {deletePaymentMutation.isPending ? "Deleting..." : "Delete Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Payment Confirmation Dialog */}
      <Dialog open={resetDialog} onOpenChange={(open) => {
        setResetDialog(open);
        if (!open) {
          setResetConfirmation("");
          setResetPayment(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-yellow-600">Reset Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset this payment to its original state? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-300">
              <p>This action will delete all payment history for this payment.</p>
            </div>
            <div>
              <Label htmlFor="reset-confirmation" className="text-gray-300 font-medium text-sm">
                Type "reset" to confirm:
              </Label>
              <Input
                id="reset-confirmation"
                type="text"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                className="mt-1 bg-black border-gray-600 text-white focus:border-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => {
                if (resetConfirmation === "reset") {
                  if (resetPayment) {
                    resetPaymentMutation.mutate(resetPayment.id);
                  }
                } else {
                  toast({
                    title: "Invalid Confirmation",
                    description: 'Please type "reset" exactly to confirm this action.',
                    variant: "destructive",
                  });
                }
              }}
              disabled={resetPaymentMutation.isPending || resetConfirmation !== "reset"}
              variant="destructive"
            >
              {resetPaymentMutation.isPending ? "Resetting..." : "Confirm Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 