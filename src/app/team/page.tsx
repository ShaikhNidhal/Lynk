
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Mail, Shield, Loader2, Users as UsersIcon, Building2, Circle } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, limit, where, doc } from "firebase/firestore";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { MemberDetailsDialog } from "@/components/team/member-details-dialog";
import { cn } from "@/lib/utils";

export default function TeamPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Fetch current user profile
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);

  // 2. Fetch all users to show presence (mimics real-time status feed)
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(100));
  }, [firestore]);
  const { data: allUsers, isLoading: isUsersLoading } = useCollection(usersQuery);

  const filteredMembers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(m => 
      m.role !== "Client" && (
        m.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [allUsers, searchTerm]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              Team Directory
              {profile?.role === 'Admin' && <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px]">Org Admin</Badge>}
            </h1>
            <p className="text-muted-foreground mt-1">Manage workspace participants and real-time availability.</p>
          </div>
          <InviteMemberDialog />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search team by name or email..." 
            className="pl-9 bg-white border-none shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isUsersLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Syncing team directory...</p>
          </div>
        ) : filteredMembers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="glass-card overflow-hidden hover:border-primary/40 transition-all group border-primary/5">
                <CardHeader className="p-0">
                  <div className="h-24 bg-secondary/10 relative">
                    <div className="absolute -bottom-10 left-6">
                      <div className="relative">
                        <Avatar className="w-20 h-20 border-4 border-white shadow-xl">
                          <AvatarImage src={`https://picsum.photos/seed/${member.id}/200/200`} />
                          <AvatarFallback className="text-xl font-bold bg-primary text-white">
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        {/* Real-time Presence Badge */}
                        <div className={cn(
                          "absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white",
                          member.presenceStatus === 'online' ? "bg-green-500" : 
                          member.presenceStatus === 'away' ? "bg-yellow-500" : "bg-gray-300"
                        )} title={member.presenceStatus || 'offline'} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-12 pb-6 px-6">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors truncate">
                        {member.firstName} {member.lastName}
                      </h3>
                      <Badge variant="ghost" className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
                        {member.presenceStatus || 'offline'}
                      </Badge>
                    </div>
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
                      {member.presenceStatus === 'online' ? 'Active now' : `Last seen ${member.lastActive ? 'recently' : 'unknown'}`}
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
            <h3 className="text-xl font-bold text-foreground">Workspace is empty</h3>
            <p className="text-muted-foreground mb-4">Start by inviting your first team member to collaborate.</p>
            <InviteMemberDialog />
          </div>
        )}
      </div>
    </AppShell>
  );
}
