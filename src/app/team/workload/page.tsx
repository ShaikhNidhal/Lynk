
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit, where, collectionGroup } from "firebase/firestore";
import { useMemo } from "react";
import { 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend,
  ComposedChart,
  Line
} from "recharts";
import { 
  Users, 
  Loader2, 
  UserCheck, 
  ShieldAlert
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function TeamWorkloadPage() {
  const { firestore, profile } = useFirebase();

  // 1. Fetch Team Members from current workspace
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "workspaces", profile.currentWorkspaceId, "members"), limit(100));
  }, [firestore, profile?.currentWorkspaceId]);
  
  const { data: members, isLoading: isMembersLoading } = useCollection(membersQuery);

  // 2. Fetch ALL active tasks across the workspace using Collection Group
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collectionGroup(firestore, "tasks"),
      where("workspaceId", "==", profile.currentWorkspaceId),
      where("status", "!=", "done")
    );
  }, [firestore, profile?.currentWorkspaceId]);

  const { data: tasks, isLoading: isTasksLoading } = useCollection(tasksQuery);

  // 3. Process workload analytics
  const workloadData = useMemo(() => {
    if (!members) return [];
    
    return members.map((member) => {
      const activeTasks = tasks?.filter(t => t.assignedToId === member.userId || t.assignedToId === member.id) || [];
      const totalEstimatedHours = activeTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
      
      // Standard capacity logic: 10 tasks or 40 hours
      const capacity = 10; 
      const utilization = (activeTasks.length / capacity) * 100;

      return {
        id: member.userId || member.id,
        name: member.firstName || "Member",
        fullName: `${member.firstName} ${member.lastName}`,
        email: member.email,
        activeTasks: activeTasks.length,
        capacity: capacity,
        allocatedHours: totalEstimatedHours,
        utilization: Math.min(utilization, 100)
      };
    });
  }, [members, tasks]);

  const isLoading = isMembersLoading || isTasksLoading;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Users className="w-8 h-8 text-accent" />
              Resource Allocation
            </h1>
            <p className="text-muted-foreground mt-1">Team capacity vs. active task density across all boards.</p>
          </div>
          <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-accent/20 h-8 px-4 font-bold uppercase tracking-widest text-[10px]">
            Live Organizational Analysis
          </Badge>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Main Workload Chart */}
          <Card className="lg:col-span-2 glass-card border-accent/10">
            <CardHeader>
              <CardTitle className="text-lg">Task Load by Member</CardTitle>
              <CardDescription>Active assignments compared to standard capacity threshold.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--secondary)/0.5)'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Bar name="Active Tasks" dataKey="activeTasks" radius={[4, 4, 0, 0]}>
                      {workloadData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.activeTasks > entry.capacity ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'} 
                        />
                      ))}
                    </Bar>
                    <Line name="Soft Capacity Threshold" type="monotone" dataKey="capacity" stroke="#6b7280" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Overload Alerts */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-destructive" />
                Utilization Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {workloadData.filter(d => d.activeTasks > d.capacity).map((d, i) => (
                  <div key={i} className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{d.name}</span>
                      <Badge variant="destructive" className="text-[9px] uppercase font-bold">Overloaded</Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold uppercase">
                        <span>Utilization</span>
                        <span>{Math.round((d.activeTasks / d.capacity) * 100)}%</span>
                      </div>
                      <Progress value={(d.activeTasks / d.capacity) * 100} className="h-1 bg-white/50" />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Member has {d.activeTasks} active items. Consider reassigning tasks to available team members.</p>
                  </div>
                ))}
                {workloadData.filter(d => d.activeTasks > d.capacity).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground italic text-sm">
                    <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    No capacity warnings found. Team is healthy.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Directory Stats */}
          <Card className="lg:col-span-3 glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Global Availability Hub</CardTitle>
              <CardDescription>Real-time availability status based on current active task distribution.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {workloadData.map(member => (
                  <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:shadow-md transition-all group">
                    <Avatar className="w-10 h-10 border-2 border-primary/5 group-hover:border-primary/20 transition-all">
                      <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
                      <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{member.fullName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[8px] h-4 px-1">{member.activeTasks} Tasks</Badge>
                        <span className={cn("text-[9px] font-bold uppercase tracking-wider", member.activeTasks >= member.capacity ? "text-destructive" : "text-accent")}>
                          {member.activeTasks >= member.capacity ? 'AT CAPACITY' : 'AVAILABLE'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {workloadData.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground italic text-sm">
                    No active workspace members found to analyze.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
