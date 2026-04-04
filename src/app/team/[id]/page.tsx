"use client";

import { AppShell } from "@/components/layout/shell";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where, collectionGroup, limit, orderBy } from "firebase/firestore";
import { use, useMemo } from "react";
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Clock, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle,
  ArrowLeft,
  Loader2,
  Phone,
  Globe,
  MessageSquare,
  ExternalLink,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: memberId } = use(params);
  const { firestore, profile: currentProfile } = useFirebase();

  // 1. Fetch Member Profile
  const memberRef = useMemoFirebase(() => {
    if (!firestore || !memberId) return null;
    return doc(firestore, "users", memberId);
  }, [firestore, memberId]);
  const { data: member, isLoading: isMemberLoading } = useDoc(memberRef);

  // 2. Fetch Member's Active Tasks across all projects
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !memberId || !currentProfile?.currentWorkspaceId) return null;
    return query(
      collectionGroup(firestore, "tasks"),
      where("workspaceId", "==", currentProfile.currentWorkspaceId),
      where("assignedToId", "==", memberId),
      limit(50)
    );
  }, [firestore, memberId, currentProfile?.currentWorkspaceId]);
  const { data: tasks, isLoading: isTasksLoading } = useCollection(tasksQuery);

  // 3. Process Analytics
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, inProgress: 0, priority: 0 };
    const completed = tasks.filter(t => t.status === 'done').length;
    const highPriority = tasks.filter(t => t.priority === 'High' || t.priority === 'Critical').length;
    return {
      total: tasks.length,
      completed,
      inProgress: tasks.length - completed,
      priority: highPriority,
      rate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0
    };
  }, [tasks]);

  if (isMemberLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!member) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <User className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Member not found</h2>
          <Button asChild variant="link" className="mt-4">
            <Link href="/team">Back to Directory</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const isSelf = memberId === currentProfile?.id;

  return (
    <AppShell>
      <div className="space-y-8 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/team"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Member Profile</h1>
            <p className="text-muted-foreground text-sm italic">Organizational impact and performance metrics.</p>
          </div>
          {isSelf && (
            <Button size="sm" asChild className="gap-2">
              <Link href="/settings"><Briefcase className="w-4 h-4" /> Edit My Profile</Link>
            </Button>
          )}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Personal Info Sidebar */}
          <div className="space-y-6">
            <Card className="glass-card overflow-hidden">
              <div className="h-32 bg-primary/5 relative">
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                  <div className="relative">
                    <Avatar className="w-24 h-24 border-4 border-white shadow-2xl">
                      <AvatarImage src={member.profilePictureUrl || `https://picsum.photos/seed/${memberId}/200/200`} />
                      <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                        {member.firstName?.[0]}{member.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-white",
                      member.presenceStatus === 'online' ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                  </div>
                </div>
              </div>
              <CardContent className="pt-16 text-center space-y-4">
                <div>
                  <h2 className="text-xl font-bold">{member.firstName} {member.lastName}</h2>
                  <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">{member.role || 'Contributor'}</p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="secondary" className="gap-1.5 h-6 text-[10px] uppercase font-bold">
                    <Globe className="w-3 h-3" /> {member.timezone || 'UTC+0'}
                  </Badge>
                  <Badge variant="outline" className={cn(
                    "gap-1.5 h-6 text-[10px] uppercase font-bold",
                    member.presenceStatus === 'online' ? "text-green-600 bg-green-50 border-green-200" : "text-muted-foreground"
                  )}>
                    {member.presenceStatus || 'Offline'}
                  </Badge>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-3 text-left">
                  <ProfileInfoRow icon={<Mail className="w-3.5 h-3.5 text-primary" />} label="Email" value={member.email} />
                  {member.phoneNumber && <ProfileInfoRow icon={<Phone className="w-3.5 h-3.5 text-primary" />} label="Phone" value={member.phoneNumber} />}
                  <ProfileInfoRow 
                    icon={<Clock className="w-3.5 h-3.5 text-primary" />} 
                    label="Last Active" 
                    value={member.lastActive?.seconds ? format(new Date(member.lastActive.seconds * 1000), "MMM d, h:mm a") : "Recently"} 
                  />
                </div>

                <Button variant="outline" className="w-full gap-2 text-xs font-bold uppercase" asChild>
                  <a href={`mailto:${member.email}`}><MessageSquare className="w-3.5 h-3.5" /> Direct Message</a>
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Competency Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase">
                    <span>Task Completion</span>
                    <span>{stats.rate}%</span>
                  </div>
                  <Progress value={stats.rate} className="h-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-center">
                    <p className="text-2xl font-black text-primary">{stats.completed}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Solved</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent/5 border border-accent/10 text-center">
                    <p className="text-2xl font-black text-accent">{stats.inProgress}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="bg-secondary/10 p-1">
                <TabsTrigger value="active" className="gap-2">
                  <Target className="w-4 h-4" /> Active Delivery
                </TabsTrigger>
                <TabsTrigger value="projects" className="gap-2">
                  <Briefcase className="w-4 h-4" /> Board Context
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="glass-card border-l-4 border-l-orange-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">High Priority</p>
                          <p className="text-2xl font-black">{stats.priority}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-orange-500/20" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="glass-card border-l-4 border-l-green-500">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Completed Items</p>
                          <p className="text-2xl font-black">{stats.completed}</p>
                        </div>
                        <CheckCircle2 className="w-8 h-8 text-green-500/20" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Assignment Backlog</CardTitle>
                    <CardDescription>Live tasks assigned to {member.firstName} across the organization.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isTasksLoading ? (
                      <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
                    ) : tasks && tasks.length > 0 ? (
                      <div className="space-y-3">
                        {tasks.filter(t => t.status !== 'done').slice(0, 10).map(task => (
                          <div key={task.id} className="p-4 rounded-xl border border-border bg-white hover:border-primary/30 transition-all group flex items-center justify-between">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{task.title}</h4>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                {task.priority} • {task.status.replace('-', ' ')}
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="h-8 text-[10px] uppercase font-bold gap-1.5">
                              <Link href={`/projects/${task.projectId}?task=${task.id}`}>
                                View <ExternalLink className="w-3 h-3" />
                              </Link>
                            </Button>
                          </div>
                        ))}
                        {tasks.filter(t => t.status !== 'done').length > 10 && (
                          <p className="text-center text-[10px] text-muted-foreground font-bold uppercase pt-2">
                            + {tasks.filter(t => t.status !== 'done').length - 10} more active items
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-secondary/5 rounded-xl border-2 border-dashed">
                        <CheckCircle2 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground italic">No active assignments found.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="mt-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Contributing Boards</CardTitle>
                    <CardDescription>Projects where {member.firstName} has active memberships.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12 opacity-40 italic text-sm border-2 border-dashed rounded-xl">
                      <Briefcase className="w-10 h-10 mx-auto mb-2" />
                      Detailed board participation history coming soon.
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ProfileInfoRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
        {icon} {label}
      </span>
      <span className="text-xs font-semibold text-foreground truncate">{value}</span>
    </div>
  );
}
