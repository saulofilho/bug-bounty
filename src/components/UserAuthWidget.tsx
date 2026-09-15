import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  LogOut,
  ChevronDown,
  Flame,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS, UserRole } from '../context/AuthContext';

export const UserAuthWidget: React.FC = () => {
  const {
    currentUser,
    isAuthenticated,
    openLoginModal,
    signOut,
    switchDemoAccount
  } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !currentUser) {
    return (
      <button
        type="button"
        id="btn-header-login-trigger"
        onClick={() => openLoginModal('general')}
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-[#181822] hover:bg-[#222230] border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 text-xs font-mono font-semibold transition-all shadow-sm group"
        title="Fazer Login com Firebase Auth para visualizar ou editar relatórios"
      >
        <Flame className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="hidden sm:inline">Entrar / Admin</span>
        <span className="sm:hidden">Login</span>
      </button>
    );
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          label: 'ADMIN',
          bg: 'bg-red-500/20 text-red-300 border-red-500/40'
        };
      case 'researcher':
        return {
          label: 'HUNTER',
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
        };
      case 'analyst':
        return {
          label: 'ANALYST',
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
        };
    }
  };

  const badge = getRoleBadge(currentUser.role);
  const initials = currentUser.displayName
    .split(' ')
    .map(p => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id="btn-header-user-profile"
        onClick={() => setMenuOpen(p => !p)}
        className="flex items-center gap-1.5 p-1 pr-2 rounded-lg bg-[#14141c] hover:bg-[#1b1b26] border border-[#2c2c3a] text-zinc-200 transition-all font-mono text-xs"
        title={`Logado como ${currentUser.displayName} (${currentUser.role})`}
      >
        {currentUser.photoURL ? (
          <img
            src={currentUser.photoURL}
            alt={currentUser.displayName}
            className="w-6 h-6 rounded-md object-cover border border-[#3d3d4e]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-[10px] flex items-center justify-center border border-emerald-400/30">
            {initials}
          </div>
        )}

        <div className="flex flex-col items-start text-left leading-tight hidden lg:flex">
          <span className="text-[11px] font-bold text-zinc-100 truncate max-w-[100px]">
            {currentUser.displayName.split(' ')[0]}
          </span>
          <span className={`text-[8px] px-1 rounded border font-semibold ${badge.bg}`}>
            {badge.label}
          </span>
        </div>

        <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* User Dropdown Menu */}
      {menuOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-[#0f0f14] border border-[#2b2b3a] shadow-2xl p-2 z-50 text-xs font-mono animate-fade-in">
          
          {/* User Profile Card */}
          <div className="p-2.5 bg-[#14141c] rounded-lg border border-[#242432] mb-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs truncate">
                {currentUser.displayName}
              </span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate">
              {currentUser.email}
            </div>
            <div className="flex items-center gap-1 text-[9px] text-zinc-500 pt-1 border-t border-[#1e1e28]">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Firebase Auth Local Session</span>
            </div>
          </div>

          {/* Switch Account Quick Toggles */}
          <div className="py-1 space-y-1">
            <span className="text-[10px] text-zinc-500 font-semibold px-2 uppercase tracking-wider block">
              Alternar Perfil:
            </span>
            {DEMO_ACCOUNTS.map((acc) => {
              const isCurrent = currentUser.role === acc.role;
              return (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    switchDemoAccount(acc.role);
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] transition-colors ${
                    isCurrent
                      ? 'bg-emerald-500/10 text-emerald-300 font-bold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181822]'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="w-3 h-3 text-zinc-500" />
                    <span className="truncate">{acc.displayName.split(' ')[0]} ({acc.role})</span>
                  </div>
                  {isCurrent && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#22222e] my-1" />

          {/* Logout Button */}
          <button
            type="button"
            id="btn-header-logout"
            onClick={() => {
              signOut();
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-[11px] font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da Conta (Logout)</span>
          </button>

        </div>
      )}
    </div>
  );
};
