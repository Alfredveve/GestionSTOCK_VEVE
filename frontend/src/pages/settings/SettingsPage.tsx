import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Building2, 
  Bell, 
  ShieldCheck, 
  Save,
  ShoppingBag,
  Percent,
  RefreshCw,
  AlertCircle,
  Users,
  Shield,
  ExternalLink
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import settingsService from '@/services/settingsService';
import type { Settings } from '@/services/settingsService';
import { motion, AnimatePresence } from 'framer-motion';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { Enable2FAModal } from '@/components/settings/Enable2FAModal';

export function SettingsPage() {
  const location = useLocation();
  const [activeSegment, setActiveSegment] = useState<'general' | 'sales' | 'notifications' | 'security' | 'users' | 'administration'>('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const state = location.state as { activeTab?: typeof activeSegment };
    if (state?.activeTab) {
      setActiveSegment(state.activeTab);
    }
  }, [location]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setIsSaving(true);
      await settingsService.updateSettings(settings);
      setHasUnsavedChanges(false);
      toast.success("Paramètres enregistrés avec succès");
    } catch (error) {
      console.error(error);
      toast.error("Échec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm font-bold text-muted-foreground animate-pulse">Chargement des configurations...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'general', label: 'Général', icon: Building2 },
    { id: 'sales', label: 'Ventes & TVA', icon: ShoppingBag },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: ShieldCheck },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'administration', label: 'Administration', icon: Shield },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <Badge variant="outline" className="mb-2 bg-primary/5 text-primary border-primary/10 font-black uppercase text-[10px] tracking-widest px-3 py-1">Configuration Système</Badge>
          <h2 className="text-4xl font-black tracking-tighter text-foreground">Paramètres</h2>
          <p className="text-muted-foreground font-medium mt-1">Gérez l'identité de votre entreprise et vos préférences opérationnelles.</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className={`h-12 px-8 rounded-2xl shadow-xl font-black text-sm uppercase tracking-wider transition-all ${
            hasUnsavedChanges 
              ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20 animate-pulse' 
              : 'bg-primary hover:brightness-110 shadow-primary/20'
          } active:scale-95`}
        >
          {isSaving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Enregistrement..." : hasUnsavedChanges ? "Enregistrer les modifications" : "Enregistrer"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 items-start">
        {/* Navigation Sidebar */}
        <div className="space-y-2 lg:sticky lg:top-24">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSegment(item.id)}
              className={`w-full flex items-center px-5 py-4 rounded-2xl text-sm font-black transition-all group ${
                activeSegment === item.id 
                  ? "bg-white text-primary shadow-2xl shadow-primary/10 border border-primary/5" 
                  : "text-muted-foreground hover:bg-white/50 hover:text-foreground hover:translate-x-1"
              }`}
            >
              <div className={`p-2 rounded-xl mr-4 transition-colors ${activeSegment === item.id ? "bg-primary text-white" : "bg-muted group-hover:bg-primary/10 group-hover:text-primary"}`}>
                <item.icon className="h-4 w-4" />
              </div>
              {item.label}
              {activeSegment === item.id && (
                <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSegment}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-none shadow-2xl bg-white/60 backdrop-blur-xl rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      {navItems.find(i => i.id === activeSegment)?.icon && 
                        (() => {
                          const Icon = navItems.find(i => i.id === activeSegment)!.icon;
                          return <Icon className="h-6 w-6" />;
                        })()
                      }
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-black tracking-tight">{navItems.find(i => i.id === activeSegment)?.label}</CardTitle>
                      <CardDescription className="text-sm font-medium">Modifier les réglages globaux de cette section.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-8">
                  {activeSegment === 'general' && settings && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SectionField 
                          label="Nom de l'Entreprise" 
                          description="Appairait sur les factures et reçus."
                        >
                          <Input 
                            value={settings.company_name} 
                            onChange={(e) => { setSettings({...settings, company_name: e.target.value}); setHasUnsavedChanges(true); }}
                            className="h-12 bg-muted/30 border-none rounded-xl font-bold focus-visible:ring-primary/20" 
                          />
                        </SectionField>
                        <SectionField 
                          label="Devise" 
                          description="Utilisée pour tous les calculs financiers."
                        >
                          <select 
                            title="Sélectionner la devise"
                            value={settings.currency}
                            onChange={(e) => { setSettings({...settings, currency: e.target.value as Settings['currency']}); setHasUnsavedChanges(true); }}
                            className="flex h-12 w-full rounded-xl bg-muted/30 px-3 py-1 text-sm font-bold shadow-sm transition-colors outline-none focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer"
                          >
                            <option value="GNF">Franc Guinéen (GNF)</option>
                            <option value="USD">Dollar Américain (USD)</option>
                            <option value="EUR">Euro (EUR)</option>
                          </select>
                        </SectionField>
                      </div>
                      
                      <SectionField 
                        label="Langue de l'Interface" 
                        description="Choisir votre langue préférée."
                      >
                         <div className="flex gap-4">
                            {['fr', 'en'].map((lang) => (
                              <button
                                key={lang}
                                onClick={() => { setSettings({...settings, language: lang as Settings['language']}); setHasUnsavedChanges(true); }}
                                className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest border-2 transition-all ${
                                  settings.language === lang 
                                    ? "border-primary bg-primary/5 text-primary" 
                                    : "border-muted bg-muted/20 text-muted-foreground hover:border-primary/20"
                                }`}
                              >
                                {lang === 'fr' ? 'Français' : 'English'}
                              </button>
                            ))}
                         </div>
                      </SectionField>
                    </div>
                  )}

                  {activeSegment === 'sales' && settings && (
                    <div className="space-y-8">
                       <div className="p-6 bg-amber-50 rounded-3xl border border-amber-200/50 flex items-start gap-4">
                          <div className="p-2 bg-amber-200 text-amber-900 rounded-xl">
                            <AlertCircle className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-amber-900 leading-none mb-1">Attention aux modifications</p>
                            <p className="text-xs text-amber-800 font-medium">Changer le taux de TVA affectera toutes les nouvelles ventes. Les factures passées ne seront pas modifiées.</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <SectionField 
                            label="Taux de TVA (%)" 
                            description="Taux standard appliqué au POS."
                          >
                            <div className="relative">
                              <Input 
                                type="number"
                                value={settings.tax_rate}
                                onChange={(e) => { setSettings({...settings, tax_rate: e.target.value}); setHasUnsavedChanges(true); }}
                                className="h-12 bg-muted/30 border-none rounded-xl font-black text-lg pl-10 focus-visible:ring-primary/20" 
                              />
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                          </SectionField>

                          <SectionField 
                            label="Type de Vente par Défaut" 
                            description="Mode actif à l'ouverture du POS."
                          >
                            <div className="flex bg-muted/20 p-1.5 rounded-2xl">
                               <button
                                 onClick={() => { setSettings({...settings, default_order_type: 'retail'}); setHasUnsavedChanges(true); }}
                                 className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                   settings.default_order_type === 'retail' ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                                 }`}
                               >
                                 Détail
                               </button>
                               <button
                                 onClick={() => { setSettings({...settings, default_order_type: 'wholesale'}); setHasUnsavedChanges(true); }}
                                 className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                   settings.default_order_type === 'wholesale' ? "bg-white text-emerald-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
                                 }`}
                               >
                                 Gros
                               </button>
                            </div>
                          </SectionField>
                       </div>

                       <div className="flex items-center justify-between p-6 bg-primary/3 border border-primary/5 rounded-4xl">
                          <div className="space-y-1">
                            <p className="font-black text-sm text-foreground">Arrondi Intelligent</p>
                            <p className="text-xs text-muted-foreground font-medium">Toujours arrondir le total à l'unité monétaire la plus proche.</p>
                          </div>
                          <Switch 
                            checked={settings.smart_rounding}
                            onCheckedChange={(val) => { setSettings({...settings, smart_rounding: val}); setHasUnsavedChanges(true); }}
                            className="data-[state=checked]:bg-primary" 
                          />
                       </div>
                    </div>
                  )}

                  {activeSegment === 'notifications' && settings && (
                    <div className="space-y-4">
                       <NotificationItem 
                         title="Alertes Stock Bas" 
                         description="Recevoir une notification web quand un produit est en rupture."
                         checked={settings.email_notifications}
                         onChange={(val) => { setSettings({...settings, email_notifications: val}); setHasUnsavedChanges(true); }}
                       />
                       <NotificationItem 
                         title="Rapports Journaliers" 
                         description="Recevoir un résumé des ventes à la fin de chaque journée."
                         checked={settings.daily_reports}
                         onChange={(val) => { setSettings({...settings, daily_reports: val}); setHasUnsavedChanges(true); }}
                       />
                       <NotificationItem 
                         title="Nouveaux Clients" 
                         description="Notifier quand un nouveau client est enregistré dans le système."
                         checked={settings.new_customer_notifications}
                         onChange={(val) => { setSettings({...settings, new_customer_notifications: val}); setHasUnsavedChanges(true); }}
                       />
                    </div>
                  )}

                  {activeSegment === 'security' && (
                    <div className="space-y-4">
                       <Button 
                         variant="outline" 
                         onClick={() => setIsPasswordModalOpen(true)}
                         className="w-full justify-start text-sm font-black border-muted h-16 rounded-2xl hover:bg-muted/50 transition-all px-6"
                       >
                           <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-4">
                             <RefreshCw className="h-4 w-4" />
                           </div>
                           Modifier le mot de passe
                       </Button>
                       <Button 
                         variant="outline" 
                         onClick={() => setIs2FAModalOpen(true)}
                         className="w-full justify-start text-sm font-black border-muted h-16 rounded-2xl hover:bg-muted/50 transition-all px-6 group"
                       >
                           <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mr-4 group-hover:bg-emerald-100">
                             <ShieldCheck className="h-4 w-4" />
                           </div>
                           Activer l'authentification 2FA
                           <Badge variant="secondary" className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 border-none font-black uppercase">Recommandé</Badge>
                       </Button>
                    </div>
                  )}

                  {activeSegment === 'users' && (
                    <div className="space-y-6">
                      <div className="p-8 bg-blue-50/50 rounded-4xl border border-blue-100 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600">
                          <Users className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-blue-900 tracking-tight">Gestion des Utilisateurs</h3>
                          <p className="text-sm font-medium text-blue-800/70 max-w-md mx-auto">
                            Visualisez et gérez les comptes utilisateurs, déterminez les rôles et contrôlez les accès au système.
                          </p>
                        </div>
                        <Button 
                          onClick={() => window.open('/admin/auth/user/', '_blank')}
                          className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/20"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Gérer dans le Panneau d'Admin
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Card className="border-none bg-muted/20 rounded-3xl p-6">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Statistiques Rapides</p>
                            <div className="space-y-3">
                               <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold">Total Utilisateurs</span>
                                  <Badge className="bg-primary/10 text-primary border-none">1</Badge>
                               </div>
                               <div className="flex justify-between items-center">
                                  <span className="text-sm font-bold">Administrateurs</span>
                                  <Badge className="bg-amber-100 text-amber-700 border-none">1</Badge>
                               </div>
                            </div>
                         </Card>
                         <Card className="border-none bg-muted/20 rounded-3xl p-6">
                            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Dernière Connexion</p>
                            <p className="text-xl font-black text-foreground">veve</p>
                            <p className="text-xs font-medium text-muted-foreground">Aujourd'hui à 23:08</p>
                         </Card>
                      </div>
                    </div>
                  )}

                  {activeSegment === 'administration' && (
                    <div className="space-y-6">
                      <div className="p-8 bg-purple-50/50 rounded-4xl border border-purple-100 flex flex-col items-center text-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600">
                          <Shield className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-purple-900 tracking-tight">Panneau d'Administration (Jazzmin)</h3>
                          <p className="text-sm font-medium text-purple-800/70 max-w-md mx-auto">
                            Accédez à l'interface d'administration avancée pour gérer les données brutes, les logs, et les configurations système complexes.
                          </p>
                        </div>
                        <Button 
                          onClick={() => window.open('/admin/', '_blank')}
                          className="bg-purple-600 hover:bg-purple-700 h-12 px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-purple-600/20"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Ouvrir Jazzmin Admin
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <AdminTool 
                           icon={RefreshCw} 
                           label="Logs Système" 
                           onClick={() => window.open('/admin/admin/logentry/', '_blank')}
                         />
                         <AdminTool 
                           icon={Building2} 
                           label="Sites" 
                           onClick={() => window.open('/admin/sites/site/', '_blank')}
                         />
                         <AdminTool 
                           icon={Bell} 
                           label="Alertes" 
                           onClick={() => toast.info("Aucune alerte système critique")}
                         />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
      <Enable2FAModal 
        isOpen={is2FAModalOpen} 
        onClose={() => setIs2FAModalOpen(false)} 
      />
    </div>
  );
}

function SectionField({ label, description, children }: { label: string, description: string, children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-black uppercase tracking-[0.2em] text-foreground">{label}</label>
        <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

function NotificationItem({ title, description, checked, onChange }: { title: string, description: string, checked: boolean, onChange: (val: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-6 bg-muted/10 hover:bg-muted/20 border border-muted/20 rounded-4xl transition-colors">
      <div className="space-y-1">
        <p className="font-black text-sm text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground font-medium pr-4">{description}</p>
      </div>
      <Switch 
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary" 
      />
    </div>
  );
}

function AdminTool({ icon: Icon, label, onClick }: { icon: LucideIcon, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-4 p-5 bg-white border border-border rounded-2xl hover:border-primary/30 hover:shadow-lg transition-all text-left"
    >
      <div className="p-3 bg-muted rounded-xl">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <span className="text-sm font-black text-foreground">{label}</span>
      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
    </button>
  );
}
