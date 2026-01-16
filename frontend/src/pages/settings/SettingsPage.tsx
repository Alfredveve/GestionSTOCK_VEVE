import { useState } from 'react';
import { 
  Building2, 
  Bell, 
  ShieldCheck, 
  Save,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SettingsPage() {
  const [activeSegment, setActiveSegment] = useState<'general' | 'notifications' | 'security'>('general');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground">Configurez votre entreprise et personnalisez votre expérience.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Navigation */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveSegment('general')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeSegment === 'general' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
            }`}
          >
            <Building2 className="mr-3 h-4 w-4" />
            Général
          </button>
          <button
            onClick={() => setActiveSegment('notifications')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeSegment === 'notifications' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
            }`}
          >
            <Bell className="mr-3 h-4 w-4" />
            Notifications
          </button>
          <button
            onClick={() => setActiveSegment('security')}
            className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-bold transition-all ${
              activeSegment === 'security' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted"
            }`}
          >
            <ShieldCheck className="mr-3 h-4 w-4" />
            Sécurité
          </button>
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 space-y-6">
          {activeSegment === 'general' && (
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-black">Informations de l'Entreprise</CardTitle>
                <CardDescription>Ces détails apparaîtront sur vos factures et documents.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nom Commerical</label>
                    <Input defaultValue="PGStock SARL" className="bg-muted/30 border-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Devise de travail</label>
                    <select 
                      aria-label="Sélectionner la devise"
                      className="flex h-9 w-full rounded-md bg-muted/30 px-3 py-1 text-sm shadow-sm transition-colors outline-none"
                    >
                      <option value="GNF">Franc Guinéen (GNF)</option>
                      <option value="USD">Dollar Américain (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Addresse Siège social</label>
                  <Input defaultValue="Kaloum, Conakry, Guinée" className="bg-muted/30 border-none" />
                </div>
                <div className="pt-4 flex justify-end">
                  <Button className="shadow-lg shadow-primary/20">
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSegment === 'notifications' && (
            <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-black">Préférences de Notification</CardTitle>
                <CardDescription>Gérez comment et quand vous êtes notifié.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                  <div>
                    <p className="font-bold text-sm">Alertes Stock Bas</p>
                    <p className="text-xs text-muted-foreground">Recevoir un email quand un produit passe sous le seuil.</p>
                  </div>
                  <div className="h-6 w-11 bg-primary rounded-full relative">
                    <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeSegment === 'security' && (
             <Card className="border-none shadow-xl bg-card/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-black">Accès & Sécurité</CardTitle>
                <CardDescription>Protégez votre compte et gérez les accès.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start text-sm font-bold border-muted h-12">
                   Réinitialiser le mot de passe
                </Button>
                <Button variant="outline" className="w-full justify-start text-sm font-bold border-muted h-12">
                   Activer l'authentification à deux facteurs
                   <Badge variant="secondary" className="ml-auto text-[10px]">Recommandé</Badge>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
