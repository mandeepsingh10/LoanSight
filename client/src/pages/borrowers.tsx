import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, DollarSign, Star, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BorrowerTable from "@/components/borrowers/BorrowerTable";
import NewBorrowerModal from "@/components/borrowers/NewBorrowerModal";
import { useContext } from "react";
import { AppContext } from "@/providers/AppProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";

const Borrowers = () => {
  const [showNewBorrowerModal, setShowNewBorrowerModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("cash");
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
    
    // Get loan strategy display name for searching
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
    
    const searchableText = [
      borrower.name || '',
      borrower.phone || '',
      borrower.address || '',
      borrower.guarantorName || '',
      borrower.guarantorPhone || '',
      borrower.guarantorAddress || '',
      borrower.loan?.loanStrategy ? getLoanStrategyDisplay(borrower.loan.loanStrategy) : '',
      borrower.loan?.loanStrategy || '' // Also search the raw strategy value
    ].join(' ').toLowerCase();
    
    return searchableText.includes(searchTerm);
  });

  // Separate cash and gold/silver borrowers based on loan strategy
  const cashBorrowers = borrowers?.filter(borrower => 
    !borrower.loan?.loanStrategy || 
    borrower.loan?.loanStrategy === 'emi' || 
    borrower.loan?.loanStrategy === 'flat' || 
    borrower.loan?.loanStrategy === 'custom'
  );
  
  const goldSilverBorrowers = borrowers?.filter(borrower => 
    borrower.loan?.loanStrategy === 'gold_silver'
  );

  // Sort borrowers by ID in ascending order
  const sortedCashBorrowers = cashBorrowers?.sort((a, b) => {
    const aId = a.idNumber || a.id;
    const bId = b.idNumber || b.id;
    return aId - bId;
  });

  const sortedGoldSilverBorrowers = goldSilverBorrowers?.sort((a, b) => {
    const aId = a.idNumber || a.id;
    const bId = b.idNumber || b.id;
    return aId - bId;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search borrowers, phone, address, guarantor name/phone/address, or loan type (EMI, FLAT, CUSTOM, GOLD/SILVER)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="py-6 pl-10 pr-4 w-full rounded-lg"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
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
                {sortedCashBorrowers?.length || 0}
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
                {sortedGoldSilverBorrowers?.length || 0}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cash">
          {isLoading ? (
            <div className="bg-black rounded-lg border border-gray-800 p-6">
              <Skeleton className="h-10 w-full mb-4 bg-gray-800" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-gray-800" />
                ))}
              </div>
            </div>
          ) : sortedCashBorrowers && sortedCashBorrowers.length > 0 ? (
            <>
              {/* Debug info */}
              {searchQuery.trim() && (
                <div className="mb-4 p-3 bg-blue-900 text-blue-200 rounded text-sm">
                  Found {sortedCashBorrowers.length} cash borrowers matching "{searchQuery}"
                </div>
              )}
              <BorrowerTable borrowers={sortedCashBorrowers} searchQuery={searchQuery} />
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
          {isLoading ? (
            <div className="bg-black rounded-lg border border-gray-800 p-6">
              <Skeleton className="h-10 w-full mb-4 bg-gray-800" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-gray-800" />
                ))}
              </div>
            </div>
          ) : sortedGoldSilverBorrowers && sortedGoldSilverBorrowers.length > 0 ? (
            <>
              {/* Debug info */}
              {searchQuery.trim() && (
                <div className="mb-4 p-3 bg-yellow-900 text-yellow-200 rounded text-sm">
                  Found {sortedGoldSilverBorrowers.length} gold/silver borrowers matching "{searchQuery}"
                </div>
              )}
              <BorrowerTable borrowers={sortedGoldSilverBorrowers} searchQuery={searchQuery} />
            </>
          ) : (
            <div className="bg-black rounded-lg border border-gray-800 p-12 text-center">
              <Star className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
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
                  <Star className="h-4 w-4" />
                  <span>Add First Gold/Silver Loan</span>
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
