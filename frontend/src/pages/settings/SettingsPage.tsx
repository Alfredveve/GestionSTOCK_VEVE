import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Building2, 
  Bell, 
  ShieldCheck, 
  Save,
  ShoppingBag,
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

  useEffect(() => { fetchSettings(); }, []);
  useEffect(() => {
    const state = location.state as { activeTab?: typeof activeSegment };
    if (state?.activeTab) setActiveSegment(state.activeTab);
  }, [location]);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const data = await settingsService.getSettings();
      setSettings(data);
    } catch { toast.error("Erreur chargement"); } finally { setIsLoading(false); }
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setIsSaving(true);
      await settingsService.updateSettings(settings);
      setHasUnsavedChanges(false);
      toast.success("Enregistré");
    } catch { toast.error("Échec"); } finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="h-[60vh] flex items-center justify-center font-bold">Chargement...</div>;

  const navItems = [
    { id: 'general', label: 'Général', icon: Building2 },
    { id: 'sales', label: 'Ventes', icon: ShoppingBag },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: ShieldCheck },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'administration', label: 'Administration', icon: Shield },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex justify-between items-end">
        <div><h2 className="text-4xl font-black">Paramètres</h2><p className="text-muted-foreground mt-1">Configurez votre système.</p></div>
        <Button onClick={handleSave} disabled={isSaving} className="h-12 px-8 rounded-2xl font-black uppercase tracking-wider">
          {isSaving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <div className="space-y-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSegment(item.id)} className={`w-full flex items-center px-5 py-4 rounded-2xl text-sm font-black transition-all ${activeSegment === item.id ? "bg-white text-primary shadow-xl" : "text-muted-foreground"}`}>
              <div className={`p-2 rounded-xl mr-4 ${activeSegment === item.id ? "bg-primary text-white" : "bg-muted"}`}><item.icon className="h-4 w-4" /></div>
              {item.label}
            </button>
          ))}
        </div>

        <div className="lg:col-span-3">
          <AnimatePresence mode="wait"><motion.div key={activeSegment} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Card className="rounded-[2.5rem] overflow-hidden bg-white/60 backdrop-blur-xl">
              <CardHeader className="p-8 pb-4"><CardTitle className="text-2xl font-black">{navItems.find(i => i.id === activeSegment)?.label}</CardTitle></CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                {activeSegment === 'general' && settings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><Label>Nom</Label><Input value={settings.company_name} onChange={e => { setSettings({...settings, company_name: e.target.value}); setHasUnsavedChanges(true); }} className="h-12 rounded-xl font-bold" /></div>
                    <div className="space-y-2"><Label>Devise</Label><select value={settings.currency} onChange={e => { setSettings({...settings, currency: e.target.value as any}); setHasUnsavedChanges(true); }} className="flex h-12 w-full rounded-xl bg-muted/30 px-3 font-bold border-none outline-none"><option value="GNF">GNF</option><option value="USD">USD</option></select></div>
                  </div>
                )}
                {activeSegment === 'sales' && settings && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2"><Label>Type par défaut</Label>
                        <div className="flex bg-muted/20 p-1.5 rounded-2xl">
                          <button onClick={() => { setSettings({...settings, default_order_type: 'retail'}); setHasUnsavedChanges(true); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${settings.default_order_type === 'retail' ? "bg-white shadow-sm" : ""}`}>Détail</button>
                          <button onClick={() => { setSettings({...settings, default_order_type: 'wholesale'}); setHasUnsavedChanges(true); }} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${settings.default_order_type === 'wholesale' ? "bg-white shadow-sm" : ""}`}>Gros</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-6 bg-primary/3 rounded-3xl">
                        <div><p className="font-black text-sm">Arrondi Intelligent</p><p className="text-[10px] text-muted-foreground">Arrondir le total.</p></div>
                        <Switch checked={settings.smart_rounding} onCheckedChange={v => { setSettings({...settings, smart_rounding: v}); setHasUnsavedChanges(true); }} />
                      </div>
                    </div>
                  </div>
                )}
                {activeSegment === 'notifications' && settings && (
                  <div className="space-y-4">
                    <NotificationToggle title="Alertes Stock" checked={settings.email_notifications} onChange={v => { setSettings({...settings, email_notifications: v}); setHasUnsavedChanges(true); }} />
                    <NotificationToggle title="Rapports" checked={settings.daily_reports} onChange={v => { setSettings({...settings, daily_reports: v}); setHasUnsavedChanges(true); }} />
                  </div>
                )}
                {activeSegment === 'security' && <div className="space-y-4"><Button variant="outline" onClick={() => setIsPasswordModalOpen(true)} className="w-full h-16 rounded-2xl font-black uppercase">Changer mot de passe</Button></div>}
              </CardContent>
            </Card>
          </motion.div></AnimatePresence>
        </div>
      </div>
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
    </div>
  );
}

function NotificationToggle({ title, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between p-6 bg-muted/10 rounded-3xl">
      <p className="font-black text-sm">{title}</p>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
