import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  X,
  CheckCircle2,
  AlertCircle,
  Flame,
  UserCheck,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Layers,
  Fingerprint
} from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS, UserRole } from '../context/AuthContext';

export const FirebaseAuthModal: React.FC = () => {
  const {
    authModalOpen,
    authModalReason,
    closeLoginModal,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithGoogle
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('researcher');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(email, password, displayName, role);
      } else {
        await signInWithEmailAndPassword(email, password);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado de autenticação no Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(demoEmail, demoPass);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login rápido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao autenticar com Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const getReasonBanner = () => {
    switch (authModalReason) {
      case 'view':
        return {
          title: 'Acesso Restrito a Relatórios',
          desc: 'Os relatórios contêm dados confidenciais, provas de conceito (PoC) e vetores de exploração. Faça login para desbloquear a visualização completa.',
          icon: <Lock className="w-4 h-4 text-amber-400 shrink-0" />,
          badge: 'Visualização Protegida'
        };
      case 'edit':
        return {
          title: 'Permissão de Edição Necessária',
          desc: 'Apenas pesquisadores ou administradores autenticados podem editar descrições, severidades ou scores CVSS.',
          icon: <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0" />,
          badge: 'Edição Restrita'
        };
      case 'create':
        return {
          title: 'Submissão de Vulnerabilidade',
          desc: 'Faça login com seu perfil para assinar e registrar a nova descoberta no seu inventário de segurança.',
          icon: <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />,
          badge: 'Novo Relatório'
        };
      case 'delete':
        return {
          title: 'Privilégio de Administrador',
          desc: 'A exclusão de registros requer confirmação de identidade de administrador no Firebase Auth.',
          icon: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
          badge: 'Ação Crítica'
        };
      default:
        return {
          title: 'Autenticação Firebase Auth',
          desc: 'Entre com sua conta para gerenciar vulnerabilidades, alvos e sincronizar seu progresso.',
          icon: <Fingerprint className="w-4 h-4 text-emerald-400 shrink-0" />,
          badge: 'Login BugSentinel'
        };
    }
  };

  const reasonInfo = getReasonBanner();

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={closeLoginModal}
    >
      <div
        className="bg-[#0e0e12] border border-[#2b2b36] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#252530] bg-[#13131a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                  BugSentinel Auth
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Firebase Auth
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Camada de controle de acesso e identidade do pesquisador
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeLoginModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason Context Alert Banner */}
        <div className="p-3.5 px-5 bg-gradient-to-r from-[#171722] to-[#121218] border-b border-[#22222d] flex items-start gap-3 text-xs">
          {reasonInfo.icon}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-200">{reasonInfo.title}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono">
                {reasonInfo.badge}
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {reasonInfo.desc}
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Quick 1-Click Demo Accounts Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                Acesso Rápido com Perfis Predefinidos:
              </span>
              <span className="text-[10px] text-zinc-500">1-Clique</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  id={`btn-demo-login-${demo.role}`}
                  disabled={isLoading}
                  onClick={() => handleQuickLogin(demo.email, demo.password)}
                  className="p-2.5 rounded-xl border border-[#272733] bg-[#14141c] hover:bg-[#1c1c28] hover:border-emerald-500/40 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-zinc-200 group-hover:text-emerald-300 uppercase tracking-wide">
                      {demo.role}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono font-semibold ${demo.badgeColor}`}>
                      {demo.role === 'admin' ? 'Admin' : demo.role === 'researcher' ? 'Hunter' : 'Analista'}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 leading-tight">
                    {demo.displayName.split(' ')[0]}
                  </p>
                  <div className="mt-2 text-[10px] text-emerald-400 flex items-center justify-between pt-1 border-t border-[#22222d]">
                    <span>Entrar</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 my-1">
            <div className="h-px bg-[#262633] flex-1" />
            <span className="text-[11px] font-mono text-zinc-500 uppercase">ou preencha seus dados</span>
            <div className="h-px bg-[#262633] flex-1" />
          </div>

          {/* Form Tabs: Entrar vs Criar Conta */}
          <div className="flex p-1 bg-[#14141a] rounded-lg border border-[#252530]">
            <button
              type="button"
              id="tab-auth-login"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                !isSignUp
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Entrar (Sign In)
            </button>
            <button
              type="button"
              id="tab-auth-signup"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
              }}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                isSignUp
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Criar Conta (Sign Up)
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-start gap-2.5 font-mono">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {/* Traditional Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSignUp && (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold block">
                    Nome Completo ou Handle:
                  </label>
                  <input
                    type="text"
                    id="input-auth-name"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Hunter0x / John Doe"
                    className="w-full px-3 py-2 bg-[#14141c] border border-[#272733] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-zinc-300 font-semibold block">
                    Papel na Equipe de Segurança (Role):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'admin' as UserRole, label: 'Admin', desc: 'Acesso total' },
                      { val: 'researcher' as UserRole, label: 'Hunter', desc: 'Cria e edita' },
                      { val: 'analyst' as UserRole, label: 'Analista', desc: 'Triagem' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setRole(item.val)}
                        className={`p-2 rounded-lg border text-left text-xs font-mono transition-all ${
                          role === item.val
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300'
                            : 'bg-[#14141c] border-[#272733] text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="font-bold">{item.label}</div>
                        <div className="text-[10px] text-zinc-500">{item.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-semibold flex items-center justify-between">
                <span>Email Corporativo ou Hacker:</span>
                <span className="text-[10px] text-zinc-500 font-normal">Identificador único</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  id="input-auth-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pesquisador@bugbounty.sec"
                  className="w-full pl-9 pr-3 py-2 bg-[#14141c] border border-[#272733] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-zinc-300 font-semibold flex items-center justify-between">
                <span>Senha de Segurança:</span>
                {!isSignUp && (
                  <span className="text-[10px] text-zinc-500">Qualquer senha para demo</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="input-auth-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-[#14141c] border border-[#272733] rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-auth-submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isSignUp ? 'Cadastrar e Conectar' : 'Entrar com Firebase Auth'}</span>
                </>
              )}
            </button>
          </form>

          {/* Google Sign In Alternative */}
          <div className="pt-2">
            <button
              type="button"
              id="btn-auth-google"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="w-full py-2 px-3 rounded-lg bg-[#14141c] hover:bg-[#1a1a24] border border-[#2c2c38] text-xs font-mono text-zinc-200 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.8s.7 5.1 1.9 7.5l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                />
              </svg>
              <span>Continuar com Google (Firebase GoogleProvider)</span>
            </button>
          </div>

        </div>

        {/* Footer info badge */}
        <div className="p-3 px-5 bg-[#0b0b0e] border-t border-[#202028] text-[11px] text-zinc-500 font-mono flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>Sessão segura criptografada em localStorage</span>
          </div>
          <span className="text-zinc-600">v3.1 Auth Gate</span>
        </div>

      </div>
    </div>
  );
};
