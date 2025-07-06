import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  User,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Calendar,
  Pencil
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/providers/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'viewer';
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'viewer';
  firstName: string;
  lastName: string;
}

interface UpdateUserData {
  email?: string;
  role?: 'admin' | 'viewer';
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

const UserManagement = () => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);
  
  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    username: '',
    email: '',
    password: '',
    role: 'viewer',
    firstName: '',
    lastName: ''
  });
  
  const [editForm, setEditForm] = useState<UpdateUserData>({
    email: '',
    role: 'viewer',
    firstName: '',
    lastName: '',
    isActive: true
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, username, role } = useAuth();
  
  console.log('User Management - Current user:', { username, role, isAdmin });

  // Fetch users
  const { data: usersResponse, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('Fetching users, isAdmin:', isAdmin);
      try {
        const response = await apiRequest('GET', '/api/users');
        const data = await response.json();
        console.log('Users API response:', data);
        console.log('Response type:', typeof data);
        console.log('Is array:', Array.isArray(data));
        return data;
      } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
    },
    enabled: isAdmin
  });

  // Ensure users is always an array
  const users = Array.isArray(usersResponse) ? usersResponse : [];
  console.log('Processed users:', users);

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      const response = await apiRequest('POST', '/api/users', userData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "User Created Successfully",
        description: "The new user has been created and can now log in.",
      });
      setShowCreateDialog(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create User",
        description: `Error: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number; userData: UpdateUserData }) => {
      const response = await apiRequest('PUT', `/api/users/${userId}`, userData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "User Updated Successfully",
        description: "The user details have been updated.",
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      resetEditForm();
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update User",
        description: `Error: ${error}`,
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('DELETE', `/api/users/${userId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "User Deleted Successfully",
        description: "The user has been permanently deleted.",
      });
      setShowDeleteDialog(false);
      setDeleteUserId(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete User",
        description: `Error: ${error}`,
        variant: "destructive",
      });
    }
  });

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      email: '',
      password: '',
      role: 'viewer',
      firstName: '',
      lastName: ''
    });
  };

  const resetEditForm = () => {
    setEditForm({
      email: '',
      role: 'viewer',
      firstName: '',
      lastName: '',
      isActive: true
    });
  };

  const handleCreateUser = () => {
    if (!createForm.username.trim() || !createForm.password.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Username and password are required.",
        variant: "destructive",
      });
      return;
    }

    if (createForm.password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if provided
    if (createForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createForm.email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(createForm);
  };

  const handleEditUser = (user: User) => {
    console.log('Editing user:', user);
    console.log('User role type:', typeof user.role);
    console.log('User role value:', user.role);
    setSelectedUser(user);
    const formData = {
      email: user.email || '',
      role: user.role.toLowerCase() as 'admin' | 'viewer',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      isActive: user.isActive
    };
    console.log('Setting edit form data:', formData);
    setEditForm(formData);
    setShowEditDialog(true);
  };

  const handleUpdateUser = () => {
    if (!selectedUser) return;
    const userData = { ...editForm };
    if (userData.email === '') delete userData.email;
    updateUserMutation.mutate({
      userId: selectedUser.id,
      userData
    });
  };

  const handleDeleteUser = (user: User) => {
    setDeleteUserId(user.id);
    setShowDeleteDialog(true);
  };

  const confirmDeleteUser = () => {
    if (deleteUserId) {
      deleteUserMutation.mutate(deleteUserId);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Administrator</Badge>;
      case 'viewer':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Viewer</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200">{role}</Badge>;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'Full access to all features including user management';
      case 'viewer':
        return 'Read-only access to view data';
      default:
        return 'Unknown role';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="bg-black border-red-600/50">
          <CardContent className="p-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
              <p className="text-white/70">
                You need administrator privileges to access user management.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <div className="text-white text-lg">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-black border-red-600/50">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-2">Error loading users</div>
              <div className="text-white/70">{error.toString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Users List */}
      <Card className="bg-black border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-white">
              <Users className="h-5 w-5" />
              <span>Users ({users.length})</span>
            </CardTitle>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center space-x-2 bg-blue-800 text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add User</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-white/50 mx-auto mb-4" />
              <p className="text-white/70">No users found. Create the first user to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white">Username</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  <TableHead className="text-white">Role</TableHead>
                  <TableHead className="text-white text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className="border-white/10 hover:bg-gray-900/50">
                    <TableCell className="text-white">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gray-600 text-white text-sm font-medium">
                            {user.username?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/70">{user.email || '-'}</TableCell>
                    <TableCell className="text-white">
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil size={16} className="text-blue-400 hover:text-blue-300" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          resetCreateForm();
        }
        setShowCreateDialog(open);
      }}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New User</span>
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Add a new user to the system with appropriate role and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-username" className="text-white">Username *</Label>
                <Input
                  id="create-username"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({...createForm, username: e.target.value})}
                  placeholder="Enter username"
                  className="bg-black border-white/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="create-email" className="text-white">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({...createForm, email: e.target.value})}
                  placeholder="Enter email"
                  className="bg-black border-white/20 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-firstname" className="text-white">First Name</Label>
                <Input
                  id="create-firstname"
                  value={createForm.firstName}
                  onChange={(e) => setCreateForm({...createForm, firstName: e.target.value})}
                  placeholder="Enter first name"
                  className="bg-black border-white/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="create-lastname" className="text-white">Last Name</Label>
                <Input
                  id="create-lastname"
                  value={createForm.lastName}
                  onChange={(e) => setCreateForm({...createForm, lastName: e.target.value})}
                  placeholder="Enter last name"
                  className="bg-black border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="create-role" className="text-white">Role</Label>
              <Select value={createForm.role} onValueChange={(value: 'admin' | 'viewer') => setCreateForm({...createForm, role: value})}>
                <SelectTrigger className="bg-black border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                  <SelectItem value="admin">Administrator - Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="create-password" className="text-white">Password *</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({...createForm, password: e.target.value})}
                  placeholder="Enter password (min 8 characters)"
                  className="bg-black border-white/20 text-white pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-white/70" />
                  ) : (
                    <Eye className="h-4 w-4 text-white/70" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                resetCreateForm();
                setShowCreateDialog(false);
              }}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending || !createForm.username.trim() || !createForm.password.trim() || createForm.password.length < 8}
              className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
            >
              {createUserMutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setSelectedUser(null);
          resetEditForm();
        }
        setShowEditDialog(open);
      }}>
        <DialogContent className="bg-black border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <Edit className="h-5 w-5" />
              <span>Edit User: {selectedUser?.username}</span>
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Update user details and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Username</Label>
              <Input
                value={selectedUser?.username || ''}
                disabled
                className="bg-gray-800 border-gray-600 text-white/70"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstname" className="text-white">First Name</Label>
                <Input
                  id="edit-firstname"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                  placeholder="Enter first name"
                  className="bg-black border-white/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="edit-lastname" className="text-white">Last Name</Label>
                <Input
                  id="edit-lastname"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                  placeholder="Enter last name"
                  className="bg-black border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-email" className="text-white">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder="Enter email"
                className="bg-black border-white/20 text-white"
              />
            </div>

            <div>
              <Label htmlFor="edit-role" className="text-white">Role</Label>
              <Select value={editForm.role || 'viewer'} onValueChange={(value: 'admin' | 'viewer') => setEditForm({...editForm, role: value})}>
                <SelectTrigger className="bg-black border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  <SelectItem value="viewer">Viewer - Read-only access</SelectItem>
                  <SelectItem value="admin">Administrator - Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                className="rounded border-white/20 bg-black"
              />
              <Label htmlFor="edit-active" className="text-white">Active Account</Label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectedUser(null);
                resetEditForm();
                setShowEditDialog(false);
              }}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
              className="bg-blue-800 text-white hover:bg-blue-700 disabled:bg-gray-600"
            >
              {updateUserMutation.isPending ? "Updating..." : "Update User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-black border-red-600/50 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-400 flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Delete User</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-white hover:bg-gray-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-800 text-white hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement; 