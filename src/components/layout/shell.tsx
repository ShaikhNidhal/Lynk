
"use client";

import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Settings, 
  Bell, 
  Search, 
  LogOut, 
  Menu, 
  X, 
  Plus,
  Clock,
  Loader2,
  Handshake,
  Building2,
  LineChart,
  Briefcase,
  ChevronDown,
  Target,
  Zap,
  BarChart2,
  Contact as ContactIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useFirebase, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc } from "firebase/firestore";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";

const LogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn("w-full h-full", className)}>
    <rect x="3" y="3" width="26" height="26" rx="2" stroke="currentColor" strokeWidth="3.5" />
    <path d="M10 11L16 16L10 21" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="18" y1="21" x2="24" y2="21" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

const NavContent = ({ open, setMobileOpen }: { open: boolean, setMobileOpen?: (open: boolean) => void }) => {
  const { user, profile } = useFirebase();
  const router = useRouter();
  const pathname = usePathname();
  const [crmOpen, setCrmOpen] = useState(pathname.startsWith('/crm'));
  const [analyticsOpen, setAnalyticsOpen] = useState(pathname.includes('dashboard') || pathname.includes('workload'));

  const handleLogout = async () => {
    const { auth } = await import("@/firebase").then(m => m.initializeFirebase());
    await signOut(auth);
    router.push("/login");
  };

  const onItemClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const role = profile?.role || "Team Member";
  const isAdmin = role === 'Admin';
  const isManager = role === 'Project Manager';
  const isClient = role === 'Client';

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 mb-4">
        <Link href="/dashboard" onClick={onItemClick} className={cn("flex items-center gap-2", !open && "lg:justify-center")}>
          <div className="w-8 h-8 text-primary shrink-0"><LogoIcon /></div>
          {open && <span className="text-xl font-bold tracking-tight text-foreground">Lynk</span>}
        </Link>
      </div>
      
      <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
        <NavItem icon={<LayoutDashboard />} label="Dashboard" href="/dashboard" open={open} onClick={onItemClick} />
        
        {(isAdmin || isManager) && (
          <Collapsible open={crmOpen && open} onOpenChange={setCrmOpen} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className={cn("w-full justify-between px-3 py-2.5 h-auto text-muted-foreground hover:text-primary", !open && "justify-center")}>
                <div className="flex items-center gap-3">
                  <LineChart className="w-5 h-5" />
                  {open && <span className="font-semibold">CRM Hub</span>}
                </div>
                {open && <ChevronDown className={cn("w-4 h-4 transition-transform", crmOpen && "rotate-180")} />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1 pl-4">
              <NavItem icon={<Target />} label="Revenue Dash" href="/crm/dashboard" open={open} onClick={onItemClick} sub />
              <NavItem icon={<Briefcase />} label="Pipelines" href="/crm/pipeline" open={open} onClick={onItemClick} sub />
              <NavItem icon={<Building2 />} label="Companies" href="/crm/companies" open={open} onClick={onItemClick} sub />
              <NavItem icon={<ContactIcon />} label="Contacts" href="/crm/contacts" open={open} onClick={onItemClick} sub />
            </CollapsibleContent>
          </Collapsible>
        )}

        <NavItem icon={<FolderKanban />} label="Projects" href="/projects" open={open} onClick={onItemClick} />
        
        {!isClient && (
          <NavItem icon={<Clock />} label="Time Tracking" href="/time" open={open} onClick={onItemClick} />
        )}
        
        {(isAdmin || isManager) && (
          <Collapsible open={analyticsOpen && open} onOpenChange={setAnalyticsOpen} className="w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className={cn("w-full justify-between px-3 py-2.5 h-auto text-muted-foreground hover:text-primary", !open && "justify-center")}>
                <div className="flex items-center gap-3">
                  <BarChart2 className="w-5 h-5" />
                  {open && <span className="font-semibold">Analytics</span>}
                </div>
                {open && <ChevronDown className={cn("w-4 h-4 transition-transform", analyticsOpen && "rotate-180")} />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 mt-1 pl-4">
              <NavItem icon={<Zap />} label="Team Workload" href="/team/workload" open={open} onClick={onItemClick} sub />
              {!isClient && <NavItem icon={<Users />} label="Directory" href="/team" open={open} onClick={onItemClick} sub />}
            </CollapsibleContent>
          </Collapsible>
        )}

        {(isAdmin || isManager) && (
          <NavItem icon={<Handshake />} label="Client Portal" href="/clients" open={open} onClick={onItemClick} />
        )}
        
        <div className="pt-4 mt-4 border-t border-border">
          <NavItem icon={<Settings />} label="Settings" href="/settings" open={open} onClick={onItemClick} />
        </div>
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("flex items-center gap-3 w-full hover:bg-secondary/50 p-2 rounded-lg transition-colors group", !open && "lg:justify-center")}>
              <Avatar className="w-8 h-8 border shadow-sm group-hover:border-primary/50 transition-colors">
                <AvatarImage src={profile?.profilePictureUrl || `https://picsum.photos/seed/${user?.uid}/100/100`} />
                <AvatarFallback>{profile?.firstName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              {open && (
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-sm font-semibold truncate text-foreground">{profile?.firstName || "User"}</span>
                  <span className="text-[10px] text-primary/80 truncate italic uppercase font-bold tracking-wider">{profile?.role || "Guest"}</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card">
            <DropdownMenuItem asChild>
              <Link href="/settings">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, href, open, onClick, sub }: { icon: React.ReactNode, label: string, href: string, open: boolean, onClick?: () => void, sub?: boolean }) => {
  const pathname = usePathname();
  const active = pathname === href;
  
  return (
    <Link 
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
        active 
          ? "bg-primary text-white shadow-md" 
          : "text-muted-foreground hover:bg-primary/5 hover:text-primary",
        sub && "py-1.5"
      )}
    >
      <div className={cn("shrink-0 transition-all", active ? "text-white" : "text-muted-foreground group-hover:text-primary")}>
        {React.cloneElement(icon as React.ReactElement, { className: sub ? "w-4 h-4" : "w-5 h-5" })}
      </div>
      {open && <span className={cn("font-semibold whitespace-nowrap", sub ? "text-xs" : "text-sm")}>{label}</span>}
      {active && open && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
    </Link>
  );
};

const TopNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const { profile } = useFirebase();
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const isAdmin = profile?.role === 'Admin';
  const isManager = profile?.role === 'Project Manager';

  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center flex-1 max-w-md gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        <form onSubmit={handleSearch} className="relative w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search organizational vault..." 
            className="pl-9 bg-background border-none shadow-inner" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </form>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        {(isAdmin || isManager) && (
          <CreateProjectDialog trigger={<Button size="sm" className="gap-2 shadow-lg bg-primary"><Plus className="w-4 h-4" /><span className="hidden xs:inline">New Project</span></Button>} />
        )}
      </div>
    </header>
  );
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) return <div className="h-screen w-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={cn("hidden lg:flex bg-card border-r transition-all duration-300 flex-col z-20", sidebarOpen ? "w-64" : "w-20")}>
        <div className="p-4 flex items-center justify-end">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</Button>
        </div>
        <NavContent open={sidebarOpen} />
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Access your dashboard, projects, and organizational analytics.</SheetDescription>
          </SheetHeader>
          <NavContent open={true} setMobileOpen={setMobileOpen} />
        </SheetContent>
      </Sheet>
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">{children}</div>
      </main>
    </div>
  );
};
