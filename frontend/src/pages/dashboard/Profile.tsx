import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { auth } from "../../services/firebase";
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import ProfileAvatar from "../../components/profile/ProfileAvatar";
import ProfileFormModal from "../../components/profile/ProfileFormModal";
import type { ProfileFields } from "../../components/profile/ProfileFormModal";
import ChangePasswordDialog from "../../components/profile/ChangePasswordDialog";
import type { PasswordFields } from "../../components/profile/ChangePasswordDialog";
import toast from "react-hot-toast";
import { 
  FiUser, 
  FiMail, 
  FiShield, 
  FiCalendar, 
  FiClock, 
  FiLock, 
  FiLogOut, 
  FiEdit, 
  FiCheckCircle 
} from "react-icons/fi";

const Profile: React.FC = () => {
  const { user, logout } = useAuth();

  // Dialog toggle states
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  if (!user) {
    return (
      <div className="glass-panel p-8 rounded-2xl border border-slate-900 text-center text-xs text-slate-500 italic">
        Awaiting operator credentials synchronization...
      </div>
    );
  }

  const displayName = user.displayName || "Operator";
  const email = user.email || "operator@security.ai";
  const photoURL = user.photoURL || "";

  // Date formatters
  const accountCreated = user.metadata.creationTime 
    ? new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric"
      })
    : "Unavailable";

  const lastLogin = user.metadata.lastSignInTime
    ? new Date(user.metadata.lastSignInTime).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Unavailable";

  // Save profile edits to Firebase Auth
  const handleSaveProfile = async (data: ProfileFields) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      await updateProfile(currentUser, {
        displayName: data.fullName,
        photoURL: data.photoURL,
      });
      
      // Force reload page to apply changes
      window.location.reload();
      toast.success("Profile updated successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to update profile.");
    }
  };

  // Save password updates to Firebase Auth
  const handleSavePassword = async (data: PasswordFields) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.email) return;

    try {
      // Re-authenticate first to prevent requires-recent-login errors
      const credential = EmailAuthProvider.credential(currentUser.email, data.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Save new password
      await updatePassword(currentUser, data.newPassword);
      toast.success("Credentials updated successfully!");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        toast.error("Invalid current password. Please try again.");
      } else if (err.code === "auth/requires-recent-login") {
        toast.error("Security timeout. Please sign out, sign back in, and try again.");
      } else {
        toast.error(err.message || "Failed to update credentials.");
      }
      throw err;
    }
  };

  return (
    <div className="space-y-6 select-none pb-12 text-xs">
      
      {/* Page Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-900">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FiUser className="text-cyan-400" /> Operator Profile
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review credentials, access logs, and security clearance status.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN: Profile overview card */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-2xl border border-slate-900 flex flex-col items-center text-center gap-4">
          <ProfileAvatar 
            photoURL={photoURL} 
            displayName={displayName} 
            size="xl" 
            editable 
            onEditClick={() => setProfileModalOpen(true)} 
          />

          <div className="space-y-1">
            <h2 className="font-extrabold text-sm text-slate-100 uppercase tracking-tight">{displayName}</h2>
            <span className="text-[10px] text-slate-400 font-mono block">{email}</span>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
              <FiShield /> L1 SEC CLEARANCE
            </div>
          </div>

          {/* Action triggers */}
          <div className="w-full space-y-2 pt-4 border-t border-slate-900/60">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold rounded-lg cursor-pointer transition-all"
            >
              <FiEdit /> Edit Profile
            </button>
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-white font-semibold rounded-lg cursor-pointer transition-all"
            >
              <FiLock /> Change Password
            </button>
            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-950/10 border border-transparent hover:border-red-500/25 text-red-400 hover:bg-red-950/20 font-semibold rounded-lg cursor-pointer transition-all"
            >
              <FiLogOut /> Terminate Session
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: User Information logs */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-900 space-y-6">
          <h3 className="font-extrabold text-[10px] uppercase tracking-wider text-slate-400">
            Operator Clearance Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Account created */}
            <div className="p-4 bg-slate-950/30 border border-slate-900 rounded-xl flex gap-3.5 items-center">
              <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
                <FiCalendar className="text-md" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Account Created</span>
                <span className="font-mono font-bold text-slate-200 mt-1 block">{accountCreated}</span>
              </div>
            </div>

            {/* Last SignIn */}
            <div className="p-4 bg-slate-950/30 border border-slate-900 rounded-xl flex gap-3.5 items-center">
              <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
                <FiClock className="text-md" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Last Login Dispatch</span>
                <span className="font-mono font-bold text-slate-200 mt-1 block">{lastLogin}</span>
              </div>
            </div>

            {/* Account Status */}
            <div className="p-4 bg-slate-950/30 border border-slate-900 rounded-xl flex gap-3.5 items-center">
              <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
                <FiCheckCircle className="text-md" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Account Status</span>
                <span className="font-bold text-emerald-400 mt-1 block uppercase">ACTIVE MONITORING</span>
              </div>
            </div>

            {/* Role Classification */}
            <div className="p-4 bg-slate-950/30 border border-slate-900 rounded-xl flex gap-3.5 items-center">
              <div className="p-2.5 bg-slate-900 border border-slate-800 text-cyan-400 rounded-lg">
                <FiMail className="text-md" />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Operator Level</span>
                <span className="font-bold text-slate-200 mt-1 block uppercase">System Operator</span>
              </div>
            </div>

          </div>

          <div className="p-4 rounded-xl border border-slate-900/60 bg-slate-950/10 space-y-2">
            <h4 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FiShield /> Security clearance description
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              This terminal accounts for System Operator logs. All active footage scans, live feed locks, alerts dispatches, and reports downloads are logged and monitored under active clearance policies.
            </p>
          </div>

        </div>

      </div>

      {/* Edit Profile Form Popup */}
      <ProfileFormModal
        isOpen={profileModalOpen}
        initialName={displayName}
        initialPhotoURL={photoURL}
        initialEmail={email}
        onSave={handleSaveProfile}
        onClose={() => setProfileModalOpen(false)}
      />

      {/* Change Password Dialog Popup */}
      <ChangePasswordDialog
        isOpen={passwordModalOpen}
        onSave={handleSavePassword}
        onClose={() => setPasswordModalOpen(false)}
      />

    </div>
  );
};

export default Profile;
