"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit } from "firebase/firestore";
import { useMemo } from "react";
import { 
  BarChart, 
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
  Zap, 
  Loader2, 
  UserCheck, 
  Clock, 
  ShieldAlert,
  Briefcase
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function TeamWorkloadPage() {
  const { firestore } = useFirebase();

  // Fetch Team Members
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "users"), limit(50));
  }, [firestore]);
  const { data: users, isLoading } = useCollection(usersQuery);

  const teamMembers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.role !== "Client");
  }, [users]);

  // Mock workload data for demonstration
  // In a real app, you would fetch tasks per user across the workspace
  const workloadData = useMemo(() => {
    return teamMembers.map((member, idx) => ({
      name: member.firstName || "Member",
      activeTasks: [4, 7, 2, 9, 12, 5, 3][idx % 7],
      capacity: 10,
      allocatedHours: [20, 35, 10, 45, 50, 25, 15][idx % 7],
      utilization: [20, 35, 10, 45, 50, 25, 15][idx % 7] / 40 * 100
    }));
  }, [teamMembers]);

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
            <p className="text-muted-foreground mt-1">Team capacity vs. active task density.</p>
          </div>
          <Badge className="bg-accent/10 text-accent hover:bg-accent/20 border-accent/20 h-8 px-4 font-bold uppercase tracking-widest text-[10px]">
            Live Utilization Analysis
          </Badge>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Main Workload Chart */}
          <Card className="lg:col-span-2 glass-card border-accent/10">
            <CardHeader>
              <CardTitle className="text-lg">Task Load by Member</CardTitle>
              <CardDescription>Active assignments compared to standard capacity (10 tasks).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip cursor={{fill: 'hsl(var(--secondary)/0.5)'}} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar name="Active Tasks" dataKey="activeTasks" radius={[4, 4, 0, 0]}>
                      {workloadData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.activeTasks > entry.capacity ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'} 
                        />
                      ))}
                    </Bar>
                    <Line name="Capacity Threshold" type="monotone" dataKey="capacity" stroke="#6b7280" strokeDasharray="5 5" />
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
                        <span>{Math.round(d.utilization)}%</span>
                      </div>
                      <Progress value={d.utilization} className="h-1 bg-white/50" />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Consider reassigning 2-3 high-priority items to available members.</p>
                  </div>
                ))}
                {workloadData.filter(d => d.activeTasks > d.capacity).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground italic text-sm">
                    <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    No capacity warnings found.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Team Directory Stats */}
          <Card className="lg:col-span-3 glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Global Availability Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {teamMembers.map(member => {
                  const data = workloadData.find(d => d.name === member.firstName) || { activeTasks: 0, utilization: 0 };
                  return (
                    <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-white hover:shadow-md transition-all">
                      <Avatar className="w-10 h-10 border-2 border-primary/5">
                        <AvatarImage src={`https://picsum.photos/seed/${member.id}/100/100`} />
                        <AvatarFallback>{member.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{member.firstName} {member.lastName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[8px] h-4 px-1">{data.activeTasks} Tasks</Badge>
                          <span className={cn("text-[9px] font-bold uppercase", data.activeTasks > 10 ? "text-destructive" : "text-accent")}>
                            {data.activeTasks > 10 ? 'At Risk' : 'Available'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
