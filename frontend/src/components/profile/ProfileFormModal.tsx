import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FiX, FiUser, FiCamera, FiMail } from "react-icons/fi";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  photoURL: z.string().url("Please enter a valid image URL").or(z.string().length(0)),
});

type ProfileFields = z.infer<typeof profileSchema>;

interface ProfileFormModalProps {
  isOpen: boolean;
  initialName: string;
  initialPhotoURL: string;
  initialEmail: string;
  onSave: (data: ProfileFields) => Promise<void>;
  onClose: () => void;
}

const ProfileFormModal: React.FC<ProfileFormModalProps> = ({
  isOpen,
  initialName,
  initialPhotoURL,
  initialEmail,
  onSave,
  onClose,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: initialName,
      photoURL: initialPhotoURL,
    },
  });

  const onSubmit = async (data: ProfileFields) => {
    await onSave(data);
    onClose();
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

          {/* Modal box */}
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
                Edit Operator Profile
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
              {/* Email (Read Only UI) */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Email Address (Clearance ID)
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    disabled
                    value={initialEmail}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-950 text-slate-500 rounded-lg cursor-not-allowed font-semibold focus:outline-none"
                  />
                </div>
                <span className="text-[9px] text-slate-600 mt-1 block">Email revisions require administrative re-auth.</span>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    {...register("fullName")}
                    className="w-full pl-9 pr-4 py-2 rounded-lg glass-input text-white"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.fullName.message}</p>
                )}
              </div>

              {/* Profile URL */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Profile Photo URL
                </label>
                <div className="relative">
                  <FiCamera className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    {...register("photoURL")}
                    className="w-full pl-9 pr-4 py-2 rounded-lg glass-input text-white"
                  />
                </div>
                {errors.photoURL && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.photoURL.message}</p>
                )}
              </div>

              {/* Action buttons */}
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
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>

            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileFormModal;
export type { ProfileFields };
