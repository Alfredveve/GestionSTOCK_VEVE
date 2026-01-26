import { 
  Search, 
  Settings, 
  LogOut, 
  Zap, 
  Users, 
  Shield,
  Menu 
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { NotificationDropdown } from './NotificationDropdown';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center w-full md:w-1/3 gap-3">
        <button 
          onClick={onMenuClick}
          title="Ouvrir le menu"
          className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Rechercher..." 
            className="w-full pl-10 pr-4 py-2 text-sm bg-muted/50 border-none rounded-md focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        {/* Mobile Search Icon (optional, just placeholder if needed) */}
      </div>
      
      <div className="flex items-center space-x-2 md:space-x-4">
        <ThemeToggle />
        <NotificationDropdown />
        
        <div className="pl-4 border-l">
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger className="flex items-center space-x-3 outline-none group">
              <div className="text-right hidden md:block group-hover:text-primary transition-colors">
                <p className="text-sm font-medium">veve</p>
                <p className="text-xs text-muted-foreground">codeshester@gmail.com</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors relative">
                <span className="font-bold text-sm">V</span>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background"></span>
              </div>
            </DropdownMenuPrimitive.Trigger>
            
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content 
                className="w-64 bg-card border border-border rounded-xl shadow-xl p-2 z-50 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                align="end"
                sideOffset={8}
              >
                {/* User Info Header */}
                <div className="flex items-start gap-3 p-3 mb-2 bg-muted/30 rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                    <span className="font-bold">V</span>
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-sm truncate">veve</span>
                    <span className="text-xs text-muted-foreground truncate">codeshester@gmail.com</span>
                    <span className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                      En ligne
                    </span>
                  </div>
                </div>

                <DropdownMenuPrimitive.Separator className="h-px bg-border my-1" />

                {/* POS Item - Highlighted */}
                <DropdownMenuPrimitive.Item asChild>
                  <Link 
                    to="/sales" 
                    className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md cursor-pointer outline-none transition-colors my-1"
                  >
                    <Zap className="h-4 w-4 fill-current" />
                    Vente Rapide (POS)
                  </Link>
                </DropdownMenuPrimitive.Item>

                <DropdownMenuPrimitive.Separator className="h-px bg-border my-1" />

                {/* Regular Items */}
                <div className="space-y-1">
                  <DropdownMenuPrimitive.Item asChild>
                    <Link 
                      to="/settings" 
                      state={{ activeTab: 'general' }}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md cursor-pointer outline-none transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Paramètres
                    </Link>
                  </DropdownMenuPrimitive.Item>
                  
                  <DropdownMenuPrimitive.Item asChild>
                    <Link 
                      to="/settings" 
                      state={{ activeTab: 'users' }}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md cursor-pointer outline-none transition-colors"
                    >
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Utilisateurs
                    </Link>
                  </DropdownMenuPrimitive.Item>

                  <DropdownMenuPrimitive.Item asChild>
                    <Link 
                      to="/settings" 
                      state={{ activeTab: 'administration' }}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md cursor-pointer outline-none transition-colors"
                    >
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Administration
                    </Link>
                  </DropdownMenuPrimitive.Item>
                </div>

                <DropdownMenuPrimitive.Separator className="h-px bg-border my-2" />

                {/* Logout */}
                <DropdownMenuPrimitive.Item 
                  onSelect={handleLogout}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive rounded-md cursor-pointer outline-none transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </DropdownMenuPrimitive.Item>

              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>
        </div>
      </div>
    </header>
  );
}
