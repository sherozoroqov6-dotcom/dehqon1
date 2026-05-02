import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Leaf, LayoutDashboard, Microscope, Users } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Mission Control", icon: LayoutDashboard },
    { href: "/analyses", label: "Analyses", icon: Microscope },
    { href: "/users", label: "Farmers", icon: Users },
  ];

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Leaf className="w-6 h-6 text-primary mr-3" />
          <span className="font-mono font-bold tracking-tight text-lg text-primary">AI AGRONOM</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-sm text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest text-center">
            System Online
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center px-6 md:px-8 shrink-0">
          <h1 className="text-lg font-semibold tracking-tight">
            {navItems.find(i => location === i.href || (i.href !== "/" && location.startsWith(i.href)))?.label || "Mission Control"}
          </h1>
        </header>
        <div className="flex-1 overflow-auto p-6 md:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
