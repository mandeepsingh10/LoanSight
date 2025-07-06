import { useParams, useLocation } from "wouter";
import { BorrowerDetails } from "@/components/borrowers/BorrowerDetails";

export default function EditBorrower() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const borrowerId = parseInt(id || "0");

  return (
    <BorrowerDetails 
      borrowerId={borrowerId} 
      isOpen={true} 
      onClose={() => navigate("/borrowers")}
      fullScreen={true}
      readOnly={false}
    />
  );
}