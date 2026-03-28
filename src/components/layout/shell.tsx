
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
  Zap
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-2", className)}>
    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-md shadow-primary/20">
      <Zap className="w-5 h-5 fill-current" />
    </div>
    <span className="text-xl font-bold tracking-tight text-foreground">Lynk</span>
  </div>
);

const NavContent = ({ open, setMobileOpen }: { open: boolean, setMobileOpen?: (open: boolean) => void }) => {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const router = useRouter();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  
  const { data: profile } = useDoc(userProfileRef);

  const handleLogout = async () => {
    const { auth } = await import("@/firebase").then(m => m.initializeFirebase());
    await signOut(auth);
    router.push("/login");
  };

  const onItemClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 mb-4">
        <Link href="/dashboard" onClick={onItemClick} className={cn("flex items-center gap-2 transition-all", !open && "opacity-0 invisible w-0 lg:opacity-100 lg:visible lg:w-auto")}>
          <Logo />
        </Link>
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        <NavItem icon={<LayoutDashboard />} label="Dashboard" href="/dashboard" open={open} onClick={onItemClick} />
        <NavItem icon={<FolderKanban />} label="Projects" href="/projects" open={open} onClick={onItemClick} />
        <NavItem icon={<Clock />} label="Time Tracking" href="/time" open={open} onClick={onItemClick} />
        <NavItem icon={<Users />} label="Team" href="/team" open={open} onClick={onItemClick} />
        <div className="pt-4 mt-4 border-t border-border">
          <NavItem icon={<Settings />} label="Settings" href="/settings" open={open} onClick={onItemClick} />
        </div>
      </nav>

      <div className="p-4 border-t border-border mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn("flex items-center gap-3 w-full hover:bg-secondary/50 p-2 rounded-lg transition-colors group", !open && "lg:justify-center")}>
              <Avatar className="w-8 h-8 border shadow-sm group-hover:border-primary/50 transition-colors">
                <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/100/100`} />
                <AvatarFallback>{profile?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              {(open || setMobileOpen) && (
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="text-sm font-semibold truncate text-foreground">{profile?.firstName} {profile?.lastName}</span>
                  <span className="text-[10px] text-primary/80 truncate italic uppercase font-bold tracking-wider">{profile?.role || "Guest"}</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass-card">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, href, open, onClick }: { icon: React.ReactNode, label: string, href: string, open: boolean, onClick?: () => void }) => {
  const pathname = usePathname();
  const active = pathname === href;
  
  return (
    <Link 
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative",
        active 
          ? "bg-primary text-white shadow-md shadow-primary/20" 
          : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
      )}
    >
      <div className={cn("shrink-0 transition-all", active ? "text-white" : "text-muted-foreground group-hover:text-primary")}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      {(open || onClick) && <span className="font-semibold whitespace-nowrap">{label}</span>}
      {active && open && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
    </Link>
  );
};

const TopNav = ({ onMenuClick }: { onMenuClick: () => void }) => {
  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center flex-1 max-w-md gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks, projects..." 
            className="pl-9 bg-background border-none focus-visible:ring-primary shadow-inner" 
          />
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBell />
        <CreateProjectDialog 
          trigger={
            <Button size="sm" className="gap-2 shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4" />
              <span className="hidden xs:inline">New Project</span>
            </Button>
          }
        />
      </div>
    </header>
  );
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  if (isUserLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex bg-card border-r transition-all duration-300 flex-col z-20 shadow-sm",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-4 flex items-center justify-end">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-primary/10 hover:text-primary">
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        <NavContent open={sidebarOpen} />
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72">
          <NavContent open={true} setMobileOpen={setMobileOpen} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 flex flex-col overflow-hidden">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth bg-background">
          {children}
        </div>
      </main>
    </div>
  );
};
