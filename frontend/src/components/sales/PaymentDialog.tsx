import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import inventoryService from '@/services/inventoryService';
import { formatCurrency } from '@/lib/utils';
import type { Invoice } from '@/types';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export function PaymentDialog({ open, onOpenChange, invoice, onSuccess }: PaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  
  const queryClient = useQueryClient();

  const paymentMutation = useMutation({
    mutationFn: async (data: { invoiceId: number; amount: number; method: string; reference?: string }) => {
      return inventoryService.recordPayment(data.invoiceId, {
        amount: data.amount,
        payment_method: data.payment_method, // Note: backend likely expects 'payment_method' snake_case
        transaction_id: data.reference
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success("Paiement enregistré avec succès");
      onOpenChange(false);
      setAmount('');
      setReference('');
      onSuccess();
    },
    onError: () => {
      toast.error("Erreur lors de l'enregistrement du paiement");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !amount) return;

    paymentMutation.mutate({
      invoiceId: invoice.id,
      amount: Number(amount),
      method: paymentMethod,
      reference
    });
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Facture {invoice.invoice_number} - Reste à payer: <span className="font-bold text-rose-500">{formatCurrency(invoice.balance)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Montant
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              max={Number(invoice.balance)}
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="method" className="text-right">
              Méthode
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Choisir une méthode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="card">Carte bancaire</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="bank_transfer">Virement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reference" className="text-right">
              Référence
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="col-span-3"
              placeholder="Facultatif"
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">Annuler</Button>
          <Button onClick={handleSubmit} disabled={paymentMutation.isPending || !amount}>
            {paymentMutation.isPending ? "Traitement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
