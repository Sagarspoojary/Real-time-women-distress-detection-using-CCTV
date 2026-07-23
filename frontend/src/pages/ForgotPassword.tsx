import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import { BsShieldFillExclamation } from "react-icons/bs";
import { BiLoaderAlt } from "react-icons/bi";

// Zod Validation Schema
const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFields>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFields) => {
    setLoading(true);
    try {
      await resetPassword(data.email);
      setEmailSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#030712] relative px-4 select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.06)_0,transparent_60%)] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.05)_0,transparent_65%)] pointer-events-none" />

      {/* Glass card container */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800/80 shadow-[0_0_50px_rgba(0,0,0,0.4)] relative">
        


        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 rounded-xl mb-4">
            <BsShieldFillExclamation className="text-3xl drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" />
          </div>
          <h2 className="text-2xl font-bold text-white text-center">Reset Operator Credentials</h2>
          <p className="text-slate-400 text-xs mt-1 text-center">
            Provide the registered email to dispatch recovery instructions.
          </p>
        </div>

        {emailSent ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg text-center font-medium leading-relaxed">
              An encryption key and password reset link has been dispatched to your email inbox. Please review your inbox to complete the credential reset process.
            </div>
            <Link
              to="/login"
              className="block w-full py-3 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 text-white text-center font-semibold rounded-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Return to Login Terminal
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Email input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Operator Email
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

            {/* Submit Reset Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? <BiLoaderAlt className="animate-spin text-lg" /> : "Request Reset Key"}
            </button>

            {/* Back to Login link */}
            <div className="text-center mt-6">
              <Link 
                to="/login" 
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Back to Login Terminal
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
