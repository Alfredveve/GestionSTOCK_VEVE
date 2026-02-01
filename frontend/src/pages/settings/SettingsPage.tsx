import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Building2, 
  Bell, 
  ShieldCheck, 
  Save,
  ShoppingBag,
  RefreshCw,
  Shield,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import settingsService from '@/services/settingsService';
import type { Settings } from '@/services/settingsService';
import { motion, AnimatePresence } from 'framer-motion';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';

export function SettingsPage() {
  const location = useLocation();
  const [activeSegment, setActiveSegment] = useState('general');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => { fetchSettings(); }, []);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveSegment(tab);
  }, [location]);

  const fetchSettings = async () => {
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch {
      toast.error('Erreur lors du chargement des paramètres');
    } finally {
      // No isLoading state defined, isSaving is used for buttons
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await settingsService.updateSettings(settings);
      toast.success('Paramètres enregistrés');
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    { id: 'general', icon: Building2, label: 'Général', desc: 'Identité de l\'entreprise' },
    { id: 'sales', icon: ShoppingBag, label: 'Ventes', desc: 'Ventes et facturation' },
    { id: 'notifications', icon: Bell, label: 'Alertes', desc: 'Stocks et rappels' },
    { id: 'security', icon: ShieldCheck, label: 'Sécurité', desc: 'Accès et authentification' },
    { id: 'maintenance', icon: AlertTriangle, label: 'Maintenance', desc: 'Nettoyage et système' },
  ];

  const handleReset = async () => {
    const confirmed = window.confirm(
      "ÊTES-VOUS SÛR ? Cette action supprimera TOUS les produits, stocks, factures, et transactions. Cette action est IRREVERSIBLE."
    );
    
    if (!confirmed) return;
    
    const doubleConfirmed = window.confirm(
      "DERNIER AVERTISSEMENT : Voulez-vous vraiment TOUT effacer ?"
    );
    
    if (!doubleConfirmed) return;

    setIsSaving(true);
    try {
      const result = await settingsService.resetApplication();
      if (result.success) {
        toast.success('Application réinitialisée !');
        fetchSettings();
      } else {
        toast.error('Erreur : ' + result.message);
      }
    } catch {
      toast.error('Une erreur est survenue lors de la réinitialisation');
    } finally {

      setIsSaving(false);
    }
  };


  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Paramètres</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Configuration du système</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="h-12 px-8 rounded-2xl font-black bg-primary shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
          {isSaving ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-3">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSegment(item.id)} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all duration-300 text-left ${activeSegment === item.id ? 'bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 scale-[1.02]' : 'hover:bg-white/50 text-slate-500'}`}>
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-colors ${activeSegment === item.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div>
                <p className={`font-black text-sm uppercase tracking-wider ${activeSegment === item.id ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</p>
                <p className="text-[10px] font-bold opacity-60 leading-tight mt-0.5">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div key={activeSegment} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 border-b bg-slate-50/50">
                  <div className="flex items-center gap-4 text-primary">
                    {menuItems.find(i => i.id === activeSegment)?.icon && <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center ring-1 ring-slate-200">
                      {(() => {
                        const Icon = menuItems.find(i => i.id === activeSegment)?.icon;
                        return Icon ? <Icon className="h-5 w-5" /> : null;
                      })()}
                    </div>}
                    <CardTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">{menuItems.find(i => i.id === activeSegment)?.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-8">
                {activeSegment === 'general' && settings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Nom</Label><Input value={settings.company_name} onChange={e => { setSettings({...settings, company_name: e.target.value}); }} className="h-12 rounded-xl font-bold" /></div>
                    <div className="space-y-2"><Label>Devise</Label><select title="Sélectionner la devise" value={settings.currency} onChange={e => { setSettings({...settings, currency: e.target.value as any}); }} className="flex h-12 w-full rounded-xl bg-muted/30 px-3 font-bold border-none outline-none"><option value="GNF">GNF</option><option value="USD">USD</option></select></div>
                  </div>
                )}
                {activeSegment === 'sales' && settings && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2"><Label>Taxe (%)</Label><Input type="number" value={settings.tax_rate} onChange={e => setSettings({...settings, tax_rate: parseFloat(e.target.value)})} className="h-12 rounded-xl font-bold" /></div>
                    </div>
                  </div>
                )}
                {activeSegment === 'notifications' && settings && (
                  <div className="space-y-4">
                    <NotificationToggle title="Alertes de stock bas" checked={settings.enable_low_stock_alerts} onChange={v => setSettings({...settings, enable_low_stock_alerts: v})} />
                    <NotificationToggle title="Notifications par email" checked={settings.email_notifications} onChange={v => setSettings({...settings, email_notifications: v})} />
                  </div>
                )}
                {activeSegment === 'security' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-muted/10 rounded-3xl">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center"><Shield className="h-6 w-6 text-amber-600" /></div>
                        <div><p className="font-black text-sm">Mot de passe</p><p className="text-xs font-bold text-slate-500">Dernière modification : il y a 3 mois</p></div>
                      </div>
                      <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)} className="rounded-xl font-bold text-xs h-10">Changer</Button>
                    </div>
                  </div>
                )}

                {activeSegment === 'maintenance' && (
                  <div className="space-y-6">
                    <div className="p-8 bg-red-50 border border-red-100 rounded-4xl space-y-4">
                      <div className="flex items-start gap-4 text-red-600">
                        <AlertTriangle className="h-6 w-6 mt-1 shrink-0" />
                        <div>
                          <h3 className="font-black text-lg uppercase tracking-tight">Zone de danger</h3>
                          <p className="text-sm font-bold opacity-80 leading-relaxed">
                            La réinitialisation supprimera tous les produits, catégories, stocks, factures, transactions et rapports financiers. 
                            Cette action est définitive et ne peut pas être annulée.
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-4">
                        <Button 
                          variant="destructive" 
                          onClick={handleReset}
                          disabled={isSaving}
                          className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-red-200 transition-all hover:scale-[1.02] active:scale-95 bg-red-600 hover:bg-red-700"
                        >
                          {isSaving ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Trash2 className="mr-2 h-5 w-5" />}
                          Réinitialiser l'application
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </div>
  );
}

function NotificationToggle({ title, checked, onChange }: { title: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-6 bg-muted/10 rounded-3xl">
      <p className="font-black text-sm">{title}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
