import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = e.target as HTMLFormElement;
    const username = form.username.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      await register({ username, email, password });
      toast.success('Compte créé avec succès ! Connectez-vous maintenant.');
      navigate('/login');
    } catch (err: any) { // axios error catch
      setError(err.response?.data?.message || 'Échec de l\'inscription. Veuillez réessayer.');
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

      <div className="relative z-10 w-full max-w-md px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-4xl bg-blue-600/20 mb-6 border border-blue-500/20 relative group">
            <div className="absolute inset-0 bg-blue-600 opacity-20 blur-xl rounded-full group-hover:opacity-40 transition-opacity duration-500"></div>
            <UserPlus className="w-10 h-10 text-blue-500 relative z-10" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase italic">
            Rejoindre<span className="text-blue-500">Veve</span>
          </h1>
          <p className="text-slate-400 font-medium tracking-wide">Créez votre compte administrateur</p>
        </div>

        <div className="group relative">
          <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-purple-600 rounded-4xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-white/3 backdrop-blur-2xl border border-white/10 rounded-4xl p-8 md:p-10 shadow-2xl">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-2xl text-center font-bold animate-in fade-in zoom-in duration-300">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <label htmlFor="username" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Choisissez un identifiant"
                  className="block w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="votre@email.com"
                  className="block w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="phone" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Téléphone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="+224 000 000 000"
                  className="block w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Mot de passe
                </label>
                <div className="relative">
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

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                />
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
                        <span>Créer mon compte</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex items-center justify-center w-full text-[10px] font-black text-slate-500 hover:text-blue-400 uppercase tracking-widest transition-colors"
                >
                  <ArrowLeft className="w-3 h-3 mr-2" />
                  Retour à la connexion
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
