import { useLocation } from "wouter";
import { Menu, Search, LogOut, User, ChevronDown, FileText, BarChart3, Users, AlertTriangle, Settings, CreditCard, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContext } from "react";
import { AppContext } from "@/providers/AppProvider";
import { useAuth } from "@/providers/AuthProvider";

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header = ({ sidebarOpen, setSidebarOpen }: HeaderProps) => {
  const [location] = useLocation();
  const { searchQuery, setSearchQuery } = useContext(AppContext);
  const { logout, username, role, isAdmin } = useAuth();

  const tabTitles: Record<string, string> = {
    "/": "Dashboard",
    "/borrowers": "Borrowers",
    "/payments": "Payments",
    "/defaulters": "Defaulters",
    "/reports": "", // Remove title for reports page
    "/settings": "Settings",
    "/account": "Account",
    "/user-management": "User Management",
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <header className="bg-black border-b border-gray-800 shadow-sm sticky top-0 z-5">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Menu button and page title */}
        <div className="flex items-center flex-1">
          <button 
            className="md:hidden mr-4" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="text-white" />
          </button>
          {(() => {
            const getPageHeader = () => {
              switch(location) {
                case "/":
                  return (
                    <div className="flex items-center space-x-3">
                      <BarChart3 className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                    </div>
                  );
                case "/borrowers":
                  return (
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Borrowers</h2>
                    </div>
                  );
                case "/payments":
                  return (
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Payments</h2>
                    </div>
                  );
                case "/defaulters":
                  return (
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Defaulters</h2>
                    </div>
                  );
                case "/reports":
                  return (
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Reports</h2>
                    </div>
                  );
                case "/settings":
                  return (
                    <div className="flex items-center space-x-3">
                      <Settings className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Settings</h2>
                    </div>
                  );
                case "/account":
                  return (
                    <div className="flex items-center space-x-3">
                      <User className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Account</h2>
                    </div>
                  );
                case "/user-management":
                  return (
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">User Management</h2>
                    </div>
                  );
                default:
                  // Check if it's an edit borrower route
                  if (location.startsWith('/edit-borrower/')) {
                    return (
                      <div className="flex items-center w-full">
                        <Button
                          variant="ghost"
                          onClick={() => window.location.href = '/borrowers'}
                          className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800 p-3 absolute left-6"
                        >
                          <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="flex items-center space-x-3 mx-auto">
                          <Users className="h-8 w-8 text-white" />
                          <h2 className="text-2xl font-bold text-white">Borrower Details</h2>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <h2 className="text-2xl font-bold text-white">
                      {tabTitles[location] || "Page Not Found"}
                    </h2>
                  );
              }
            };
            return getPageHeader();
          })()}
        </div>
        
        {/* Right side - User dropdown */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-3 py-2 h-12 hover:bg-gray-800">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gray-600 text-white text-sm font-medium">
                    {username?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start justify-center">
                  <span className="text-sm font-medium text-white leading-tight">{username}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-white/70 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm">Access Level</span>
                  <Badge 
                    variant={isAdmin ? "default" : "secondary"} 
                    className={`text-xs px-2 py-1 ${
                      isAdmin 
                        ? "bg-green-100 text-green-800 border-green-200" 
                        : "bg-blue-100 text-blue-800 border-blue-200"
                    }`}
                  >
                    {isAdmin ? "Admin" : "Viewer"}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => window.location.href = '/account'}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Account</span>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem 
                  onClick={() => window.location.href = '/user-management'}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span>User Management</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
