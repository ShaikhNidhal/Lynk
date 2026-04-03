"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Mail, Shield, Loader2, Users as UsersIcon } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, limit } from "firebase/firestore";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { MemberDetailsDialog } from "@/components/team/member-details-dialog";

export default function TeamPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(100));
  }, [firestore]);

  const { data: users, isLoading } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    // Filter out Clients from the Team Directory
    return users.filter(u => 
      u.role !== "Client" && (
        u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [users, searchTerm]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Directory</h1>
            <p className="text-muted-foreground mt-1">View and manage your organization's internal members.</p>
          </div>
          <InviteMemberDialog />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, or role..." 
            className="pl-9 bg-white border-none shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading team members...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredUsers.map((member) => (
              <Card key={member.id} className="glass-card overflow-hidden hover:border-primary/40 transition-all group border-primary/5">
                <CardHeader className="p-0">
                  <div className="h-24 bg-secondary/10 relative">
                    <div className="absolute -bottom-10 left-6">
                      <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
                        <AvatarImage src={`https://picsum.photos/seed/${member.id}/200/200`} />
                        <AvatarFallback className="text-xl font-bold bg-primary text-white">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-12 pb-6 px-6">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
                      {member.firstName} {member.lastName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Mail className="w-3 h-3 text-primary" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="outline" className="bg-white/50 text-[10px] font-bold uppercase tracking-wider py-0.5 border-primary/10">
                      <Shield className="w-3 h-3 mr-1 text-primary" />
                      {member.role || "Member"}
                    </Badge>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest italic">
                      Since {member.createdAt?.seconds ? new Date(member.createdAt.seconds * 1000).getFullYear() : '2024'}
                    </div>
                    <MemberDetailsDialog memberId={member.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-border">
            <UsersIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No members found</h3>
            <p className="text-muted-foreground mb-4">Try adjusting your search or inviting new members to the team.</p>
            <InviteMemberDialog />
          </div>
        )}
      </div>
    </AppShell>
  );
}
