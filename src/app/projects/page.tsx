
"use client";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, MoreHorizontal, Users, Calendar, Loader2, FolderKanban } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { useUser, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { format } from "date-fns";
import { useState } from "react";

export default function ProjectsPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    // Query projects where the user is a member (the members map contains their UID)
    // Note: We're using a structured query that matches our security rules philosophy
    return query(
      collection(firestore, "projects"),
      where(`members.${user.uid}`, "!=", null),
      orderBy(`members.${user.uid}`), // Dummy sort to satisfy compound query requirements if needed
      orderBy("createdAt", "desc")
    );
  }, [firestore, user?.uid]);

  const { data: projects, isLoading } = useCollection(projectsQuery);

  const filteredProjects = projects?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your team's agile and kanban workflows.</p>
          </div>
          <CreateProjectDialog />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects..." 
              className="pl-9 bg-white border-none shadow-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="gap-2 bg-white">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading your projects...</p>
          </div>
        ) : filteredProjects && filteredProjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="group overflow-hidden glass-card hover:border-primary/50 transition-all duration-300">
                <div className="relative h-48 w-full overflow-hidden bg-secondary/20">
                  <Image 
                    src={`https://picsum.photos/seed/${project.id}/600/400`} 
                    alt={project.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    data-ai-hint="project dashboard"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-white/90 backdrop-blur-sm text-primary hover:bg-white">
                      {project.type}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      <span>{Object.keys(project.members || {}).length} members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{project.createdAt?.seconds ? format(new Date(project.createdAt.seconds * 1000), "MMM d, yyyy") : "Just now"}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/30 p-4 border-t border-border">
                  <Button variant="link" className="p-0 h-auto text-primary font-semibold group-hover:underline" asChild>
                    <Link href={`/projects/${project.id}`}>
                      Go to board
                    </Link>
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                     <div className={project.status === 'Active' ? 'h-2 w-2 rounded-full bg-green-500' : 'h-2 w-2 rounded-full bg-orange-500'}></div>
                     <span className="text-xs font-medium uppercase text-muted-foreground tracking-widest">{project.status}</span>
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
            <CreateProjectDialog />
          </div>
        )}
      </div>
    </AppShell>
  );
}
