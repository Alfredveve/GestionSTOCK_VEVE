import { Percent, FileText, Loader2, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from '@/lib/formatters';

interface InvoiceFormSummaryProps {
  subtotal: number;
  globalDiscount: number;
  setGlobalDiscount: (value: number) => void;
  total: number;
  notes: string;
  setNotes: (value: string) => void;
  onSave: (status: 'draft' | 'sent') => void;
  isPending: boolean;
  isEdit: boolean;
  canSave: boolean;
}

export function InvoiceFormSummary({
  subtotal,
  globalDiscount,
  setGlobalDiscount,
  total,
  notes,
  setNotes,
  onSave,
  isPending,
  isEdit,
  canSave
}: InvoiceFormSummaryProps) {
  return (
    <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4 shrink-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
         
         {/* Subtotal & Discount */}
         <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-slate-500">
               <span>Sous-total</span>
               <span className="font-mono">{formatCurrency(subtotal)}</span>
            </div>
            
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
                  <Percent className="h-3.5 w-3.5" /> Remise
               </div>
               <div className="flex items-center w-28 relative">
                  <Input 
                     type="number" 
                     value={globalDiscount} 
                     onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                     className="h-8 text-right pr-9 bg-white border-rose-100 focus:ring-rose-200 text-xs font-bold text-rose-600"
                  />
                  <span className="absolute right-3 text-[9px] text-rose-300 font-bold">GNF</span>
               </div>
            </div>
            
            {/* Visual Separator */}
            <div className="border-b border-slate-200 border-dashed my-3" />

             <div className="flex justify-between items-end">
               <span className="text-sm font-black uppercase tracking-wider text-slate-600">Total à Payer</span>
               <div className="text-right">
                  <span className="block text-2xl font-black text-slate-900 font-mono tracking-tighter leading-none">
                     {formatCurrency(total)}
                  </span>
               </div>
            </div>
         </div>

         {/* Notes */}
         <div className="relative">
            <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Textarea 
               placeholder="Notes ou instructions pour la facture..." 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)}
               className="pl-10 min-h-[60px] max-h-[100px] text-xs bg-white border-slate-200 resize-none focus:ring-1 focus:ring-indigo-100"
            />
         </div>

         {/* Action Buttons */}
         <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
               variant="outline" 
               onClick={() => onSave('draft')}
               disabled={isPending || !canSave}
               className="h-12 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold rounded-xl"
            >
               Brouillon
            </Button>
            <Button 
               onClick={() => onSave('sent')}
               disabled={isPending || !canSave}
               className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 rounded-xl"
            >
               {isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
               {isEdit ? 'Mettre à jour' : 'Valider la Vente'}
            </Button>
         </div>
    </div>
  );
}
