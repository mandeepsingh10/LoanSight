import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, DollarSign, Plus, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BorrowerTable from "@/components/borrowers/BorrowerTable";
import NewBorrowerModal from "@/components/borrowers/NewBorrowerModal";
import { useContext } from "react";
import { AppContext } from "@/providers/AppProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Stylized mountain of coins SVG icon
const CoinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 64 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    width={props.width || 32}
    height={props.height || 32}
    {...props}
  >
    {/* Stack 1 (left, silver/gold) */}
    <ellipse cx="12" cy="32" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    <ellipse cx="12" cy="28" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    <ellipse cx="12" cy="24" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    {/* Stack 2 (center left, taller) */}
    <ellipse cx="26" cy="36" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    <ellipse cx="26" cy="32" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    <ellipse cx="26" cy="28" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    <ellipse cx="26" cy="24" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    <ellipse cx="26" cy="20" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    {/* Stack 3 (center, tallest) */}
    <ellipse cx="38" cy="38" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    <ellipse cx="38" cy="34" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    <ellipse cx="38" cy="30" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    <ellipse cx="38" cy="26" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    <ellipse cx="38" cy="22" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    <ellipse cx="38" cy="18" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    {/* Stack 4 (center right, medium) */}
    <ellipse cx="50" cy="34" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    <ellipse cx="50" cy="30" rx="7" ry="2.5" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="1" />
    <ellipse cx="50" cy="26" rx="7" ry="2.5" fill="#FFD700" stroke="#B8860B" strokeWidth="1" />
    {/* Stack 5 (right, short) */}
    <ellipse cx="58" cy="32" rx="5" ry="2" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="0.8" />
    <ellipse cx="58" cy="28" rx="5" ry="2" fill="#FFD700" stroke="#B8860B" strokeWidth="0.8" />
    {/* Coins in front */}
    <ellipse cx="20" cy="39" rx="6" ry="2" fill="#FFD700" stroke="#B8860B" strokeWidth="0.8" />
    <ellipse cx="44" cy="39" rx="6" ry="2" fill="#C0C0C0" stroke="#A9A9A9" strokeWidth="0.8" />
  </svg>
);

const Borrowers = () => {
  const [showNewBorrowerModal, setShowNewBorrowerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("cash");
  const [searchFilter, setSearchFilter] = useState("borrower"); // default to borrower | other options: all, guarantor, borrower_address, guarantor_address
  // Helper to get user-friendly loan strategy label (shared across component)
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
        return strategy?.toUpperCase();
    }
  };
  const { isAdmin, role } = useAuth();

  const { data: allBorrowers, isLoading } = useQuery({
    queryKey: ["/api/borrowers"],
    queryFn: async () => {
      const response = await fetch('/api/borrowers');
      if (!response.ok) {
        throw new Error('Failed to fetch borrowers');
      }
      return response.json();
    }
  });

  // Filter borrowers in frontend based on search
  const borrowers = allBorrowers?.filter(borrower => {
    if (!searchQuery.trim()) return true;
    
    const searchTerm = searchQuery.toLowerCase();
    
    // getLoanStrategyDisplay now defined at component scope
    
    const borrowerFields = [
      borrower.name || '',
      borrower.phone || '',
      borrower.address || ''
    ].join(' ').toLowerCase();

    const guarantorFields = [
      borrower.guarantorName || '',
      borrower.guarantorPhone || '',
      borrower.guarantorAddress || ''
    ].join(' ').toLowerCase();

    // Get loan strategy name for the "all" filter only
    const strategyFields = [
      borrower.loan?.loanStrategy ? getLoanStrategyDisplay(borrower.loan.loanStrategy) : '',
      borrower.loan?.loanStrategy || ''
    ].join(' ').toLowerCase();

    // Filter based on selected searchFilter
    if (searchFilter === "borrower") {
      return (borrower.name || '').toLowerCase().includes(searchTerm);
    } else if (searchFilter === "guarantor") {
      return (borrower.guarantorName || '').toLowerCase().includes(searchTerm);
    } else if (searchFilter === "borrower_address") {
      return (borrower.address || '').toLowerCase().includes(searchTerm);
    } else if (searchFilter === "guarantor_address") {
      return (borrower.guarantorAddress || '').toLowerCase().includes(searchTerm);
    }
    // default all
    const searchableText = [borrowerFields, guarantorFields, strategyFields].join(' ');
    return searchableText.includes(searchTerm);
  });

  // Remove per-loan-type filtering from here. Just sort and search as before.
  const sortedBorrowers = borrowers?.sort((a, b) => {
    const aId = a.idNumber || a.id;
    const bId = b.idNumber || b.id;
    return aId - bId;
  });

  // NEW: Fetch all loans for searched borrowers to compute accurate badge counts
  const { data: borrowerLoans = {}, isLoading: loansLoading } = useQuery({
    queryKey: ["/api/borrowers", "loans", searchFilter, sortedBorrowers?.map(b => b.id) || []],
    // Fetch loans for each borrower in parallel and build a map { borrowerId: Loan[] }
    queryFn: async () => {
      const loanMap: Record<number, any[]> = {};
      if (!sortedBorrowers) return loanMap;

      await Promise.all(sortedBorrowers.map(async (b) => {
        try {
          const resp = await fetch(`/api/borrowers/${b.id}/loans`);
          loanMap[b.id] = resp.ok ? await resp.json() : [];
        } catch {
          loanMap[b.id] = [];
        }
      }));

      return loanMap;
    },
    enabled: !!sortedBorrowers && sortedBorrowers.length > 0
  });

  // Helper to decide loan bucket
  const isCashLoan = (strategy?: string | null) => {
    return !strategy || strategy === "emi" || strategy === "flat" || strategy === "custom";
  };

  // Recalculate badge counts based on all loans the (filtered) borrowers have (unique borrowers)
  const cashBorrowers = (sortedBorrowers || []).filter(b => {
    const loans = borrowerLoans[b.id] || [];
    return loans.some(l => isCashLoan(l.loanStrategy));
  });

  const goldBorrowers = (sortedBorrowers || []).filter(b => {
    const loans = borrowerLoans[b.id] || [];
    return loans.some(l => l.loanStrategy === "gold_silver");
  });

  // Helper to count occurrences of search term in text
  const countOccurrences = (text: string, term: string) => {
    if (!term || !text) return 0;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return (text.match(regex) || []).length;
  };

  let cashResults = cashBorrowers.length;
  let goldResults = goldBorrowers.length;

  if (searchFilter === "all" && searchQuery.trim()) {
    const term = searchQuery.toLowerCase();

    const computeMatches = (b: any, loans: any[]) => {
      const baseFields = [
        b.name,
        b.phone,
        b.address
      ];

      // Aggregate borrower-level guarantor details (may be legacy)
      baseFields.push(b.guarantorName, b.guarantorPhone, b.guarantorAddress);

      // Add per-loan fields
      loans.forEach((ln) => {
        baseFields.push(
          ln.guarantorName,
          ln.guarantorPhone,
          ln.guarantorAddress,
          ln.loanStrategy,
          ln.loanStrategy ? getLoanStrategyDisplay(ln.loanStrategy) : ""
        );
      });

      return baseFields.reduce((sum, f) => sum + countOccurrences((f || '').toString().toLowerCase(), term), 0);
    };

    cashResults = cashBorrowers.reduce((sum, b) => {
      const loans = (borrowerLoans[b.id] || []).filter((ln:any)=> isCashLoan(ln.loanStrategy));
      return sum + computeMatches(b, loans);
    }, 0);

    goldResults = goldBorrowers.reduce((sum, b) => {
      const loans = (borrowerLoans[b.id] || []).filter((ln:any)=> ln.loanStrategy === "gold_silver");
      return sum + computeMatches(b, loans);
    }, 0);
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-6 pl-10 pr-36 w-full rounded-lg"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            {/* Filter dropdown positioned inside input */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <Select value={searchFilter} onValueChange={setSearchFilter}>
                <SelectTrigger className="w-[140px] bg-gray-700/60 hover:bg-gray-600 border border-gray-600 text-white text-sm rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 text-white border-gray-700 shadow-lg rounded-md">
                  <SelectItem value="borrower">Borrower</SelectItem>
                  <SelectItem value="all">All Fields</SelectItem>
                  <SelectItem value="guarantor">Guarantor</SelectItem>
                  <SelectItem value="borrower_address">Borrower Address</SelectItem>
                  <SelectItem value="guarantor_address">Guarantor Address</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          {isAdmin && (
            <Button 
              onClick={() => setShowNewBorrowerModal(true)} 
              className="h-12 px-4 py-3 bg-blue-800 hover:bg-blue-700 text-white flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Borrower</span>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-900 p-1">
          <TabsTrigger 
            value="cash" 
            className="flex items-center space-x-2 text-white border-0 bg-transparent hover:bg-gray-800 data-[state=active]:bg-blue-800 data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            <DollarSign className="h-4 w-4" />
            <span>Cash</span>
            {searchQuery.trim() && (
              <span className="ml-1 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                {cashResults}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="gold-silver" 
            className="flex items-center space-x-2 text-white border-0 bg-transparent hover:bg-gray-800 data-[state=active]:bg-yellow-600 data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            <Star className="h-4 w-4" />
            <span>Gold & Silver</span>
            {searchQuery.trim() && (
              <span className="ml-1 text-xs bg-yellow-600 text-white px-2 py-1 rounded-full">
                {goldResults}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cash">
          {isLoading || loansLoading ? (
            <div className="bg-black rounded-lg border border-gray-800 p-12">
              <LoadingSpinner size="lg" text="Loading borrowers and loan data..." />
            </div>
          ) : sortedBorrowers && sortedBorrowers.length > 0 ? (
            <>
              {/* Debug info */}
              {searchQuery.trim() && (
                <div className="mb-4 p-3 bg-blue-900 text-blue-200 rounded text-sm">
                  {(() => {
                    const plural = (n: number, singular: string, plural: string) => n === 1 ? singular : plural;
                    const labelMap: Record<string, [string, string]> = {
                      borrower: ['borrower', 'borrowers'],
                      guarantor: ['guarantor', 'guarantors'],
                      borrower_address: ['borrower address', 'borrower addresses'],
                      guarantor_address: ['guarantor address', 'guarantor addresses'],
                      all: ['result', 'results']
                    };
                    const [sing, plur] = labelMap[searchFilter] || labelMap['all'];
                    return `Found ${cashResults} ${plural(cashResults, sing, plur)} matching \"${searchQuery}\" in Cash loans`;
                  })()}
                </div>
              )}
            <BorrowerTable borrowers={sortedBorrowers} searchQuery={searchQuery} searchFilter={searchFilter} activeTab="cash" />
            </>
          ) : (
            <div className="bg-black rounded-lg border border-gray-800 p-12 text-center">
              <DollarSign className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchQuery.trim() ? `No Cash Loans Found for "${searchQuery}"` : "No Cash Loans Yet"}
              </h3>
              <p className="text-white/70 mb-6">
                {searchQuery.trim() 
                  ? "Try adjusting your search terms or check the Gold & Silver tab."
                  : "Start adding borrowers with cash loans to see them here."
                }
              </p>
              {isAdmin && !searchQuery.trim() && (
                <Button 
                  onClick={() => setShowNewBorrowerModal(true)}
                  className="flex items-center space-x-2 mx-auto bg-blue-800 hover:bg-blue-700 text-white"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Add First Cash Loan</span>
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gold-silver">
          {isLoading || loansLoading ? (
            <div className="bg-black rounded-lg border border-gray-800 p-12">
              <LoadingSpinner size="lg" text="Loading borrowers and loan data..." />
            </div>
          ) : sortedBorrowers && sortedBorrowers.length > 0 ? (
            <>
              {/* Debug info */}
              {searchQuery.trim() && (
                <div className="mb-4 p-3 bg-yellow-900 text-yellow-200 rounded text-sm">
                  {(() => {
                    const plural = (n: number, singular: string, plural: string) => n === 1 ? singular : plural;
                    const labelMap: Record<string, [string, string]> = {
                      borrower: ['borrower', 'borrowers'],
                      guarantor: ['guarantor', 'guarantors'],
                      borrower_address: ['borrower address', 'borrower addresses'],
                      guarantor_address: ['guarantor address', 'guarantor addresses'],
                      all: ['result', 'results']
                    };
                    const [sing, plur] = labelMap[searchFilter] || labelMap['all'];
                    return `Found ${goldResults} ${plural(goldResults, sing, plur)} matching \"${searchQuery}\" in Gold & Silver loans`;
                  })()}
                </div>
              )}
            <BorrowerTable borrowers={sortedBorrowers} searchQuery={searchQuery} searchFilter={searchFilter} activeTab="gold-silver" />
            </>
          ) : (
            <div className="bg-black rounded-lg border border-gray-800 p-12 text-center">
              <CoinIcon width={96} height={96} className="mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {searchQuery.trim() ? `No Gold & Silver Loans Found for "${searchQuery}"` : "No Gold & Silver Loans Yet"}
              </h3>
              <p className="text-white/70 mb-6">
                {searchQuery.trim() 
                  ? "Try adjusting your search terms or check the Cash tab."
                  : "Start adding borrowers with gold and silver collateral loans to see them here."
                }
              </p>
              {isAdmin && !searchQuery.trim() && (
                <Button 
                  onClick={() => setShowNewBorrowerModal(true)}
                  className="flex items-center space-x-2 mx-auto bg-blue-800 hover:bg-blue-700 text-white"
                >
                  <span className="text-lg font-bold mr-1">+</span>
                  <span>Add Loan</span>
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NewBorrowerModal 
        isOpen={showNewBorrowerModal}
        onClose={() => setShowNewBorrowerModal(false)} 
      />
    </div>
  );
};

export default Borrowers;
