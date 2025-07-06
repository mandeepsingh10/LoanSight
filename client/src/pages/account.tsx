import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { useLocation } from "wouter";

const Account = () => {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const { toast } = useToast();
  const { username, role, isAdmin, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (passwords: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest('POST', '/api/auth/change-password', passwords);
      return response;
    },
    onSuccess: () => {
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordDialog(false);
      toast({
        title: "Password Changed Successfully",
        description: "Your password has been updated. You will be logged out to sign in with your new password.",
      });
      // Logout the user after a short delay
      setTimeout(() => {
        logout();
        setLocation('/');
      }, 2000);
    },
    onError: (error) => {
      setIsChangingPassword(false);
      toast({
        title: "Password Change Failed",
        description: `Failed to change password: ${error}`,
        variant: "destructive",
      });
    }
  });

  const handleChangePassword = () => {
    if (!currentPassword.trim()) {
      toast({
        title: "Current Password Required",
        description: "Please enter your current password.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword.trim()) {
      toast({
        title: "New Password Required",
        description: "Please enter a new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "New password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "New password and confirm password must match.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    changePasswordMutation.mutate({
      currentPassword,
      newPassword
    });
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* User Account Information */}
      <Card className="bg-black border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <User className="h-5 w-5" />
            <span>Account Information</span>
          </CardTitle>
          <p className="text-white/70">
            View your account details and manage your profile settings.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-white/70 text-sm">Username</Label>
                <div className="mt-1 p-3 bg-gray-900 border border-gray-700 rounded-md">
                  <span className="text-white font-medium">{username}</span>
                </div>
              </div>
              
              <div>
                <Label className="text-white/70 text-sm">Role</Label>
                <div className="mt-1 p-3 bg-gray-900 border border-gray-700 rounded-md">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    isAdmin 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : "bg-blue-100 text-blue-800 border-blue-200"
                  }`}>
                    {isAdmin ? "Administrator" : "Viewer"}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-white/70 text-sm">Access Level</Label>
                <div className="mt-1 p-3 bg-gray-900 border border-gray-700 rounded-md">
                  <span className="text-white">
                    {isAdmin ? "Full access to all features" : "Read-only access to view data"}
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-white/70 text-sm">Account Status</Label>
                <div className="mt-1 p-3 bg-gray-900 border border-gray-700 rounded-md">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card className="bg-black border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <Lock className="h-5 w-5" />
            <span>Password Management</span>
          </CardTitle>
          <p className="text-white/70">
            Change your account password to keep your account secure.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border border-blue-600 rounded-lg bg-blue-900/20">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <h4 className="font-medium text-blue-300">Security Notice</h4>
            </div>
            <p className="text-sm text-blue-200">
              After changing your password, you will be automatically logged out and redirected to the login page.
              Make sure to remember your new password.
            </p>
          </div>

          <div className="p-4 border border-white/20 rounded-lg bg-black">
            <h4 className="font-medium text-white mb-2">Change Password</h4>
            <p className="text-sm text-white/70 mb-4">
              Update your account password. You'll need to provide your current password for security.
            </p>
            
            <Button 
              onClick={() => setShowPasswordDialog(true)}
              className="flex items-center space-x-2 bg-blue-800 text-white hover:bg-blue-700"
            >
              <Lock className="h-4 w-4" />
              <span>Change Password</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(open) => {
        if (!open) {
          resetPasswordForm();
        }
        setShowPasswordDialog(open);
      }}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Change Password</span>
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Enter your current password and choose a new password.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password" className="text-white">
                Current Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="bg-black border-white/20 text-white pr-10"
                  disabled={isChangingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={isChangingPassword}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-white/70" />
                  ) : (
                    <Eye className="h-4 w-4 text-white/70" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="new-password" className="text-white">
                New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="bg-black border-white/20 text-white pr-10"
                  disabled={isChangingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isChangingPassword}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-white/70" />
                  ) : (
                    <Eye className="h-4 w-4 text-white/70" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-password" className="text-white">
                Confirm New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="bg-black border-white/20 text-white pr-10"
                  disabled={isChangingPassword}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isChangingPassword}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-white/70" />
                  ) : (
                    <Eye className="h-4 w-4 text-white/70" />
                  )}
                </Button>
              </div>
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <div className="p-3 border border-red-600 rounded-lg bg-red-900/20">
                <p className="text-sm text-red-300">
                  New password and confirm password don't match.
                </p>
              </div>
            )}

            {newPassword && newPassword.length < 6 && (
              <div className="p-3 border border-yellow-600 rounded-lg bg-yellow-900/20">
                <p className="text-sm text-yellow-300">
                  New password must be at least 6 characters long.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                resetPasswordForm();
                setShowPasswordDialog(false);
              }}
              className="border-gray-600 text-white hover:bg-gray-800"
              disabled={isChangingPassword}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword.trim() || !newPassword.trim() || newPassword !== confirmPassword || newPassword.length < 6}
              className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
            >
              {isChangingPassword ? "Changing Password..." : "Change Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Account; 