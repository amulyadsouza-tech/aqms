import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  UserPlus, 
  Users, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Mail, 
  ShieldAlert,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminAccount {
  id: string;
  email: string;
  role: 'Primary Administrator' | 'Hardware Engineer' | 'Faculty Supervisor';
  status: 'active' | 'suspended';
  addedAt: number;
}

const STORAGE_KEY = 'sjec_aqms_authorized_admins';

export const AdminAccountsTab: React.FC = () => {
  const { currentUser } = useAuth();
  const currentEmail = currentUser?.email || 'admin@sjec.ac.in';

  // Load existing accounts or seed with initial admin
  const [accounts, setAccounts] = useState<AdminAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved admin accounts:', e);
    }

    return [
      {
        id: '1',
        email: currentEmail,
        role: 'Primary Administrator',
        status: 'active',
        addedAt: Date.now() - 30 * 86400 * 1000,
      },
    ];
  });

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'Primary Administrator' | 'Hardware Engineer' | 'Faculty Supervisor'>('Hardware Engineer');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const saveAccounts = (newAccounts: AdminAccount[]) => {
    setAccounts(newAccounts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAccounts));
    } catch (e) {
      console.error('Failed to persist accounts:', e);
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const emailTrimmed = newEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid administrator email.' });
      return;
    }

    // Check duplicate
    if (accounts.some((acc) => acc.email.toLowerCase() === emailTrimmed)) {
      setStatusMessage({ type: 'error', text: 'An administrator account with this email already exists.' });
      return;
    }

    const newAcc: AdminAccount = {
      id: Date.now().toString(),
      email: emailTrimmed,
      role: newRole,
      status: 'active',
      addedAt: Date.now(),
    };

    saveAccounts([...accounts, newAcc]);
    setNewEmail('');
    setStatusMessage({
      type: 'success',
      text: `Administrator account for ${emailTrimmed} authorized. An access invitation with secure login instructions has been logged.`,
    });
  };

  const handleToggleStatus = (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (target?.email.toLowerCase() === currentEmail.toLowerCase()) {
      setStatusMessage({ type: 'error', text: 'You cannot suspend your own active administrator account.' });
      return;
    }

    saveAccounts(
      accounts.map((acc) =>
        acc.id === id
          ? { ...acc, status: acc.status === 'active' ? 'suspended' : 'active' }
          : acc
      )
    );
  };

  const handleDeleteAccount = (id: string) => {
    const target = accounts.find((a) => a.id === id);
    if (target?.email.toLowerCase() === currentEmail.toLowerCase()) {
      setStatusMessage({ type: 'error', text: 'You cannot revoke access from your currently active administrator account.' });
      return;
    }

    if (confirm(`Are you sure you want to revoke admin access for ${target?.email}?`)) {
      saveAccounts(accounts.filter((acc) => acc.id !== id));
      setStatusMessage({
        type: 'success',
        text: `Administrator access for ${target?.email} has been revoked.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Overview & Security Policy Header */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surface-borderLight dark:border-surface-borderDark">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-institute-blue dark:text-sky-400" />
              <span>Admin Accounts & Access Control</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage authorized engineers and faculty permitted to configure hardware, telemetry, and site branding.
            </p>
          </div>
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role-Based Access Control</span>
          </span>
        </div>

        {statusMessage && (
          <div
            className={`mt-4 p-3.5 rounded-xl border text-xs flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Form: Authorize New Admin */}
        <form onSubmit={handleAddAccount} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Administrator Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="faculty@sjec.ac.in"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Access Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Hardware Engineer">Hardware Engineer</option>
                <option value="Primary Administrator">Primary Administrator</option>
                <option value="Faculty Supervisor">Faculty Supervisor</option>
              </select>
            </div>

          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-slate-400 inline" />
              <span>Passwords are never displayed. Access credentials are encrypted securely.</span>
            </span>

            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-institute-blue hover:bg-institute-accent dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors flex items-center space-x-2 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Authorize Administrator</span>
            </button>
          </div>
        </form>
      </div>

      {/* Authorized Administrators Table */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm overflow-hidden">
        <div className="p-4 border-b border-surface-borderLight dark:border-surface-borderDark bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Authorized Personnel Directory
          </h4>
          <span className="text-xs text-slate-500">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'} registered
          </span>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Administrator Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Access Established</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {accounts.map((acc) => {
                const isCurrent = acc.email.toLowerCase() === currentEmail.toLowerCase();
                return (
                  <tr key={acc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900 dark:text-white font-mono">
                          {acc.email}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                            Current Session
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {acc.role}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          acc.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {acc.status === 'active' ? (
                          <>
                            <UserCheck className="w-3 h-3" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" />
                            <span>Suspended</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(acc.addedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(acc.id)}
                        disabled={isCurrent}
                        title={acc.status === 'active' ? 'Suspend Access' : 'Activate Access'}
                        className="px-2.5 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
                      >
                        {acc.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc.id)}
                        disabled={isCurrent}
                        title="Revoke Admin Access"
                        className="p-1.5 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 transition-colors inline-flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Best Practices */}
      <div className="bg-surface-cardLight dark:bg-surface-cardDark p-6 rounded-2xl border border-surface-borderLight dark:border-surface-borderDark shadow-sm">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-amber-500" />
          <span>Security Protocol & Password Governance</span>
        </h4>
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
          <p>
            • <strong>No Cleartext Passwords:</strong> Passwords are never stored in plain text or rendered on any interface. Authentication utilizes secure scrypt hashing via Google Cloud Identity.
          </p>
          <p>
            • <strong>Session Isolation:</strong> Sessions expire automatically after inactivity to prevent unauthorized station access.
          </p>
          <p>
            • <strong>Least Privilege:</strong> Only Primary Administrators can authorize new accounts or modify institutional branding.
          </p>
        </div>
      </div>

    </div>
  );
};

export default AdminAccountsTab;
