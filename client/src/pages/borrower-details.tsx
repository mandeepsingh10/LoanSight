import { useParams, useLocation } from "wouter";
import { BorrowerDetails } from "@/components/borrowers/BorrowerDetails";

export default function BorrowerDetailsPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const borrowerId = parseInt(id || "0");

  return (
    <div className="min-h-screen bg-black text-white">
      <BorrowerDetails 
        borrowerId={borrowerId} 
        isOpen={true} 
        onClose={() => navigate("/borrowers")}
        fullScreen={true}
      />
    </div>
  );
}