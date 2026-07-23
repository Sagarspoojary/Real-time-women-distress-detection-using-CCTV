import React, { useState, useEffect } from "react";
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
const registerSchema = z.object({
  fullName: z.string().min(2, "Full Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirmation password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type RegisterFields = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const { signUpWithEmail, signInWithGoogle, signInWithGithub } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: "Very Weak", color: "bg-red-500" });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
  });

  const passwordVal = watch("password", "");

  // Password strength checker logic
  useEffect(() => {
    if (!passwordVal) {
      setPasswordStrength({ score: 0, label: "Too Short", color: "bg-slate-800" });
      return;
    }
    let score = 0;
    if (passwordVal.length >= 6) score += 1;
    if (passwordVal.length >= 8) score += 1;
    if (/[A-Z]/.test(passwordVal) && /[a-z]/.test(passwordVal)) score += 1;
    if (/[0-9]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal)) score += 1;

    let label = "Weak";
    let color = "bg-red-500/70";

    if (score === 2) {
      label = "Fair";
      color = "bg-amber-500/70";
    } else if (score === 3) {
      label = "Good";
      color = "bg-indigo-500/70";
    } else if (score === 4) {
      label = "Strong";
      color = "bg-emerald-500/70";
    }

    setPasswordStrength({ score, label, color });
  }, [passwordVal]);

  const onSubmit = async (data: RegisterFields) => {
    setLoading(true);
    try {
      await signUpWithEmail(data.email, data.password, data.fullName);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
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
    <div className="flex items-center justify-center min-h-screen bg-[#030712] relative px-4 py-12 select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05)_0,transparent_65%)] pointer-events-none" />

      {/* Main glass registration card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.4)] relative">
        


        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 rounded-xl mb-4">
            <BsShieldFillExclamation className="text-3xl drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">Register Operator Profile</h2>
          <p className="text-slate-400 text-xs mt-1">Create authorization credentials to initialize access.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Full Name
            </label>
            <input
              type="text"
              {...register("fullName")}
              className={`w-full px-4 py-3 rounded-lg glass-input text-sm ${
                errors.fullName ? "border-red-500/50 focus:border-red-500" : ""
              }`}
              placeholder="Officer Jane Doe"
              disabled={loading}
            />
            {errors.fullName && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email Address */}
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
              placeholder="jane.doe@security.ai"
              disabled={loading}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Secret Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className={`w-full px-4 py-3 rounded-lg glass-input text-sm ${
                  errors.password ? "border-red-500/50 focus:border-red-500" : ""
                }`}
                placeholder="Minimum 6 characters"
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
            
            {/* Password strength visualization */}
            {passwordVal && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 font-semibold uppercase">
                  <span>Strength Rating</span>
                  <span className="font-bold">{passwordStrength.label}</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden flex gap-0.5">
                  <div className={`h-full flex-grow rounded-sm transition-all duration-300 ${
                    passwordStrength.score >= 1 ? passwordStrength.color : "bg-slate-800"
                  }`} />
                  <div className={`h-full flex-grow rounded-sm transition-all duration-300 ${
                    passwordStrength.score >= 2 ? passwordStrength.color : "bg-slate-800"
                  }`} />
                  <div className={`h-full flex-grow rounded-sm transition-all duration-300 ${
                    passwordStrength.score >= 3 ? passwordStrength.color : "bg-slate-800"
                  }`} />
                  <div className={`h-full flex-grow rounded-sm transition-all duration-300 ${
                    passwordStrength.score >= 4 ? passwordStrength.color : "bg-slate-800"
                  }`} />
                </div>
              </div>
            )}

            {errors.password && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                {...register("confirmPassword")}
                className={`w-full px-4 py-3 rounded-lg glass-input text-sm ${
                  errors.confirmPassword ? "border-red-500/50 focus:border-red-500" : ""
                }`}
                placeholder="Re-enter password"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <BsEyeSlash className="text-md" /> : <BsEye className="text-md" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-400 font-medium">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Register Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {loading ? <BiLoaderAlt className="animate-spin text-lg" /> : "Create Account"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#030712] px-3 text-slate-500">Or Register with</span>
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

        {/* Link back to Login */}
        <p className="mt-8 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link 
            to="/login" 
            className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            Sign In to Terminal
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
