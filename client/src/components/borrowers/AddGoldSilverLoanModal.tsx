import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface AddGoldSilverLoanModalProps {
  borrowerId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const AddGoldSilverLoanModal = ({ borrowerId, isOpen, onClose }: AddGoldSilverLoanModalProps) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [createdLoanId, setCreatedLoanId] = useState<number | null>(null);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Form state for step 1
  const [loanDetails, setLoanDetails] = useState({
    amount: "",
    startDate: "",
    notes: "",
    guarantorName: "",
    guarantorPhone: "",
    guarantorAddress: "",
  });

  // Form state for step 2
  const [metalDetails, setMetalDetails] = useState({
    pmType: "",
    itemName: "",
    metalWeight: "",
    purity: "",
    netWeight: "",
    goldSilverNotes: "",
  });

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCreatedLoanId(null);
      setLoanDetails({ amount: "", startDate: "", notes: "", guarantorName: "", guarantorPhone: "", guarantorAddress: "" });
      setMetalDetails({ pmType: "", itemName: "", metalWeight: "", purity: "", netWeight: "", goldSilverNotes: "" });
    }
  }, [isOpen]);

  // Auto-calculate net weight
  const handleMetalChange = (field: string, value: string) => {
    let newDetails = { ...metalDetails, [field]: value };
    if (field === "metalWeight" || field === "purity") {
      const metalWeight = parseFloat(field === "metalWeight" ? value : newDetails.metalWeight);
      const purity = parseFloat(field === "purity" ? value : newDetails.purity);
      if (!isNaN(metalWeight) && !isNaN(purity)) {
        newDetails.netWeight = (metalWeight * (purity / 100)).toFixed(3);
      } else {
        newDetails.netWeight = "";
      }
    }
    setMetalDetails(newDetails);
  };

  // Placeholder submit for Step 1
  const handleLoanDetailsNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        borrowerId,
        amount: parseFloat(loanDetails.amount),
        startDate: loanDetails.startDate,
        notes: loanDetails.notes,
        guarantorName: loanDetails.guarantorName,
        guarantorPhone: loanDetails.guarantorPhone,
        guarantorAddress: loanDetails.guarantorAddress,
        loanStrategy: "gold_silver",
      };
      const response = await apiRequest("POST", "/api/loans", payload);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create loan");
      }
      const data = await response.json();
      setCreatedLoanId(data.id);
      setStep(2);
      toast({
        title: "Success",
        description: "Loan has been created. Please enter precious metal details.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create loan.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit handler for step 2
  const handlePreciousMetalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdLoanId) return;
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual PATCH/PUT endpoint if needed
      const payload = {
        pmType: metalDetails.pmType,
        itemName: metalDetails.itemName,
        metalWeight: parseFloat(metalDetails.metalWeight),
        purity: parseFloat(metalDetails.purity),
        netWeight: parseFloat(metalDetails.netWeight),
        goldSilverNotes: metalDetails.goldSilverNotes,
      };
      // Example PATCH request (update as needed)
      const response = await apiRequest("PATCH", `/api/loans/${createdLoanId}`, payload);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to save precious metal details");
      }
      toast({
        title: "Success",
        description: "Precious metal details saved.",
      });
      onClose();
      setStep(1);
      setCreatedLoanId(null);
      setMetalDetails({ pmType: "", itemName: "", metalWeight: "", purity: "", netWeight: "", goldSilverNotes: "" });
      setLoanDetails({ amount: "", startDate: "", notes: "", guarantorName: "", guarantorPhone: "", guarantorAddress: "" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save precious metal details.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-transparent">
          <DialogTitle>
            {step === 1 ? "Add Gold & Silver Loan" : "Precious Metal Details"}
          </DialogTitle>
        </DialogHeader>
        <div className="border-t border-gray-700 my-4"></div>
        {step === 1 ? (
          <form onSubmit={handleLoanDetailsNext} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-4">Loan Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white">Loan Amount (₹)</label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={loanDetails.amount}
                      onChange={e => setLoanDetails({ ...loanDetails, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white">Loan Start Date</label>
                    <Input
                      type="date"
                      value={loanDetails.startDate}
                      onChange={e => setLoanDetails({ ...loanDetails, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white">Notes (Optional)</label>
                    <Textarea
                      placeholder="Add any notes about this loan..."
                      rows={3}
                      value={loanDetails.notes}
                      onChange={e => setLoanDetails({ ...loanDetails, notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-white mb-4">Guarantor Details (Optional)</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white">Guarantor Name</label>
                    <Input
                      type="text"
                      placeholder="Enter guarantor name"
                      value={loanDetails.guarantorName}
                      onChange={e => setLoanDetails({ ...loanDetails, guarantorName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white">Guarantor Phone</label>
                    <Input
                      type="text"
                      placeholder="Enter guarantor phone number"
                      value={loanDetails.guarantorPhone}
                      onChange={e => setLoanDetails({ ...loanDetails, guarantorPhone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-white">Guarantor Address</label>
                    <Textarea
                      placeholder="Enter guarantor address"
                      rows={3}
                      value={loanDetails.guarantorAddress}
                      onChange={e => setLoanDetails({ ...loanDetails, guarantorAddress: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <Button type="submit" className="bg-blue-800 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Next (Create loan)"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePreciousMetalSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-white mb-4">Precious Metal Details</h4>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-white">Precious Metal Type</label>
                    <Select value={metalDetails.pmType} onValueChange={v => handleMetalChange("pmType", v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select metal type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Card
                    className={
                      metalDetails.pmType === "gold"
                        ? "border-2 border-yellow-400 bg-yellow-50/10"
                        : metalDetails.pmType === "silver"
                        ? "border-2 border-gray-400 bg-gray-100/10"
                        : "border border-gray-700 bg-black/10"
                    }
                  >
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium text-white">Item Name</label>
                          <Input
                            type="text"
                            placeholder="e.g. Necklace, Coin, Bar, etc."
                            value={metalDetails.itemName}
                            onChange={e => handleMetalChange("itemName", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white">Metal Weight (g)</label>
                          <Input
                            type="number"
                            placeholder="Enter weight"
                            value={metalDetails.metalWeight}
                            onChange={e => handleMetalChange("metalWeight", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white">Purity (%)</label>
                          <Input
                            type="number"
                            placeholder="Enter purity"
                            value={metalDetails.purity}
                            onChange={e => handleMetalChange("purity", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-white">Net Weight (g)</label>
                          <Input
                            type="number"
                            placeholder="Auto-calculated"
                            value={metalDetails.netWeight}
                            readOnly
                            className="cursor-not-allowed opacity-75"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <div>
                    <label className="text-sm font-medium text-white">Notes (Optional)</label>
                    <Textarea
                      placeholder="Additional notes about the gold/silver collateral, terms, conditions, or any special agreements..."
                      rows={3}
                      value={metalDetails.goldSilverNotes}
                      onChange={e => handleMetalChange("goldSilverNotes", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <Button variant="outline" type="button" onClick={handleBack}>
                Back
              </Button>
              <Button type="submit" className="bg-blue-800 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Submit"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddGoldSilverLoanModal; 