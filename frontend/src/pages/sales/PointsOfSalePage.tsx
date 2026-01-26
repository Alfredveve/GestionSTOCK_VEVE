import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loader2,
  Store, 
  Search, 
  MapPin, 
  Phone, 
  User, 
  Edit2, 
  Trash2, 
  MoreVertical,
  Plus
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import type { PointOfSale } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';

export function PointsOfSalePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPOS, setSelectedPOS] = useState<PointOfSale | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    phone: '',
    manager: null as number | null,
    manager_name: '',
    is_active: true,
    is_warehouse: false,
  });

  // Fetch Points of Sale
  const { data: posData, isLoading, isError } = useQuery({
    queryKey: ['points-of-sale'],
    queryFn: () => inventoryService.getPointsOfSale({ page_size: 100 }),
  });

  // Fetch Users
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: inventoryService.getUsers,
  });

  const pointsOfSale = Array.isArray(posData) ? posData : (posData?.results || []);

  const filteredPOS = pointsOfSale.filter((pos: PointOfSale) => 
    pos.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pos.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pos.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: inventoryService.createPointOfSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-of-sale'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Point de vente créé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la création du point de vente');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<PointOfSale> }) => 
      inventoryService.updatePointOfSale(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-of-sale'] });
      setIsEditModalOpen(false);
      resetForm();
      toast.success('Point de vente mis à jour avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du point de vente');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: inventoryService.deletePointOfSale,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['points-of-sale'] });
      setIsDeleteModalOpen(false);
      setSelectedPOS(null);
      toast.success('Point de vente supprimé avec succès');
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du point de vente');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      city: '',
      phone: '',
      manager: null,
      manager_name: '',
      is_active: true,
      is_warehouse: false,
    });
    setSelectedPOS(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (pos: PointOfSale) => {
    setSelectedPOS(pos);
    setFormData({
      name: pos.name,
      code: pos.code,
      address: pos.address || '',
      city: pos.city || '',
      phone: pos.phone || '',
      manager: pos.manager,
      manager_name: pos.manager_name || '',
      is_active: pos.is_active,
      is_warehouse: pos.is_warehouse,
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (pos: PointOfSale) => {
    setSelectedPOS(pos);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent, isEdit: boolean) => {
    e.preventDefault();
    if (isEdit && selectedPOS) {
      updateMutation.mutate({ id: selectedPOS.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="space-y-8 animate-in fade-in duration-700 p-6 max-w-[1600px] mx-auto font-sans text-slate-200">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-linear-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
              <Store className="h-8 w-8 text-indigo-400" />
            </div>
            Points de Vente
          </h2>
          <p className="mt-2 text-slate-400 text-lg">Gérez vos emplacements physiques et entrepôts.</p>
        </div>
        
        <Button 
          onClick={openCreateModal}
          className="h-12 px-8 rounded-xl shadow-lg shadow-indigo-500/30 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all duration-300 hover:scale-105 active:scale-95 text-base"
        >
          <Plus className="mr-2 h-5 w-5" />
          Nouveau Point de Vente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none bg-[#1e1e2e]/50 backdrop-blur-xl ring-1 ring-white/5 shadow-xl hover:bg-[#1e1e2e]/70 transition-colors duration-300 overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Store className="h-6 w-6" />
              </div>
              <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">Total POS</p>
            </div>
            <div className="text-4xl font-black text-white tracking-tight">
              {pointsOfSale.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-[#1e1e2e]/50 backdrop-blur-xl ring-1 ring-white/5 shadow-xl hover:bg-[#1e1e2e]/70 transition-colors duration-300 overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-2">
               <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">Actifs</p>
            </div>
            <div className="text-4xl font-black text-white tracking-tight">
              {pointsOfSale.filter((p: PointOfSale) => p.is_active).length}
            </div>
          </CardContent>
        </Card>

         <Card className="border-none bg-[#1e1e2e]/50 backdrop-blur-xl ring-1 ring-white/5 shadow-xl hover:bg-[#1e1e2e]/70 transition-colors duration-300 overflow-hidden relative group">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-2">
               <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                <MapPin className="h-6 w-6" />
              </div>
              <p className="text-slate-400 font-medium uppercase tracking-wider text-sm">Entrepôts</p>
            </div>
            <div className="text-4xl font-black text-white tracking-tight">
              {pointsOfSale.filter((p: PointOfSale) => p.is_warehouse).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-[#1e1e2e]/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-300" />
          <Input 
            placeholder="Rechercher un point de vente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-[#0b0f19]/50 border-transparent focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 rounded-xl text-slate-200 placeholder:text-slate-600 transition-all duration-300"
          />
        </div>
        <div className="text-sm text-slate-500 font-medium">
            Affichage de <span className="text-white font-bold">{filteredPOS.length}</span> résultats
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isError && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-center text-red-200 mb-8">
            Une erreur est survenue lors du chargement des points de vente. Veuillez réessayer plus tard.
          </div>
        )}

        {isLoading ? (
           Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 w-full bg-[#1e1e2e] animate-pulse rounded-2xl" />
          ))
        ) : filteredPOS.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-[#1e1e2e]/30 rounded-3xl border border-dashed border-slate-700">
            <Store className="h-16 w-16 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-400">Aucun point de vente trouvé</h3>
          </div>
        ) : (
          filteredPOS.map((pos: PointOfSale) => (
            <div 
              key={pos.id} 
              className="group relative flex flex-col p-6 bg-[#1e1e2e]/60 hover:bg-[#1e1e2e] border border-white/5 hover:border-indigo-500/30 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                     <div className={`p-3 rounded-xl border border-white/5 ${pos.is_warehouse ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                        <Store className="h-6 w-6" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {pos.name}
                        </h3>
                        <p className="text-sm text-slate-400 font-mono">
                            {pos.code}
                        </p>
                     </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white rounded-lg">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-[#111827] border-[#2e2e3e] text-slate-200">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-[#2e2e3e]" />
                        <DropdownMenuItem 
                          onClick={() => openEditModal(pos)} 
                          className="focus:bg-indigo-500/10 focus:text-indigo-400 cursor-pointer"
                        >
                            <Edit2 className="mr-2 h-4 w-4" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => openDeleteModal(pos)} 
                          className="focus:bg-red-500/10 focus:text-red-400 cursor-pointer text-red-400"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>

              <div className="space-y-3 mb-6">
                {pos.city && (
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                        <MapPin className="h-4 w-4 text-slate-600" />
                        {pos.address}, {pos.city}
                    </div>
                )}
                {pos.phone && (
                   <div className="flex items-center gap-3 text-sm text-slate-400">
                        <Phone className="h-4 w-4 text-slate-600" />
                        {pos.phone}
                    </div>
                )}
                 <div className="flex items-center gap-3 text-sm text-slate-400">
                        <User className="h-4 w-4 text-slate-600" />
                        Gérant: <span className="text-slate-300">{pos.manager_username || pos.manager_name || 'Non assigné'}</span>
                </div>
              </div>

               <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <Badge variant="outline" className={`${pos.is_active ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' : 'border-red-500/20 text-red-400 bg-red-500/10'}`}>
                        {pos.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                     {pos.is_warehouse && (
                        <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Entrepôt
                        </Badge>
                     )}
               </div>

                {/* Edit & Delete Action Buttons (Direct Access) */}
               <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex gap-2">
                    <Button 
                      onClick={() => openEditModal(pos)}
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 bg-[#1e1e2e] border border-white/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors shadow-lg"
                      title="Modifier"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                     <Button 
                      onClick={() => openDeleteModal(pos)}
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 bg-[#1e1e2e] border border-white/10 text-red-400 hover:bg-red-500 hover:text-white transition-colors shadow-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
               </div>
            </div>
          ))
        )}
      </div>

      </div>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="bg-[#1e1e2e] border-slate-700 text-slate-200 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Ajouter un Point de Vente</DialogTitle>
             <DialogDescription className="text-slate-400">
              Remplissez les détails du nouveau point de vente ou entrepôt.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Nom du magasin</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                  placeholder="Ex: Boutique Kaloum"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-slate-300">Code</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                  placeholder="Ex: KAL-01"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-slate-300">Ville</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                  placeholder="Conakry"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                  placeholder="+224 ..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-300">Adresse complète</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                placeholder="Quartier, Rue..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager" className="text-slate-300">Compte Utilisateur (Facultatif)</Label>
                <select
                  id="manager"
                  aria-label="Compte utilisateur du gérant"
                  className="w-full h-10 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-white focus:border-indigo-500 focus:outline-none"
                  value={formData.manager || ''}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">Sélectionner un compte...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_name" className="text-slate-300">Ou Nom Libre</Label>
                <Input
                  id="manager_name"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                  placeholder="Ex: Jean Gérant"
                />
              </div>
            </div>

             <div className="flex items-center gap-8 py-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_warehouse"
                    checked={formData.is_warehouse}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_warehouse: checked })}
                  />
                  <Label htmlFor="is_warehouse" className="text-slate-300">Est un Entrepôt ?</Label>
                </div>
                 <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                   <Label htmlFor="is_active" className="text-slate-300">Actif</Label>
                </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-700">
               <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">Annuler</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-[#1e1e2e] border-slate-700 text-slate-200 sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Modifier le Point de Vente</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-slate-300">Nom du magasin</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code" className="text-slate-300">Code</Label>
                 <Input
                  id="edit-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-city" className="text-slate-300">Ville</Label>
                <Input
                  id="edit-city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                />
              </div>
              <div className="space-y-2">
                 <Label htmlFor="edit-phone" className="text-slate-300">Téléphone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="edit-address" className="text-slate-300">Adresse complète</Label>
                <Input
                    id="edit-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-manager" className="text-slate-300">Compte Utilisateur</Label>
                <select
                  id="edit-manager"
                  aria-label="Compte utilisateur du gérant"
                  className="w-full h-10 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-white focus:border-indigo-500 focus:outline-none"
                  value={formData.manager || ''}
                  onChange={(e) => setFormData({ ...formData, manager: e.target.value ? parseInt(e.target.value) : null })}
                >
                  <option value="">Aucun compte...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-manager_name" className="text-slate-300">Nom Libre</Label>
                <Input
                  id="edit-manager_name"
                  value={formData.manager_name}
                  onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  className="bg-slate-900/50 border-slate-700 text-white focus:border-indigo-500"
                />
              </div>
            </div>

             <div className="flex items-center gap-8 py-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-is_warehouse"
                    checked={formData.is_warehouse}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_warehouse: checked })}
                  />
                  <Label htmlFor="edit-is_warehouse" className="text-slate-300">Est un Entrepôt ?</Label>
                </div>
                 <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                   <Label htmlFor="edit-is_active" className="text-slate-300">Actif</Label>
                </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-700">
               <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">Annuler</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mettre à jour
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-[#1e1e2e] border-slate-700 text-slate-200">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Confirmer la suppression</DialogTitle>
            <DialogDescription className="text-slate-400">
              Êtes-vous sûr de vouloir supprimer "{selectedPOS?.name}" ? Cette action est irréversible et pourrait affecter les stocks liés.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-white">Annuler</Button>
            <Button 
                variant="destructive" 
                onClick={() => selectedPOS && deleteMutation.mutate(selectedPOS.id)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
            >
               {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
