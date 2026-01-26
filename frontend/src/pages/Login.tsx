import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = e.target as HTMLFormElement;
    const username = form.username.value;
    const password = form.password.value;

    try {
      await login({ username, password });
      navigate('/');
    } catch (err) {
      setError('Échec de la connexion. Vérifiez vos identifiants.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0f172a] overflow-hidden selection:bg-blue-500/30">
      {/* Background Animated Blobs */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] animate-pulse animate-delay-2s"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-4xl bg-blue-600/20 mb-6 border border-blue-500/20 relative group">
            <div className="absolute inset-0 bg-blue-600 opacity-20 blur-xl rounded-full group-hover:opacity-40 transition-opacity duration-500"></div>
            <ShieldCheck className="w-10 h-10 text-blue-500 relative z-10" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase italic">
            Gestion<span className="text-blue-500">Stock</span>
          </h1>
          <p className="text-slate-400 font-medium tracking-wide">Interface de Gestion Veve</p>
        </div>

        <div className="group relative">
          {/* Subtle glow behind the card */}
          <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-purple-600 rounded-4xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-white/3 backdrop-blur-2xl border border-white/10 rounded-4xl p-8 md:p-10 shadow-2xl">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-2xl text-center font-bold animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Identifiant
                </label>
                <div className="relative group/input">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    placeholder="Votre nom d'utilisateur"
                    className="block w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Mot de passe
                  </label>
                </div>
                <div className="relative group/input">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="block w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-blue-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative group/btn w-full h-14 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-all duration-300 active:scale-[0.98] overflow-hidden shadow-lg shadow-blue-600/20"
                >
                  <div className="absolute inset-0 bg-linear-to-r from-blue-400/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center justify-center text-white text-sm font-black uppercase tracking-widest">
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <span>Accéder au magasin</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>

                <div className="flex flex-col space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-[10px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors text-center"
                  >
                    Mot de passe oublié ?
                  </button>
                  <div className="h-px bg-white/5 w-1/4 self-center"></div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                    Pas encore de compte ?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/register')}
                      className="text-blue-500 hover:text-blue-400"
                    >
                      S'inscrire
                    </button>
                  </p>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center mt-10">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-widest bg-linear-to-r from-slate-500 to-slate-400 bg-clip-text opacity-60">
            Système Sécurisé Veve &bull; 2026
          </p>
        </div>
      </div>
    </div>
  );
}
