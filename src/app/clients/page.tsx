
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Mail, Building, Loader2, Handshake } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit } from "firebase/firestore";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AddClientDialog } from "@/components/clients/add-client-dialog";

export default function ClientsPage() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(100));
  }, [firestore]);

  const { data: users, isLoading } = useCollection(usersQuery);

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

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Client Management</h1>
            <p className="text-muted-foreground mt-1">Manage external stakeholders and project reviewers.</p>
          </div>
          <AddClientDialog />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search clients by name or email..." 
            className="pl-9 bg-white border-none shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading client database...</p>
          </div>
        ) : filteredClients.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="glass-card overflow-hidden hover:border-primary/40 transition-all group border-primary/5">
                <CardHeader className="p-0">
                  <div className="h-24 bg-accent/10 relative">
                    <div className="absolute -bottom-10 left-6">
                      <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
                        <AvatarImage src={`https://picsum.photos/seed/client-${client.id}/200/200`} />
                        <AvatarFallback className="text-xl font-bold bg-accent text-white">
                          {client.firstName?.[0]}{client.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-12 pb-6 px-6">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-accent transition-colors">
                      {client.firstName} {client.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Mail className="w-3 h-3 text-accent" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white/50 text-[10px] font-bold uppercase tracking-wider py-0.5 border-accent/10">
                      <Building className="w-3 h-3 mr-1 text-accent" />
                      External Partner
                    </Badge>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">
                      Active Portal
                    </div>
                    <Button variant="ghost" size="sm" className="text-[10px] h-7 font-bold uppercase tracking-wider hover:text-accent hover:bg-accent/5">
                      Client Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-border">
            <Handshake className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No clients found</h3>
            <p className="text-muted-foreground mb-4">Onboard your first external stakeholder to get started.</p>
            <AddClientDialog />
          </div>
        )}
      </div>
    </AppShell>
  );
}
