'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, HardDrive, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth.store';

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, 'Letters, numbers, _ and - only'),
  displayName: z.string().max(100).optional(),
  password: z.string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must have an uppercase letter')
    .regex(/[a-z]/, 'Must have a lowercase letter')
    .regex(/\d/, 'Must have a number')
    .regex(/[@$!%*?&]/, 'Must have a special character (@$!%*?&)'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { register: registerUser, isLoading } = useAuthStore();
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await registerUser(data.email, data.username, data.password, data.displayName);
      toast.success('Account created!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src="/storage_logo.png" alt="RGV911 Drive" className="h-14 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-1">Get started today</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Username</label>
                <input
                  {...register('username')}
                  placeholder="johndoe"
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                {errors.username && <p className="mt-1 text-xs text-destructive">{errors.username.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Display Name</label>
                <input
                  {...register('displayName')}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
              />
              {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg bg-background border border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
