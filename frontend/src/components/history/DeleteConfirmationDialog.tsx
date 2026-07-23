import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle } from "react-icons/fi";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  videoName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  videoName,
  onConfirm,
  onCancel,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black z-50 pointer-events-auto"
          />

          {/* Modal content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass-panel border border-red-500/20 p-6 rounded-2xl shadow-2xl z-50 select-none text-center flex flex-col items-center gap-4"
          >
            <div className="p-3 bg-red-950/20 border border-red-500/20 text-red-400 rounded-full">
              <FiAlertTriangle className="text-2xl animate-bounce" />
            </div>

            <div>
              <h3 className="font-extrabold text-sm text-slate-100 uppercase tracking-wider">
                Delete Analysis Log
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Are you sure you want to delete the analysis record for:
                <strong className="block text-slate-200 truncate mt-1">"{videoName}"</strong>
                This action is permanent and cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={onCancel}
                className="flex-grow py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-grow py-2 bg-red-650 hover:bg-red-550 text-white font-semibold text-xs rounded-lg transition-all shadow-md shadow-red-500/10 cursor-pointer"
              >
                Delete Record
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeleteConfirmationDialog;
