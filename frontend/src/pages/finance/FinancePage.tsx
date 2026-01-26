import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Plus,
  LayoutDashboard,
  Receipt,
  Tags,
  BarChart3,
  Search
} from 'lucide-react';
import inventoryService from '@/services/inventoryService';
import dashboardService from '@/services/dashboardService';
import { Button } from "@/components/ui/button";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { useState } from 'react';
import { ExpenseForm } from '@/components/finance/ExpenseForm';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { ExpenseList } from '@/components/finance/ExpenseList';
import { CategoryManager } from '@/components/finance/CategoryManager';
import { ProfitReport } from '@/components/finance/ProfitReport';
import { toast } from 'sonner';

import { useSearchParams } from 'react-router-dom';

export function FinancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<'excel' | 'pdf' | null>(null);
  
  // Date filter state
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const { data: expenses, isLoading: isLoadingExpenses } = useQuery({
    queryKey: ['expenses', startDate, endDate],
    queryFn: () => inventoryService.getExpenses({ start_date: startDate, end_date: endDate }),
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', startDate, endDate],
    queryFn: () => dashboardService.getStats({ start_date: startDate, end_date: endDate }),
  });

  const handleExportExcel = async () => {
    try {
      setIsExporting('excel');
      await inventoryService.exportExpensesExcel();
      toast.success("Registre des dépenses exporté (Excel)");
    } catch {
      toast.error("Erreur lors de l'exportation Excel");
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting('pdf');
      await inventoryService.exportExpensesPdf();
      toast.success("État des dépenses exporté (PDF)");
    } catch {
      toast.error("Erreur lors de l'exportation PDF");
    } finally {
      setIsExporting(null);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header section with glass effect */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-card/40 p-6 rounded-3xl border border-white/20 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-2xl shadow-inner">
            <DollarSign className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-4xl font-black tracking-tighter bg-linear-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Finance
            </h2>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              Pilotage financier et rentabilité opérationnelle
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
            <div className="flex items-center gap-2 bg-muted/30 p-2 rounded-2xl border border-muted/50 shadow-inner group transition-all hover:bg-muted/40">
                <Calendar className="h-4 w-4 text-muted-foreground ml-2 group-hover:text-primary transition-colors" />
                <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold p-1 outline-none text-muted-foreground focus:text-foreground"
                    aria-label="Date de début"
                />
                <span className="text-muted-foreground font-black">→</span>
                <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold p-1 outline-none text-muted-foreground focus:text-foreground"
                    aria-label="Date de fin"
                />
            </div>

          <Button 
            onClick={() => setIsFormOpen(true)} 
            className="rounded-2xl h-11 px-6 font-bold shadow-lg shadow-primary/30 hover:shadow-primary/40 transition-all hover:-translate-y-1 active:scale-95"
          >
            <Plus className="mr-2 h-5 w-5" />
            Nouvelle Dépense
          </Button>
        </div>
      </div>

      <ExpenseForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <TabsList className="bg-card/50 p-1.5 rounded-2xl h-auto backdrop-blur-sm border border-white/10 shadow-lg inline-flex">
          <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Aperçu
          </TabsTrigger>
          <TabsTrigger value="expenses" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Receipt className="h-4 w-4 mr-2" />
            Dépenses
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <Tags className="h-4 w-4 mr-2" />
            Catégories
          </TabsTrigger>
          <TabsTrigger value="profit" className="rounded-xl px-6 py-2.5 font-bold data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
            <BarChart3 className="h-4 w-4 mr-2" />
            Rapports Profit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <FinanceOverview stats={stats} />
        </TabsContent>

        <TabsContent value="expenses" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ExpenseList 
            expenses={expenses} 
            isLoading={isLoadingExpenses}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
          />
        </TabsContent>

        <TabsContent value="categories" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="profit" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ProfitReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
