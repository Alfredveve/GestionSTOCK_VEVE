import { ShoppingBag, Store, User, Calendar } from 'lucide-react';
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, PointOfSale } from '@/types';

interface InvoiceFormMetaProps {
  isEdit: boolean;
  invoiceNumber?: string;
  selectedPosId: string;
  setSelectedPosId: (value: string) => void;
  posData?: { results: PointOfSale[] };
  selectedClientId: string;
  setSelectedClientId: (value: string) => void;
  clientsData?: { results: Client[] };
  dateIssued: string;
  setDateIssued: (value: string) => void;
  dateDue: string;
  setDateDue: (value: string) => void;
}

export function InvoiceFormMeta({
  isEdit,
  invoiceNumber,
  selectedPosId,
  setSelectedPosId,
  posData,
  selectedClientId,
  setSelectedClientId,
  clientsData,
  dateIssued,
  setDateIssued,
  dateDue,
  setDateDue
}: InvoiceFormMetaProps) {
  return (
    <div className="p-5 border-b border-slate-100 bg-slate-50/30 space-y-4 shrink-0">
      <div className="flex items-center justify-between">
          <div>
             <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
               <ShoppingBag className="h-5 w-5 text-indigo-600" />
               {isEdit ? `#${invoiceNumber}` : 'Nouvelle Vente'}
             </h2>
             <p className="text-xs text-slate-400 font-medium">
               {new Date().toLocaleDateString('fr-GN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
             </p>
          </div>
          {/* POS Selector (Compact) */}
          <div className="w-40">
              <Select value={selectedPosId} onValueChange={setSelectedPosId}>
                 <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                    <Store className="h-3 w-3 mr-2 text-slate-400" />
                    <SelectValue placeholder="Point de Vente" />
                 </SelectTrigger>
                 <SelectContent>
                    {posData?.results?.map(pos => (
                       <SelectItem key={pos.id} value={pos.id.toString()} className="text-xs">
                          {pos.name}
                       </SelectItem>
                    ))}
                 </SelectContent>
              </Select>
          </div>
      </div>

      {/* Client Select */}
      <div className="relative group">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none z-10" />
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
             <SelectTrigger className="h-12 pl-10 bg-white border-slate-200 rounded-xl focus:ring-indigo-100 text-sm font-medium shadow-sm">
                <SelectValue placeholder="Sélectionner un client (Requis)" />
             </SelectTrigger>
             <SelectContent className="max-h-[300px]">
                {clientsData?.results?.map((client) => (
                   <SelectItem key={client.id} value={client.id.toString()} className="py-3">
                      <span className="font-bold">{client.name}</span>
                      <span className="block text-[10px] text-slate-400">{client.phone || client.email}</span>
                   </SelectItem>
                ))}
             </SelectContent>
          </Select>
      </div>

       {/* Dates */}
       <div className="grid grid-cols-2 gap-3">
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
             <Input 
                type="date"
                value={dateIssued}
                onChange={(e) => setDateIssued(e.target.value)}
                className="h-10 pl-9 text-xs bg-slate-50 border-slate-200 rounded-lg"
             />
          </div>
          <div className="relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-rose-300 pointer-events-none" />
             <Input 
                type="date"
                value={dateDue}
                onChange={(e) => setDateDue(e.target.value)}
                className="h-10 pl-9 text-xs bg-rose-50/50 border-rose-100 text-rose-600 rounded-lg"
             />
          </div>
       </div>
    </div>
  );
}
