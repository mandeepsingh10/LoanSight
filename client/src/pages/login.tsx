import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface LoginPageProps {
  onLogin: () => void;
}

function TypewriterSubtitle() {
  const phrases = ["Simple.", "Smart.", "Tracked."];
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [typing, setTyping] = useState(true);
  const [charIdx, setCharIdx] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (typing) {
      if (charIdx < phrases[phraseIdx].length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed((prev) => prev + phrases[phraseIdx][charIdx]);
          setCharIdx((c) => c + 1);
        }, 80);
      } else {
        timeoutRef.current = setTimeout(() => setTyping(false), 900);
      }
    } else {
      if (charIdx > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed((prev) => prev.slice(0, -1));
          setCharIdx((c) => c - 1);
        }, 40);
      } else {
        timeoutRef.current = setTimeout(() => {
          setPhraseIdx((i) => (i + 1) % phrases.length);
          setTyping(true);
        }, 400);
      }
    }
    return () => clearTimeout(timeoutRef.current);
  }, [typing, charIdx, phraseIdx]);

  return (
    <span className="typewriter-subtitle text-blue-300 font-mono text-lg h-6 block min-h-[1.5em]">{displayed}<span className="blinking-cursor">|</span></span>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [shake, setShake] = useState(false);
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [signupLoading, setSignupLoading] = useState(false);
  const [direction, setDirection] = useState(1);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      console.log("Attempting login with:", data);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      console.log("Login response status:", response.status);
      console.log("Login response headers:", response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Login error response:", errorText);
        throw new Error(errorText || "Login failed");
      }
      
      const responseText = await response.text();
      console.log("Login response text:", responseText);
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Response was:", responseText);
        throw new Error("Invalid response format");
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Login successful! Welcome to LoanSight.",
      });
      onLogin();
    },
    onError: (error: any) => {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
      setShake(true);
    },
  });

  const onSignup = async (data: SignupFormValues) => {
    setSignupLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: data.username, password: data.password }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Signup failed');
      }
      toast({ title: 'Signup successful!', description: 'You can now log in.' });
      setTab('login');
      signupForm.reset();
    } catch (error: any) {
      toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' });
    } finally {
      setSignupLoading(false);
    }
  };

  useEffect(() => {
    if (shake) {
      const timeout = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(timeout);
    }
  }, [shake]);

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
  };

  const handleTabSwitch = (newTab: 'login' | 'signup') => {
    if (tab !== newTab) {
      setDirection(newTab === 'signup' ? 1 : -1);
      setTab(newTab);
    }
  };

  return (
    <div className="login-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">LoanSight</h1>
          <TypewriterSubtitle />
        </div>
        {/* Login Card */}
        <div className={`glow-border${shake ? ' shake' : ''}`}>
          <Card className="bg-black border-gray-700 shadow-2xl">
            <CardHeader className="space-y-1">
              {/* Pill-style Tab Switcher - dark theme */}
              <div className="relative flex w-full max-w-xs mx-auto mb-6 mt-2">
                <div className="flex w-full h-12 rounded-full border border-gray-700 bg-[#0a1931] overflow-hidden relative">
                  {/* Animated pill */}
                  <motion.div
                    className="absolute top-0 left-0 h-full w-1/2 rounded-full z-0"
                    style={{
                      background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 50%, #38bdf8 100%)',
                    }}
                    animate={{ x: tab === 'login' ? '0%' : '100%' }}
                    transition={{ duration: 0.5, ease: [0.68, -0.55, 0.265, 1.55] }}
                  />
                  <button
                    className={`relative flex-1 z-10 font-semibold text-lg transition-colors duration-300 ${tab === 'login' ? 'text-white' : 'text-blue-300'}`}
                    style={{ borderRadius: '9999px' }}
                    onClick={() => handleTabSwitch('login')}
                    type="button"
                  >
                    Login
                  </button>
                  <button
                    className={`relative flex-1 z-10 font-semibold text-lg transition-colors duration-300 ${tab === 'signup' ? 'text-white' : 'text-blue-300'}`}
                    style={{ borderRadius: '9999px' }}
                    onClick={() => handleTabSwitch('signup')}
                    type="button"
                  >
                    Signup
                  </button>
                </div>
              </div>
              {/* Sliding heading panel matching CSS logic */}
              <div className="w-full max-w-md mx-auto overflow-hidden relative">
                <motion.div
                  className="flex w-[200%]"
                  animate={{ x: tab === 'login' ? '0%' : '-50%' }}
                  transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
                  style={{ willChange: 'transform' }}
                >
                  <div className="w-1/2 flex justify-center items-center text-2xl font-bold text-white" style={{ minHeight: '2.5rem' }}>
                    Sign In
                  </div>
                  <div className="w-1/2 flex justify-center items-center text-2xl font-bold text-white" style={{ minHeight: '2.5rem' }}>
                    Sign Up
                  </div>
                </motion.div>
              </div>
              {/* Sliding subtitle panel matching CSS logic */}
              <div className="w-full max-w-md mx-auto overflow-hidden relative mb-4">
                <motion.div
                  className="flex w-[200%]"
                  animate={{ x: tab === 'login' ? '0%' : '-50%' }}
                  transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
                  style={{ willChange: 'transform' }}
                >
                  <div className="w-1/2 flex justify-center items-center text-gray-400 text-center" style={{ minHeight: '1.5rem' }}>
                    Enter your credentials to access your account
                  </div>
                  <div className="w-1/2 flex justify-center items-center text-gray-400 text-center" style={{ minHeight: '1.5rem' }}>
                    Create a new account
                  </div>
                </motion.div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="min-h-[320px] overflow-hidden">
                <motion.div
                  className="flex w-[200%] mt-4"
                  animate={{ x: tab === 'login' ? '0%' : '-50%' }}
                  transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
                  style={{ willChange: 'transform' }}
                >
                  <div className="w-1/2 pr-2">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full min-h-[320px]">
                        <div className="space-y-4">
                          <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Username</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-white" />
                                    <Input
                                      placeholder="Enter your username"
                                      className="pl-10 login-input text-white placeholder-gray-400 focus:border-blue-500"
                                      {...field}
                                    />
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-white">Password</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-white" />
                                    <Input
                                      type={showPassword ? "text" : "password"}
                                      placeholder="Enter your password"
                                      className="pl-10 pr-10 login-input text-white placeholder-gray-400 focus:border-blue-500"
                                      {...field}
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                                      onClick={() => setShowPassword(!showPassword)}
                                    >
                                      {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full font-medium py-2 mt-8 text-white overflow-hidden"
                          style={{ background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 50%, #38bdf8 100%)' }}
                          disabled={loginMutation.isPending}
                        >
                          <span className="block relative w-full h-full min-h-[1em]">
                            <AnimatePresence mode="wait" initial={false}>
                              {tab === 'login' && (
                                <motion.span
                                  key="login-btn-text"
                                  initial={{ opacity: 0, x: direction === 1 ? -32 : 32 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: direction === 1 ? 32 : -32 }}
                                  transition={{ duration: 0.5, ease: [0.68, -0.55, 0.265, 1.55] }}
                                  className="absolute left-0 right-0 text-center w-full"
                                >
                                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </Button>
                      </form>
                    </Form>
                  </div>
                  <div className="w-1/2 pl-2">
                    <Form {...signupForm}>
                      <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                        <FormField
                          control={signupForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Username</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <User className="absolute left-3 top-3 h-4 w-4 text-white" />
                                  <Input
                                    placeholder="Choose a username"
                                    className="pl-10 login-input text-white placeholder-gray-400 focus:border-blue-500"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white" />
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a password"
                                    className="pl-10 pr-10 login-input text-white placeholder-gray-400 focus:border-blue-500"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={signupForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Confirm Password</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Lock className="absolute left-3 top-3 h-4 w-4 text-white" />
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Confirm your password"
                                    className="pl-10 pr-10 login-input text-white placeholder-gray-400 focus:border-blue-500"
                                    {...field}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button
                          type="submit"
                          className="w-full mt-2 text-white overflow-hidden"
                          style={{ background: 'linear-gradient(90deg, #0ea5e9 0%, #2563eb 50%, #38bdf8 100%)' }}
                          disabled={signupLoading}
                        >
                          <span className="block relative w-full h-full min-h-[1em]">
                            <AnimatePresence mode="wait" initial={false}>
                              {tab === 'signup' && (
                                <motion.span
                                  key="signup-btn-text"
                                  initial={{ opacity: 0, x: direction === 1 ? 32 : -32 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: direction === 1 ? -32 : 32 }}
                                  transition={{ duration: 0.5, ease: [0.68, -0.55, 0.265, 1.55] }}
                                  className="absolute left-0 right-0 text-center w-full"
                                >
                                  {signupLoading ? 'Signing up...' : 'Sign Up'}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </Button>
                      </form>
                    </Form>
                  </div>
                </motion.div>
              </div>
              {/* Sliding below-button text panel matching CSS logic */}
              <div className="w-full max-w-md mx-auto overflow-hidden relative mt-2">
                <motion.div
                  className="flex w-[200%]"
                  animate={{ x: tab === 'login' ? '0%' : '-50%' }}
                  transition={{ duration: 0.6, ease: [0.68, -0.55, 0.265, 1.55] }}
                  style={{ willChange: 'transform' }}
                >
                  <div className="w-1/2 flex justify-center items-center text-blue-300 text-center" style={{ minHeight: '1.5rem' }}>
                    Not a member?{' '}
                    <button type="button" className="underline text-blue-400 hover:text-blue-200" onClick={() => handleTabSwitch('signup')}>
                      Signup now
                    </button>
                  </div>
                  <div className="w-1/2 flex justify-center items-center text-blue-300 text-center" style={{ minHeight: '1.5rem' }}>
                    Already have an account?{' '}
                    <button type="button" className="underline text-blue-400 hover:text-blue-200" onClick={() => handleTabSwitch('login')}>
                      Sign in
                    </button>
                  </div>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>© 2025 LoanSight. Secure Loan Management.</p>
        </div>
      </div>
    </div>
  );
}