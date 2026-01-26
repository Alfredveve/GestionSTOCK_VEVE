import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, KeyRound, ArrowRight, ArrowLeft, MailCheck } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const form = e.target as HTMLFormElement;
    const identifier = form.identifier.value;

    try {
      await resetPassword(identifier);
      setSubmitted(true);
      toast.success('Instructions de récupération envoyées.');
    } catch (err: any) { // axios error
      setError(err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
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
            {submitted ? (
              <MailCheck className="w-10 h-10 text-green-500 relative z-10" strokeWidth={2.5} />
            ) : (
              <KeyRound className="w-10 h-10 text-blue-500 relative z-10" strokeWidth={2.5} />
            )}
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase italic">
            Récupération<span className="text-blue-500">Accès</span>
          </h1>
          <p className="text-slate-400 font-medium tracking-wide">
            {submitted ? 'Demande envoyée avec succès' : 'Retrouvez l\'accès à votre compte'}
          </p>
        </div>

        <div className="group relative">
          <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-purple-600 rounded-4xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          
          <div className="relative bg-white/3 backdrop-blur-2xl border border-white/10 rounded-4xl p-8 md:p-10 shadow-2xl text-center">
            {!submitted ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  Entrez votre <strong>Email</strong> ou votre <strong>Numéro de Téléphone</strong> pour recevoir un lien de réinitialisation.
                </p>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-4 rounded-2xl font-bold">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label htmlFor="identifier" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                      Email ou Téléphone
                    </label>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      required
                      placeholder="votre@email.com ou +224..."
                      className="block w-full h-14 rounded-2xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-4">
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
                          <span>Recevoir le lien</span>
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
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl text-green-400 text-sm font-medium">
                  Un email contient un lien de réinitialisation a été envoyé à votre adresse.
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="relative group/btn w-full h-14 bg-white/10 hover:bg-white/15 text-white rounded-2xl transition-all duration-300 active:scale-[0.98] text-sm font-black uppercase tracking-widest border border-white/10"
                >
                  Retourner à la page de connexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
