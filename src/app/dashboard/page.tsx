"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  ArrowRight,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser, useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";

const workloadData = [
  { name: "Alice", tasks: 8, capacity: 10 },
  { name: "Bob", tasks: 12, capacity: 10 },
  { name: "Charlie", tasks: 5, capacity: 10 },
  { name: "Diana", tasks: 9, capacity: 10 },
  { name: "Ethan", tasks: 15, capacity: 10 },
];

export default function DashboardPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);

  const { data: profile, isLoading } = useDoc(userProfileRef);

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {profile?.firstName || "User"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Role: <span className="font-semibold text-primary">{profile?.role || "Not Assigned"}</span> • Here&apos;s what&apos;s happening across your projects today.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Projects" 
            value="12" 
            description="+2 from last month" 
            icon={<FolderCheckIcon />} 
          />
          <StatCard 
            title="Active Tasks" 
            value="48" 
            description="12 due this week" 
            icon={<Clock className="text-blue-500" />} 
          />
          <StatCard 
            title="Completed" 
            value="156" 
            description="85% success rate" 
            icon={<CheckCircle2 className="text-green-500" />} 
          />
          <StatCard 
            title="Critical Issues" 
            value="3" 
            description="Needs immediate attention" 
            icon={<AlertCircle className="text-destructive" />} 
          />
        </div>

        <div className="grid gap-6 md:grid-cols-7">
          {/* Workload Visualization */}
          <Card className="md:col-span-4 glass-card">
            <CardHeader>
              <CardTitle>Team Workload</CardTitle>
              <CardDescription>Visualizing task allocation vs capacity (10 tasks/week)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="tasks" radius={[4, 4, 0, 0]}>
                      {workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.tasks > entry.capacity ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Projects */}
          <Card className="md:col-span-3 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Active Projects</CardTitle>
                <CardDescription>Track project velocity and health</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects" className="text-primary hover:underline flex items-center gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <ProjectProgress 
                name="Mobile App Redesign" 
                progress={75} 
                status="Healthy" 
              />
              <ProjectProgress 
                name="Cloud Migration" 
                progress={45} 
                status="At Risk" 
                variant="destructive"
              />
              <ProjectProgress 
                name="Q3 Marketing Campaign" 
                progress={90} 
                status="Ahead" 
              />
              <ProjectProgress 
                name="Security Audit" 
                progress={20} 
                status="On Track" 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, description, icon }: { title: string, value: string, description: string, icon: React.ReactNode }) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-green-500" />
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectProgress({ name, progress, status, variant = "default" }: { name: string, progress: number, status: string, variant?: "default" | "destructive" }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{name}</span>
        <Badge variant={variant === "destructive" ? "destructive" : "secondary"}>
          {status}
        </Badge>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}

function FolderCheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="m9 13 2 2 4-4"/></svg>
  );
}
