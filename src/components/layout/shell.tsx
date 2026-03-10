
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
  Clock
} from "lucide-react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar-mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Mock implementation of sidebar components since the provided sidebar.tsx is complex
const SidebarMock = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={cn(
        "bg-white border-r transition-all duration-300 flex flex-col",
        open ? "w-64" : "w-20"
      )}>
        <div className="p-4 flex items-center justify-between">
          <Link href="/dashboard" className={cn("flex items-center gap-2 font-bold text-primary transition-all", !open && "opacity-0 invisible w-0")}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <FolderKanban className="w-5 h-5" />
            </div>
            <span className="text-xl tracking-tight">SprintFlow</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
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
          <div className={cn("flex items-center gap-3", !open && "justify-center")}>
            <Avatar className="w-8 h-8">
              <AvatarImage src="https://picsum.photos/seed/user/100/100" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            {open && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">John Doe</span>
                <span className="text-xs text-muted-foreground truncate italic">Project Manager</span>
              </div>
            )}
          </div>
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
        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group",
        active ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary hover:text-primary"
      )}
    >
      <div className={cn("shrink-0 transition-all", active ? "text-white" : "text-muted-foreground group-hover:text-primary")}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      {open && <span className="font-medium whitespace-nowrap">{label}</span>}
    </Link>
  );
};

const TopNav = () => {
  return (
    <header className="h-16 border-b bg-white/50 backdrop-blur-sm px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center flex-1 max-w-md gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks, projects..." className="pl-9 bg-secondary/50 border-none focus-visible:ring-primary" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-white"></span>
        </Button>
        <Button className="hidden sm:flex gap-2">
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
      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {children}
      </div>
    </SidebarMock>
  );
};
