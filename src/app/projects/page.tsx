
"use client";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, MoreHorizontal, Users, Calendar, Loader2, FolderKanban, Building2, BarChart2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc, serverTimestamp } from "firebase/firestore";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function ProjectsPage() {
  const { user, profile, firestore, isUserLoading: isProfileLoading } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || isProfileLoading || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "projects"),
      where("workspaceId", "==", profile.currentWorkspaceId)
    );
  }, [firestore, user?.uid, profile?.currentWorkspaceId, isProfileLoading]);

  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  const isLoading = isProfileLoading || isProjectsLoading;

  const processedProjects = useMemo(() => {
    if (!projects) return [];
    
    return projects.filter(p => {
      const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [projects, searchTerm, statusFilter]);

  const role = profile?.role || "Team Member";
  const isAdmin = role === 'Admin';
  const isManager = role === 'Project Manager';

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Projects
              {isAdmin && (
                <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">Admin View</Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">Manage your team's agile and kanban workflows.</p>
          </div>
          {(isAdmin || isManager) && <CreateProjectDialog />}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects or clients..." 
              className="pl-9 bg-white border-none shadow-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white border-none shadow-sm">
              <Filter className="w-4 h-4 mr-2 opacity-50" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Planning">Planning</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="On Hold">On Hold</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading projects...</p>
          </div>
        ) : processedProjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {processedProjects.map((project) => (
              <Card key={project.id} className="group overflow-hidden glass-card hover:border-primary/50 transition-all duration-300 flex flex-col">
                <div className="relative h-48 w-full overflow-hidden bg-secondary/20">
                  <Image 
                    src={`https://picsum.photos/seed/${project.id}/600/400`} 
                    alt={project.name || "Project"}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    data-ai-hint="project dashboard"
                  />
                  <div className="absolute top-4 right-4 flex gap-2">
                    <Badge className="bg-white/90 backdrop-blur-sm text-primary hover:bg-white border-none">
                      {project.type}
                    </Badge>
                    <Badge variant={project.healthStatus === 'Good' ? 'default' : 'destructive'} className="border-none uppercase text-[9px] font-bold">
                      {project.healthStatus || 'Good'}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors truncate">
                      {project.name}
                    </h3>
                    <DropdownMenuActions project={project} isAdmin={isAdmin} />
                  </div>
                  {project.companyName && (
                    <p className="text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-1.5">
                      <Building2 className="w-3 h-3" /> {project.companyName}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {project.description}
                  </p>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{Object.keys(project.members || {}).length} members</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{project.targetEndDate ? format(new Date(project.targetEndDate), "MMM d") : "No end date"}</span>
                      </div>
                    </div>
                    {project.budget && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                          <span>Budget Spent</span>
                          <span>${(project.budgetSpent || 0).toLocaleString()} / ${project.budget.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500" 
                            style={{ width: `${Math.min(((project.budgetSpent || 0) / project.budget) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/30 p-4 border-t border-border mt-auto">
                  <Button variant="link" className="p-0 h-auto text-primary font-bold uppercase text-[10px] tracking-widest group-hover:underline" asChild>
                    <Link href={`/projects/${project.id}`}>
                      Open Dashboard <BarChart2 className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                     <div className={cn("h-2 w-2 rounded-full", project.status === 'Active' ? 'bg-green-500' : 'bg-orange-500')}></div>
                     <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{project.status}</span>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-border">
            <FolderKanban className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No projects found</h3>
            <p className="text-muted-foreground mb-8">You haven't been assigned to any projects yet or your search matched nothing.</p>
            {(isAdmin || isManager) && <CreateProjectDialog />}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function DropdownMenuActions({ project, isAdmin }: { project: any, isAdmin: boolean }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const handleArchive = () => {
    if (!firestore || !isAdmin) return;
    if (confirm(`Are you sure you want to archive ${project.name}?`)) {
      updateDocumentNonBlocking(doc(firestore, "projects", project.id), {
        status: "Cancelled",
        updatedAt: serverTimestamp()
      });
      toast({ title: "Project Archived" });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/projects/${project.id}`}>View Board</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleArchive}>
              Archive Project
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
