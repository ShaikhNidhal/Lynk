
"use client";

import React, { useState } from "react";
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
  Loader2
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

const SidebarMock = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  const { user, isUserLoading } = useUser();
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
      <aside className={cn(
        "bg-card border-r transition-all duration-300 flex flex-col z-20 shadow-sm",
        open ? "w-64" : "w-20"
      )}>
        <div className="p-4 flex items-center justify-between">
          <Link href="/dashboard" className={cn("flex items-center gap-2 font-bold text-primary transition-all", !open && "opacity-0 invisible w-0")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-md">
              <FolderKanban className="w-5 h-5" />
            </div>
            <span className="text-xl tracking-tight">SprintFlow</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="hover:bg-primary/10 hover:text-primary">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        
        <nav className="flex-1 p-2 space-y-1">
          <NavItem icon={<LayoutDashboard />} label="Dashboard" href="/dashboard" open={open} />
          <NavItem icon={<FolderKanban />} label="Projects" href="/projects" open={open} />
          <NavItem icon={<Clock />} label="Time Tracking" href="/time" open={open} />
          <NavItem icon={<Users />} label="Team" href="/team" open={open} />
          <div className="pt-4 mt-4 border-t border-border">
            <NavItem icon={<Settings />} label="Settings" href="/settings" open={open} />
          </div>
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn("flex items-center gap-3 w-full hover:bg-secondary/50 p-2 rounded-lg transition-colors group", !open && "justify-center")}>
                <Avatar className="w-8 h-8 border shadow-sm group-hover:border-primary/50 transition-colors">
                  <AvatarImage src={`https://picsum.photos/seed/${user.uid}/100/100`} />
                  <AvatarFallback>{profile?.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                {open && (
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
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, href, open }: { icon: React.ReactNode, label: string, href: string, open: boolean }) => {
  const pathname = usePathname();
  const active = pathname === href;
  
  return (
    <Link 
      href={href}
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
      {open && <span className="font-semibold whitespace-nowrap">{label}</span>}
      {active && open && <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
    </Link>
  );
};

const TopNav = () => {
  return (
    <header className="h-16 border-b bg-card/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center flex-1 max-w-md gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search tasks, projects..." 
            className="pl-9 bg-background border-none focus-visible:ring-primary shadow-inner" 
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
        </Button>
        <Button className="hidden sm:flex gap-2 shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>
    </header>
  );
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarMock>
      <TopNav />
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-background">
        {children}
      </div>
    </SidebarMock>
  );
};
