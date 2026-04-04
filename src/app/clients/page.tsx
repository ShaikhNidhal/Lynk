
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, Mail, Building, Loader2, Handshake, ExternalLink, FolderKanban, UserCog } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, limit, where, doc } from "firebase/firestore";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AddClientDialog } from "@/components/clients/add-client-dialog";
import { EditClientDialog } from "@/components/clients/edit-client-dialog";
import { Input as CustomInput } from "@/components/ui/input";
import Link from "next/link";

export default function ClientsPage() {
  const { user, profile, firestore, isUserLoading: isProfileLoading } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");

  // 2. Fetch all users to identify Clients - global read allowed by rules
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(100));
  }, [firestore]);
  const { data: users, isLoading: isUsersLoading } = useCollection(usersQuery);

  // 3. Fetch projects to map them to clients - scoped to current workspace
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || isProfileLoading || !profile?.currentWorkspaceId) return null;
    
    const projectsRef = collection(firestore, "projects");
    
    // Admins see all in workspace, members see joined. 
    // Both satisfy the rule: isWorkspaceMember(resource.data.workspaceId)
    return query(
      projectsRef,
      where("workspaceId", "==", profile.currentWorkspaceId)
    );
  }, [firestore, user?.uid, profile?.currentWorkspaceId, isProfileLoading]);
  
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  const isLoading = isProfileLoading || isUsersLoading || isProjectsLoading;

  const filteredClients = useMemo(() => {
    if (!users) return [];
    return users.filter(u => 
      u.role === "Client" && (
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [users, searchTerm]);

  // Helper to get projects for a specific client
  const getClientProjects = (clientId: string) => {
    if (!projects) return [];
    return projects.filter(p => p.members && p.members[clientId]);
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Client Management
              {profile?.role === 'Admin' && <Badge variant="outline" className="bg-primary/5 text-primary">Admin Override</Badge>}
            </h1>
            <p className="text-muted-foreground mt-1">Manage external stakeholders and track their project engagement.</p>
          </div>
          <AddClientDialog />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <CustomInput 
            placeholder="Search clients by name or email..." 
            className="pl-9 bg-white border-none shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading client and project data...</p>
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredClients.map((client) => {
              const clientProjects = getClientProjects(client.id);
              return (
                <Card key={client.id} className="glass-card overflow-hidden hover:border-primary/40 transition-all group border-primary/5">
                  <CardHeader className="p-0">
                    <div className="h-20 bg-accent/5 relative">
                      <div className="absolute -bottom-8 left-6">
                        <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                          <AvatarImage src={`https://picsum.photos/seed/client-${client.id}/200/200`} />
                          <AvatarFallback className="text-lg font-bold bg-accent text-white">
                            {client.firstName?.[0]}{client.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="absolute top-2 right-2">
                        <EditClientDialog 
                          client={client} 
                          trigger={
                            <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <UserCog className="w-3.5 h-3.5 text-accent" />
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-10 pb-6 px-6">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-foreground leading-tight group-hover:text-accent transition-colors">
                        {client.firstName} {client.lastName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                        <Mail className="w-3 h-3 text-accent" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Badge variant="outline" className="bg-white/50 text-[9px] font-bold uppercase tracking-wider py-0.5 border-accent/10">
                        <Building className="w-3 h-3 mr-1 text-accent" />
                        Client Role
                      </Badge>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span>Active Projects</span>
                        <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">{clientProjects.length}</Badge>
                      </div>
                      
                      <div className="space-y-1.5">
                        {clientProjects.length > 0 ? (
                          clientProjects.slice(0, 3).map(project => (
                            <Link 
                              key={project.id} 
                              href={`/projects/${project.id}`}
                              className="flex items-center justify-between p-2 rounded-md bg-white/40 border border-transparent hover:border-accent/20 hover:bg-white transition-all group/project"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FolderKanban className="w-3 h-3 text-accent shrink-0" />
                                <span className="text-[11px] font-medium truncate">{project.name}</span>
                              </div>
                              <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover/project:opacity-100 transition-opacity" />
                            </Link>
                          ))
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic py-2">No projects assigned yet.</p>
                        )}
                        {clientProjects.length > 3 && (
                          <p className="text-[10px] text-accent font-bold text-center pt-1">
                            + {clientProjects.length - 3} more projects
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                      <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest italic">
                        External Portal
                      </div>
                      <EditClientDialog client={client} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-border">
            <Handshake className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No clients found</h3>
            <p className="text-muted-foreground mb-4">Onboard your first external stakeholder to start collaborative project management.</p>
            <AddClientDialog />
          </div>
        )}
      </div>
    </AppShell>
  );
}
