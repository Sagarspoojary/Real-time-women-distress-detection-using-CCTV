import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import { 
  BsShieldFillExclamation, 
  BsGoogle, 
  BsGithub,
  BsEye,
  BsEyeSlash 
} from "react-icons/bs";
import { BiLoaderAlt } from "react-icons/bi";

// Zod Validation Schema
const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFields = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { signInWithEmail, signInWithGoogle, signInWithGithub } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false
    }
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    try {
      await signInWithEmail(data.email, data.password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login submission error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setLoading(true);
    try {
      await signInWithGithub();
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#030712] relative px-4 select-none">
      {/* Visual background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05)_0,transparent_65%)] pointer-events-none" />

      {/* Main glass card container */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.4)] relative">
        


        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 rounded-xl mb-4">
            <BsShieldFillExclamation className="text-3xl drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">Access Security Terminal</h2>
          <p className="text-slate-400 text-xs mt-1">Enter authentication credentials to log in.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Email Address
            </label>
            <input
              type="email"
              {...register("email")}
              className={`w-full px-4 py-3 rounded-lg glass-input text-sm ${
                errors.email ? "border-red-500/50 focus:border-red-500" : ""
              }`}
              placeholder="operator@security.ai"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <Link 
                to="/forgot-password" 
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`w-full px-4 py-3 rounded-lg glass-input text-sm ${
                  errors.password ? "border-red-500/50 focus:border-red-500" : ""
                }`}
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <BsEyeSlash className="text-md" /> : <BsEye className="text-md" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              {...register("rememberMe")}
              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 focus:ring-2 focus:ring-offset-2"
            />
            <label htmlFor="rememberMe" className="ml-2 text-xs text-slate-400 select-none cursor-pointer">
              Remember this terminal
            </label>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? <BiLoaderAlt className="animate-spin text-lg" /> : "Sign In"}
          </button>
        </form>

        {/* Separator */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#030712] px-3 text-slate-500">Or continue with</span>
          </div>
        </div>

        {/* SSO login options */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-sm text-slate-200 hover:text-white transition-all disabled:opacity-50"
          >
            <BsGoogle className="text-red-500 text-xs" /> Google
          </button>
          <button
            onClick={handleGithubLogin}
            disabled={loading}
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-sm text-slate-200 hover:text-white transition-all disabled:opacity-50"
          >
            <BsGithub className="text-slate-300 text-xs" /> GitHub
          </button>
        </div>

        {/* Link to Register */}
        <p className="mt-8 text-center text-xs text-slate-500">
          First time here?{" "}
          <Link 
            to="/register" 
            className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            Create an Operator Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
