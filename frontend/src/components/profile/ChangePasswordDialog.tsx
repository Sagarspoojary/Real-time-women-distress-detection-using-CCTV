import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FiX, FiLock, FiEye, FiEyeOff } from "react-icons/fi";

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Current password must be at least 6 characters"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type PasswordFields = z.infer<typeof passwordSchema>;

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onSave: (data: PasswordFields) => Promise<void>;
  onClose: () => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({
  isOpen,
  onSave,
  onClose,
}) => {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [strength, setStrength] = useState({ score: 0, label: "Too Short", color: "bg-slate-800" });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PasswordFields>({
    resolver: zodResolver(passwordSchema),
  });

  const newPasswordVal = watch("newPassword", "");

  // Update password strength indicator
  useEffect(() => {
    if (!newPasswordVal) {
      setStrength({ score: 0, label: "Too Short", color: "bg-slate-800" });
      return;
    }
    let score = 0;
    if (newPasswordVal.length >= 6) score += 1;
    if (newPasswordVal.length >= 8) score += 1;
    if (/[A-Z]/.test(newPasswordVal) && /[a-z]/.test(newPasswordVal)) score += 1;
    if (/[0-9]/.test(newPasswordVal) || /[^A-Za-z0-9]/.test(newPasswordVal)) score += 1;

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

    setStrength({ score, label, color });
  }, [newPasswordVal]);

  const onSubmit = async (data: PasswordFields) => {
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (err) {
      // Error is toasted in the caller
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50 pointer-events-auto"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel border border-slate-900 p-6 rounded-2xl shadow-2xl z-50 select-none flex flex-col gap-4 text-xs"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-900/60">
              <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
                Change Credentials
              </h3>
              <button
                onClick={onClose}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <FiX />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Current Password */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    {...register("currentPassword")}
                    className="w-full pl-9 pr-10 py-2 rounded-lg glass-input text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showCurrent ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="Enter new password"
                    {...register("newPassword")}
                    className="w-full pl-9 pr-10 py-2 rounded-lg glass-input text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showNew ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.newPassword.message}</p>
                )}

                {/* Strength meter */}
                {newPasswordVal && (
                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-bold uppercase text-slate-500">
                      <span>Strength</span>
                      <span className="font-extrabold">{strength.label}</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className={`h-full ${strength.color} transition-all duration-300`} 
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    {...register("confirmPassword")}
                    className="w-full pl-9 pr-10 py-2 rounded-lg glass-input text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showConfirm ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-grow py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-grow py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-cyan-500/10 cursor-pointer"
                >
                  {isSubmitting ? "Updating..." : "Update Password"}
                </button>
              </div>

            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChangePasswordDialog;
export type { PasswordFields };
