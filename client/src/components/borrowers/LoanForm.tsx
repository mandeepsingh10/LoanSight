import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Calculator, CircleDollarSign, Plus, Circle, Gem, Layers, Coins } from "lucide-react";

// Loan form schema with basic validation
const loanFormSchema = z.object({
  borrowerId: z.number(),
  amount: z.string().min(1, { message: "Loan amount is required" }),
  loanStrategy: z.enum(["emi", "flat", "custom", "gold_silver"], { 
    required_error: "Please select a loan strategy" 
  }),
  startDate: z.string().min(1, { message: "Start date is required" }),
  
  // Guarantor fields - optional when creating new borrower
  guarantorName: z.string().optional(),
  guarantorPhone: z.string().optional(),
  guarantorAddress: z.string().optional(),
  
  // Loan notes
  notes: z.string().optional(),
  
  // EMI-specific fields
  tenure: z.string().optional(),
  customEmiAmount: z.string().optional(),
  
  // FLAT-specific fields
  flatMonthlyAmount: z.string().optional(),
  
  // Gold & Silver fields
  itemName: z.string().optional(),
  metalWeight: z.string().optional(),
  purity: z.string().optional(),
  netWeight: z.string().optional(),
  
  // Silver-specific fields
  silverItemName: z.string().optional(),
  silverMetalWeight: z.string().optional(),
  silverPurity: z.string().optional(),
  silverNetWeight: z.string().optional(),
})
// Add conditional validation based on loan strategy
.refine(
  (data) => {
    if (data.loanStrategy === "emi") {
      return data.customEmiAmount && data.customEmiAmount.trim() !== "" && 
             data.tenure && data.tenure.trim() !== "";
    }
    return true;
  },
  {
    message: "EMI amount and tenure are required for EMI strategy",
    path: ["customEmiAmount"],
  }
)
.refine(
  (data) => {
    if (data.loanStrategy === "flat") {
      return data.flatMonthlyAmount && data.flatMonthlyAmount.trim() !== "";
    }
    return true;
  },
  {
    message: "Monthly payment amount is required for FLAT strategy",
    path: ["flatMonthlyAmount"],
  }
);

type LoanFormValues = z.infer<typeof loanFormSchema>;

interface LoanFormProps {
  borrowerId: number;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  isNewBorrower?: boolean; // New prop to indicate if this is for a new borrower
}

const LoanForm = ({ borrowerId, onSubmit, onCancel, isSubmitting, isNewBorrower }: LoanFormProps) => {
  const [loanStrategy, setLoanStrategy] = useState<"emi" | "flat" | "custom" | "gold_silver">("emi");
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorValues, setCalculatorValues] = useState({
    principal: "",
    interestRate: "",
    tenure: "",
    calculatedEMI: 0
  });
  
  // Gold & Silver calculation values
  const [goldSilverValues, setGoldSilverValues] = useState({
    metalWeight: "",
    purity: "",
    netWeight: 0
  });

  // Add state for gold items
  const [goldItems, setGoldItems] = useState<any[]>([]);

  // Pure EMI calculation function (no side effects)
  const calculateEMI = () => {
    const principal = parseFloat(calculatorValues.principal);
    const annualRate = parseFloat(calculatorValues.interestRate);
    const tenureMonths = parseFloat(calculatorValues.tenure);

    if (principal > 0 && annualRate >= 0 && tenureMonths > 0) {
      if (annualRate === 0) {
        // Simple division if no interest
        return principal / tenureMonths;
      } else {
        // Standard EMI formula
        const monthlyRate = annualRate / (12 * 100);
        return (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
               (Math.pow(1 + monthlyRate, tenureMonths) - 1);
      }
    }
    return 0;
  };

  // Auto-calculate when values change
  const handleCalculatorChange = (field: string, value: string) => {
    // Update the specific field first
    setCalculatorValues(prev => {
      const newValues = { ...prev, [field]: value };
      
      // Calculate EMI with new values
      const principal = parseFloat(newValues.principal || "0");
      const annualRate = parseFloat(newValues.interestRate || "0");
      const tenureMonths = parseFloat(newValues.tenure || "0");

      let calculatedEMI = 0;
      if (principal > 0 && annualRate >= 0 && tenureMonths > 0) {
        if (annualRate === 0) {
          calculatedEMI = principal / tenureMonths;
        } else {
          const monthlyRate = annualRate / (12 * 100);
          calculatedEMI = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
                         (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        }
      }
      
      return { ...newValues, calculatedEMI };
    });
  };

  // Real-time net weight calculation for Gold & Silver
  const handleGoldSilverChange = (field: string, value: string) => {
    setGoldSilverValues(prev => {
      const newValues = { ...prev, [field]: value };
      
      // Calculate net weight: metalWeight * (purity / 100)
      const metalWeight = parseFloat(newValues.metalWeight || "0");
      const purity = parseFloat(newValues.purity || "0");
      
      let netWeight = 0;
      if (metalWeight > 0 && purity > 0 && purity <= 100) {
        netWeight = metalWeight * (purity / 100);
      }
      
      return { ...newValues, netWeight };
    });
    
    // Also update the form field
    form.setValue("netWeight", goldSilverValues.netWeight.toFixed(3));
  };
  
  // Initialize form with default values
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      borrowerId: borrowerId,
      amount: "10000",
      loanStrategy: "emi",
      startDate: new Date().toISOString().split("T")[0],
      guarantorName: isNewBorrower ? undefined : "",
      guarantorPhone: isNewBorrower ? undefined : "",
      guarantorAddress: isNewBorrower ? undefined : "",
      notes: "",
      tenure: "12",
      customEmiAmount: "1000",
      flatMonthlyAmount: "1000",
      itemName: "",
      metalWeight: "",
      purity: "",
      netWeight: "",
      silverItemName: "",
      silverMetalWeight: "",
      silverPurity: "",
      silverNetWeight: "",
    },
  });

  const handleSubmit = (values: LoanFormValues) => {
    console.log("Raw form values received:", values);
    console.log("Form errors:", form.formState.errors);
    
    // Debug Gold & Silver specific fields
    if (values.loanStrategy === "gold_silver") {
      console.log("Gold & Silver payment fields:", {
        goldItems: goldItems // Log gold items for debugging
      });
    }
    // Convert string values to numbers for submission
    const formattedData = {
      borrowerId: values.borrowerId,
      amount: parseFloat(values.amount),
      loanStrategy: values.loanStrategy,
      startDate: values.startDate,
      guarantorName: values.guarantorName,
      guarantorPhone: values.guarantorPhone,
      guarantorAddress: values.guarantorAddress,
      notes: values.notes || "",
    };
    
    // Add strategy-specific fields
    if (values.loanStrategy === "emi") {
      Object.assign(formattedData, {
        tenure: parseInt(values.tenure || "0", 10),
        customEmiAmount: parseFloat(values.customEmiAmount || "0"),
        // Set default values for interest - no longer user configurable
        interestType: "annual",
        interestRate: 0, // Zero interest
        paymentType: "principal_interest" // Default value for backward compatibility
      });
    } else if (values.loanStrategy === "flat") {
      Object.assign(formattedData, {
        flatMonthlyAmount: parseFloat(values.flatMonthlyAmount || "0")
      });
    } else if (values.loanStrategy === "custom") {
      Object.assign(formattedData, {
        // No first payment fields for custom loans
      });
    } else if (values.loanStrategy === "gold_silver") {
      // For gold_silver strategy, include the items array
      Object.assign(formattedData, {
        items: goldItems.map(item => ({
          ...item,
          metalWeight: parseFloat(item.metalWeight),
          purity: parseFloat(item.purity),
          netWeight: parseFloat(item.netWeight)
        }))
      });
    }
    
    console.log("Submitting formatted loan data:", formattedData);
    onSubmit(formattedData);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-white mb-4">Loan Details</h4>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="loanStrategy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Strategy</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setLoanStrategy(value as "emi" | "flat" | "custom" | "gold_silver");
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select strategy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="emi">EMI</SelectItem>
                        <SelectItem value="flat">FLAT</SelectItem>
                        <SelectItem value="custom">CUSTOM</SelectItem>
                        <SelectItem value="gold_silver">GOLD & SILVER</SelectItem>
                      </SelectContent>
                    </Select>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {!isNewBorrower && (
            <div>
              <h4 className="font-medium text-white mb-4">Guarantor Information</h4>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="guarantorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantor Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter guarantor name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guarantorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantor Phone</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter guarantor phone"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="guarantorAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Guarantor Address</FormLabel>
                      <FormControl>
                        <textarea
                          rows={3}
                          placeholder="Enter guarantor address"
                          {...field}
                          className="w-full px-3 py-2 text-white bg-black border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium text-white mb-4">
              {loanStrategy === "gold_silver" ? "Precious Metal Details" : "Payment Information"}
            </h4>
            <Separator className="my-4" />
            <div className="w-full space-y-4">
              {loanStrategy === "emi" && (
                <>
                  <FormField
                    control={form.control}
                    name="tenure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Tenure (Months)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter months"
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customEmiAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>EMI Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="Enter monthly EMI"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter the fixed monthly payment amount.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* EMI Calculator Toggle */}
                  <div className="flex items-center space-x-3 py-3">
                    <Switch
                      id="show-calculator"
                      checked={showCalculator}
                      onCheckedChange={setShowCalculator}
                    />
                    <label
                      htmlFor="show-calculator"
                      className="text-sm font-medium text-white cursor-pointer flex items-center gap-2"
                    >
                      <Calculator className="h-4 w-4" />
                      Use EMI Calculator
                    </label>
                  </div>

                  {/* EMI Calculator - shown below toggle when enabled */}
                  {showCalculator && (
                    <Card className="bg-black border-2 border-gray-700 shadow-lg w-full">
                      <CardHeader className="bg-black text-white pb-3">
                        <CardTitle className="text-base flex items-center gap-3 font-semibold">
                          <div className="bg-white/20 p-2 rounded-lg">
                            <Calculator className="h-5 w-5" />
                          </div>
                          EMI Calculator
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 bg-black">
                        {/* Horizontal Layout with maximum space */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-end w-full">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-white block">
                              Principal Amount (₹)
                            </label>
                            <Input
                              type="number"
                              placeholder="Enter loan amount"
                              value={calculatorValues.principal}
                              onChange={(e) => handleCalculatorChange('principal', e.target.value)}
                              className="h-11 text-base border-2 border-gray-600 focus:border-white bg-gray-900 text-white placeholder:text-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-white block">
                              Interest Rate (%)
                            </label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Enter rate"
                              value={calculatorValues.interestRate}
                              onChange={(e) => handleCalculatorChange('interestRate', e.target.value)}
                              className="h-11 text-base border-2 border-gray-600 focus:border-white bg-gray-900 text-white placeholder:text-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-white block">
                              Tenure (Months)
                            </label>
                            <Input
                              type="number"
                              placeholder="Enter months"
                              value={calculatorValues.tenure}
                              onChange={(e) => handleCalculatorChange('tenure', e.target.value)}
                              className="h-11 text-base border-2 border-gray-600 focus:border-white bg-gray-900 text-white placeholder:text-gray-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-white block">
                              Calculated EMI
                            </label>
                            <div className="h-11 px-3 py-2 text-base font-bold bg-gray-900 border-2 border-green-500 text-green-400 rounded-md flex items-center">
                              {calculatorValues.principal && calculatorValues.interestRate && calculatorValues.tenure 
                                ? `₹${Math.round(calculateEMI()).toLocaleString()}`
                                : '₹0'
                              }
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {loanStrategy === "flat" && (
                <FormField
                  control={form.control}
                  name="flatMonthlyAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Payment Amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter monthly payment"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The fixed amount the borrower will pay each month without a fixed end date.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {loanStrategy === "custom" && (
                <div className="text-center p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <p className="text-gray-300">
                    For custom loans, payments will be added manually after loan creation.
                  </p>
                </div>
              )}

              {loanStrategy === "gold_silver" && (
                <div className="w-full space-y-6">
                  <Card className="bg-gradient-to-br from-black via-zinc-900 to-neutral-900 border-2 border-amber-400/80 shadow-2xl w-full overflow-hidden relative backdrop-blur-xl">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-xl pointer-events-none" />
                    <CardHeader className="bg-gradient-to-r from-amber-900/40 via-amber-800/30 to-yellow-800/40 text-white pb-2 backdrop-blur-sm border-b border-amber-500/30">
                      <CardTitle className="text-base flex items-center gap-2 font-semibold -mt-1">
                        <Layers className="h-6 w-6 text-amber-400" />
                        Gold Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 bg-gradient-to-br from-zinc-900/60 via-neutral-900/50 to-black/60 backdrop-blur-xl">
                      <div className="grid grid-cols-4 gap-6">
                        <FormField
                          control={form.control}
                          name="itemName"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-amber-200/90">
                                Item
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-amber-500/30 text-white placeholder:text-zinc-400 backdrop-blur-sm shadow-inner"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="metalWeight"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-amber-200/90">
                                Weight (g)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-amber-500/30 text-white placeholder:text-zinc-400 backdrop-blur-sm shadow-inner"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleGoldSilverChange('metalWeight', e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="purity"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-amber-200/90">
                                Purity (%)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-amber-500/30 text-white placeholder:text-zinc-400 backdrop-blur-sm shadow-inner"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleGoldSilverChange('purity', e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="netWeight"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-amber-200/90">
                                Net weight
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-amber-500/30 text-white placeholder:text-zinc-400 cursor-not-allowed opacity-75 backdrop-blur-sm shadow-inner"
                                  value={goldSilverValues.netWeight.toFixed(3)}
                                  readOnly
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-6 flex justify-center">
                        <Button
                          type="button"
                          className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg border border-amber-400/50 backdrop-blur-sm"
                          onClick={() => {
                            setGoldItems([
                              ...goldItems,
                              {
                                itemName: form.getValues('itemName'),
                                metalWeight: form.getValues('metalWeight'),
                                purity: form.getValues('purity'),
                                netWeight: goldSilverValues.netWeight.toFixed(3),
                                notes: form.getValues('goldSilverNotes'),
                                pmType: 'gold',
                              },
                            ]);
                            // Clear fields after adding
                            form.setValue('itemName', '');
                            form.setValue('metalWeight', '');
                            form.setValue('purity', '');
                            setGoldSilverValues({ metalWeight: '', purity: '', netWeight: 0 });
                          }}
                        >
                          <Plus className="h-2.5 w-2.5 mr-0.5" />
                          Add Item
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-black via-zinc-900 to-neutral-900 border-2 border-slate-400/80 shadow-2xl w-full overflow-hidden relative backdrop-blur-xl">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-xl pointer-events-none" />
                    <CardHeader className="bg-gradient-to-r from-slate-900/40 via-slate-800/30 to-slate-800/40 text-white pb-2 backdrop-blur-sm border-b border-slate-500/30">
                      <CardTitle className="text-base flex items-center gap-2 font-semibold -mt-1">
                        <Layers className="h-6 w-6 text-slate-400" />
                        Silver Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 bg-gradient-to-br from-zinc-900/60 via-neutral-900/50 to-black/60 backdrop-blur-xl">
                      <div className="grid grid-cols-4 gap-6">
                        <FormField
                          control={form.control}
                          name="silverItemName"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-slate-200/90">
                                Item
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-slate-500/30 text-white placeholder:text-zinc-400 backdrop-blur-sm shadow-inner"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="silverMetalWeight"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-slate-200/90">
                                Weight (g)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-slate-500/30 text-white placeholder:text-zinc-400 backdrop-blur-sm shadow-inner"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleGoldSilverChange('metalWeight', e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="silverPurity"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-slate-200/90">
                                Purity (%)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-slate-500/30 text-white placeholder:text-zinc-400 backdrop-blur-sm shadow-inner"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleGoldSilverChange('purity', e.target.value);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="silverNetWeight"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel className="text-sm font-medium text-slate-200/90">
                                Net weight
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="text"
                                  placeholder=""
                                  className="h-9 text-sm bg-zinc-900/70 border-slate-500/30 text-white placeholder:text-zinc-400 cursor-not-allowed opacity-75 backdrop-blur-sm shadow-inner"
                                  value={goldSilverValues.netWeight.toFixed(3)}
                                  readOnly
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="mt-6 flex justify-center">
                        <Button
                          type="button"
                          className="bg-gradient-to-r from-slate-600 to-slate-500 hover:from-slate-500 hover:to-slate-400 text-white px-3 py-1 rounded-lg text-xs font-medium shadow-lg border border-slate-400/50 backdrop-blur-sm"
                          onClick={() => {
                            setGoldItems([
                              ...goldItems,
                              {
                                itemName: form.getValues('silverItemName'),
                                metalWeight: form.getValues('silverMetalWeight'),
                                purity: form.getValues('silverPurity'),
                                netWeight: goldSilverValues.netWeight.toFixed(3),
                                notes: form.getValues('goldSilverNotes'),
                                pmType: 'silver',
                              },
                            ]);
                            // Clear fields after adding
                            form.setValue('silverItemName', '');
                            form.setValue('silverMetalWeight', '');
                            form.setValue('silverPurity', '');
                            setGoldSilverValues({ metalWeight: '', purity: '', netWeight: 0 });
                          }}
                        >
                          <Plus className="h-2.5 w-2.5 mr-0.5" />
                          Add Item
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg font-bold text-white">Notes</FormLabel>
                <FormControl>
                  <textarea
                    rows={4}
                    placeholder="Enter any additional notes about this loan, terms, conditions, or special agreements..."
                    {...field}
                    className="w-full px-3 py-2 text-white bg-black border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {goldItems.length > 0 && (
          <div className="mt-8">
            <h5 className="text-white font-semibold mb-2">Added Items</h5>
            <div className="overflow-x-auto rounded-lg border border-amber-400/30 bg-black/40">
              <table className="min-w-full text-sm text-white">
                <thead>
                  <tr className="bg-amber-900/40">
                    <th className="px-4 py-2 text-left">Item</th>
                    <th className="px-4 py-2 text-left">Weight (g)</th>
                    <th className="px-4 py-2 text-left">Purity (%)</th>
                    <th className="px-4 py-2 text-left">Net Weight</th>
                    <th className="px-4 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {goldItems.map((item, idx) => (
                    <tr key={idx} className="border-t border-amber-400/10">
                      <td className="px-4 py-2">{item.itemName}</td>
                      <td className="px-4 py-2">{item.metalWeight}</td>
                      <td className="px-4 py-2">{item.purity}</td>
                      <td className="px-4 py-2">{item.netWeight}</td>
                      <td className="px-4 py-2">{item.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Separator className="my-4" />

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
          >
            {isSubmitting ? "Processing..." : "Create Loan"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LoanForm;