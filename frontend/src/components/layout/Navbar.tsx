import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Package, 
  ChevronDown, 
  User, 
  LogOut, 
  Settings,
  LayoutDashboard,
  ShoppingCart,
  FileText,
  ClipboardList,
  Truck,
  TrendingUp,
  Users,
  FileSearch,
  Box
} from 'lucide-react';
// Removed invalid import
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';

// Since we are installing radix-ui raw, we might need to build the component wrappers if they don't exist.
// Checking if @/components/ui/dropdown-menu exists would be good, but I'll assume standard shadcn/ui structure or build it inline if needed.
// Given the previous error about folders, I'll implement a self-contained simple dropdown here using the raw radix primitives if I can't find the ui components, 
// BUT the plan said to install it. 
// Let's first assume we need to implement the wrappers or use the primitives directly in this file for simplicity if the UI components aren't there.
// Actually, looking at the file list earlier, I didn't see a `components/ui` folder in `src/components/layout` parent. 
// I should check `src/components/ui`.

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };



  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, exact: true },
    { 
      name: 'Produits', 
      icon: Package,
      children: [
        { name: 'Liste des produits', href: '/inventory', icon: Package },
      ]
    },
    { 
      name: 'Stock', 
      icon: Box,
      children: [
        { name: 'Mouvements', href: '/stock', icon: Box },
        { name: 'Achats', href: '/purchases', icon: Truck },
      ]
    },
    { 
      name: 'Ventes', 
      icon: ShoppingCart,
      children: [
        { name: 'Factures', href: '/invoices', icon: FileText },
        { name: 'Devis', href: '/quotes', icon: ClipboardList },
      ]
    },
    { 
      name: 'Contacts', 
      href: '/contacts',
      icon: Users,
      children: [
         { name: 'Tous les contacts', href: '/contacts', icon: Users },
      ]
    },
    { 
      name: 'Points de Vente', 
      icon: ShoppingCart,
      children: [
        { name: 'Terminal Vente', href: '/sales', icon: ShoppingCart },
      ]
    },
    { 
      name: 'Finance', 
      icon: TrendingUp,
      children: [
        { name: 'Vue d\'ensemble', href: '/finance', icon: TrendingUp },
      ]
    },
    { 
      name: 'Rapports', 
      icon: FileSearch,
      children: [
        { name: 'Rapports', href: '/reports', icon: FileSearch },
      ]
    },
  ];

  return (
    <nav className="border-b bg-[#1e1e2e] text-white px-4 h-16 flex items-center justify-between shadow-md z-50 relative">
      <div className="flex items-center space-x-6">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">E-Stock</span>
        </Link>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item, index) => {
            const active = item.exact 
              ? location.pathname === item.href 
              : ((item.href && location.pathname.startsWith(item.href)) || (item.children && item.children.some(child => location.pathname.startsWith(child.href))));

            if (item.children) {
              return (
                <DropdownMenuPrimitive.Root key={index}>
                  <DropdownMenuPrimitive.Trigger className={cn(
                    "flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-colors outline-none",
                    active ? "bg-white/10 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
                  )}>
                    <span>{item.name}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </DropdownMenuPrimitive.Trigger>
                  
                  <DropdownMenuPrimitive.Portal>
                    <DropdownMenuPrimitive.Content 
                      className="bg-[#1e1e2e] border border-gray-700 rounded-md shadow-xl p-1 min-w-[200px] z-50 text-gray-200 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                      sideOffset={5}
                    >
                      {item.children.map((child, childIndex) => (
                        <DropdownMenuPrimitive.Item key={childIndex} asChild>
                          <Link 
                            to={child.href}
                            className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-white/10 hover:text-white cursor-pointer outline-none"
                          >
                            <child.icon className="mr-2 h-4 w-4" />
                            {child.name}
                          </Link>
                        </DropdownMenuPrimitive.Item>
                      ))}
                    </DropdownMenuPrimitive.Content>
                  </DropdownMenuPrimitive.Portal>
                </DropdownMenuPrimitive.Root>
              );
            }

            return (
              <Link
                key={index}
                to={item.href!}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  active ? "bg-white/10 text-white" : "text-gray-300 hover:text-white hover:bg-white/5"
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center space-x-4">
        {/* <ThemeToggle /> */}
        
        <div className="hidden md:block text-right mr-2">
            <p className="text-xs font-medium text-white">Administrateur</p>
            <p className="text-[10px] text-gray-400">admin@pgstock.com</p>
        </div>

        <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger className="outline-none">
                <div className="h-9 w-9 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 hover:bg-blue-600/30 transition-colors border border-blue-600/30">
                    <User className="h-5 w-5" />
                </div>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content 
                    className="bg-[#1e1e2e] border border-gray-700 rounded-md shadow-xl p-1 min-w-[150px] z-50 text-gray-200"
                    align="end"
                    sideOffset={5}
                >
                    <DropdownMenuPrimitive.Item asChild>
                        <Link to="/settings" className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-white/10 hover:text-white cursor-pointer outline-none">
                            <Settings className="mr-2 h-4 w-4" />
                            Paramètres
                        </Link>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Separator className="my-1 h-px bg-gray-700" />
                    <DropdownMenuPrimitive.Item onSelect={handleLogout} className="flex items-center px-2 py-2 text-sm rounded-sm hover:bg-red-500/20 hover:text-red-400 cursor-pointer outline-none text-red-500">
                        <LogOut className="mr-2 h-4 w-4" />
                        Déconnexion
                    </DropdownMenuPrimitive.Item>
                </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Root>
      </div>
    </nav>
  );
}
