import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users, 
  FileText, 
  ClipboardList,
  FileSearch,
  Truck,
  History,
  ChevronDown,
  Monitor,
  Settings,
  PlusCircle,
  BarChart3,
  Archive,
  Wallet,
  Receipt,
  Tags,
  Store,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

type NavigationItem = {
  name: string;
  href?: string;
  icon: any;
  children?: { name: string; href: string; icon?: any }[];
};

const navigation: NavigationItem[] = [
  // 1 - Dashboard
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  
  // 2 - Produits (Liste des produits, Nouveau produit, Catégories)
  { 
    name: 'Produits', 
    icon: Package,
    children: [
      { name: 'Liste des produits', href: '/inventory', icon: Package },
      { name: 'Nouveau produit', href: '/inventory?action=new', icon: PlusCircle },
      { name: 'Catégories', href: '/categories', icon: Tags },
    ]
  },

  // 3 - Stock (Etat du stock, Historique, Entrée/Sortie, Bons de Réception)
  { 
    name: 'Stock', 
    icon: Archive,
    children: [
      { name: 'État du stock', href: '/stock', icon: Archive },
      { name: 'Historique', href: '/stock?tab=history', icon: History },
      { name: 'Entrée/Sortie', href: '/stock?tab=movements', icon: Truck },
      { name: 'Bons de Réception', href: '/purchases', icon: FileText },
    ]
  },

  // 4 - Devis & Commandes, Factures, Nouvelle Facture, Vente Rapide(POST)
  { 
    name: 'Ventes & Fact.', 
    icon: ShoppingCart,
    children: [
      { name: 'Devis & Commandes', href: '/quotes', icon: ClipboardList },
      { name: 'Factures', href: '/invoices', icon: Receipt },
      { name: 'Nouvelle Facture', href: '/invoices/new', icon: PlusCircle },
      { name: 'Vente Rapide (POS)', href: '/sales', icon: Monitor }, 
    ]
  },

  // 5 - Contacts (Clients, Fournisseurs)
  { 
    name: 'Contacts', 
    icon: Users,
    children: [
        { name: 'Clients', href: '/contacts?type=client', icon: Users },
        { name: 'Fournisseurs', href: '/contacts?type=supplier', icon: Truck },
    ]
  },

  // 6 - Points de vente (Liste des POS, Config. Stock)
  { 
    name: 'Points de Vente', 
    icon: Store, 
    children: [
        { name: 'Liste des POS', href: '/sales/list', icon: Monitor },
        { name: 'Config. Stock', href: '/sales/config', icon: Settings },
    ]
  }, 

  // 7 - Finance (Dépenses, Catégorie (Dépenses), Rapport de profit)
  { 
    name: 'Finance', 
    icon: Wallet,
    children: [
        { name: 'Dépenses', href: '/finance?tab=expenses', icon: TrendingUp },
        { name: 'Catégories', href: '/finance?tab=categories', icon: Tags },
        { name: 'Rapport de profit', href: '/finance?tab=profit', icon: BarChart3 },
    ]
  },

  // 8 - Rapports ( Tableau de bord, Finances & Paiements, Analyses Avancés)
  { 
    name: 'Rapports', 
    icon: FileSearch,
    children: [
        { name: 'Tableau de bord', href: '/reports/dashboard', icon: LayoutDashboard },
        { name: 'Finances & Paiements', href: '/reports/finance', icon: Wallet },
        { name: 'Analyses Avancés', href: '/reports/advanced', icon: BarChart3 },
    ]
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Automatically expand groups based on current path
  useEffect(() => {
    const currentPath = location.pathname;
    const groupsToExpand = navigation
      .filter(item => item.children && item.children.some(child => {
        const childPath = child.href.split('?')[0];
        return currentPath === childPath || (childPath !== '/' && currentPath.startsWith(childPath));
      }))
      .map(item => item.name);
    
    if (groupsToExpand.length > 0) {
      setExpandedGroups(prev => Array.from(new Set([...prev, ...groupsToExpand])));
    }
    
    // Auto-close sidebar on mobile when route changes
    if (window.innerWidth < 768) {
      onClose();
    }
  }, [location.pathname]);

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    const pathNoQuery = path.split('?')[0];
    return location.pathname === pathNoQuery || location.pathname.startsWith(pathNoQuery + '/');
  };

  const isGroupActive = (children: { href: string }[]) => {
    return children.some(child => isActive(child.href));
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed md:relative z-50 flex flex-col h-full bg-[#1e1e2e]/95 backdrop-blur-xl border-r border-[#2e2e3e] w-72 shadow-2xl text-gray-100 transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center space-x-3 px-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                PGStock
              </h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Gestion Intelligente</p>
            </div>
          </div>
          {/* Close Button for Mobile */}
          <button onClick={onClose} className="md:hidden p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-6">
          <p className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Menu Principal</p>
          
          {navigation.map((item) => {
            if (item.children) {
              const isExpanded = expandedGroups.includes(item.name);
              const groupActive = isGroupActive(item.children);
              
              return (
                <div key={item.name} className="space-y-1 mb-1">
                  <button
                    onClick={() => toggleGroup(item.name)}
                    className={cn(
                      "flex items-center justify-between w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden",
                      groupActive 
                        ? "text-white bg-white/5" 
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {/* Active Indicator Strip */}
                    {groupActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-500 rounded-r-full" />
                    )}

                    <div className="flex items-center z-10">
                      <item.icon className={cn(
                        "mr-3 h-5 w-5 transition-colors",
                        groupActive ? "text-blue-400" : "text-gray-500 group-hover:text-blue-400"
                      )} />
                      {item.name}
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-gray-500 transition-transform duration-200",
                      isExpanded ? "transform rotate-180 text-blue-400" : ""
                    )} />
                  </button>
                  
                  <div className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-out pl-4",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <div className="overflow-hidden space-y-1">
                      {/* Vertical line for connecting children */}
                      <div className="relative border-l border-gray-700/50 ML-4 space-y-1 pl-3 ml-2 py-1">
                          {item.children.map((child) => {
                              const childActive = isActive(child.href);
                              return (
                                  <Link
                                      key={child.name}
                                      to={child.href}
                                      className={cn(
                                      "flex items-center px-4 py-2 text-sm rounded-lg transition-all duration-200 relative",
                                      childActive
                                          ? "text-blue-400 bg-blue-500/10 font-medium" 
                                          : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                                      )}
                                  >
                                      {child.icon ? (
                                          <child.icon className={cn(
                                              "mr-2 h-4 w-4",
                                              childActive ? "text-blue-400" : "text-gray-600"
                                          )} />
                                      ) : (
                                          <span className={cn(
                                              "w-1.5 h-1.5 rounded-full mr-2.5 ml-1",
                                              childActive ? "bg-blue-400" : "bg-gray-600"
                                          )} />
                                      )}
                                      {child.name}
                                  </Link>
                              );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const active = isActive(item.href || '#');
            return (
              <Link
                key={item.name}
                to={item.href!}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative group overflow-hidden mb-1",
                  active
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn(
                  "mr-3 h-5 w-5 transition-colors",
                  active ? "text-white" : "text-gray-500 group-hover:text-blue-400"
                )} />
                <span className="z-10">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
