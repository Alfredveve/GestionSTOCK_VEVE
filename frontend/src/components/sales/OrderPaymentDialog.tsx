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
import salesService from '@/services/salesService';
import { formatCurrency } from '@/lib/utils';
import type { Order } from '@/services/salesService';

interface OrderPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess: () => void;
}

export function OrderPaymentDialog({ open, onOpenChange, order, onSuccess }: OrderPaymentDialogProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  
  const queryClient = useQueryClient();

  const paymentMutation = useMutation({
    mutationFn: async (data: { orderId: number; amount: number; method: string }) => {
      return salesService.addPayment(data.orderId, data.amount, data.method);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] }); // Invalidate single order too
      toast.success("Paiement enregistré avec succès");
      onOpenChange(false);
      setAmount('');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erreur lors de l'enregistrement du paiement");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !order.id || !amount) return;

    paymentMutation.mutate({
      orderId: order.id,
      amount: Number(amount),
      method: paymentMethod
    });
  };

  if (!order) return null;

  const remaining = (Number(order.total_amount) || 0) - (Number(order.amount_paid) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Régler la commande</DialogTitle>
          <DialogDescription>
            Commande {order.order_number} - Reste à payer: <span className="font-bold text-rose-500">{formatCurrency(remaining)}</span>
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
              max={remaining}
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
