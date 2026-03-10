
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
  Loader2,
  Users,
  Briefcase,
  Zap
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser, useDoc, useFirebase, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where } from "firebase/firestore";

const workloadData = [
  { name: "Alice", tasks: 8, capacity: 10, availability: "Available" },
  { name: "Bob", tasks: 12, capacity: 10, availability: "Overloaded" },
  { name: "Charlie", tasks: 5, capacity: 10, availability: "Available" },
  { name: "Diana", tasks: 9, capacity: 10, availability: "Busy" },
  { name: "Ethan", tasks: 15, capacity: 10, availability: "Critical" },
];

export default function DashboardPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  // 1. Fetch User Profile
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // 2. Fetch User's Projects
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "projects"),
      where(`members.${user.uid}`, "!=", null)
    );
  }, [firestore, user?.uid]);
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  const isLoading = isProfileLoading || isProjectsLoading;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const activeProjectsCount = projects?.length || 0;
  const recentProjects = projects?.slice(0, 4) || [];

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {profile?.firstName || "User"}!
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Role: <span className="font-semibold text-primary">{profile?.role || "Not Assigned"}</span> • Overview of your resources.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
              <Link href="/time">Timesheets</Link>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" asChild>
              <Link href="/projects">Manage Boards</Link>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Assigned Projects" 
            value={activeProjectsCount.toString()} 
            description="Active workspaces" 
            icon={<Briefcase className="text-primary" />} 
          />
          <StatCard 
            title="Team Availability" 
            value="78%" 
            description="Avg. capacity used" 
            icon={<Users className="text-blue-500" />} 
          />
          <StatCard 
            title="Milestones Met" 
            value="24" 
            description="This sprint" 
            icon={<CheckCircle2 className="text-green-500" />} 
          />
          <StatCard 
            title="Utilization Alert" 
            value="2" 
            description="Members overloaded" 
            icon={<AlertCircle className="text-destructive" />} 
          />
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-7">
          {/* Workload Visualization */}
          <Card className="md:col-span-4 glass-card border-primary/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Resource Workload Analysis</CardTitle>
                  <CardDescription className="text-xs">Task allocation vs. capacity (Threshold: 10)</CardDescription>
                </div>
                <Zap className="w-5 h-5 text-accent animate-pulse hidden sm:block" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[350px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#6b7280', fontSize: 10}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#6b7280', fontSize: 10}} 
                    />
                    <Tooltip 
                      cursor={{fill: 'hsl(var(--secondary)/0.5)'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}}/>
                    <Bar name="Current Tasks" dataKey="tasks" radius={[4, 4, 0, 0]}>
                      {workloadData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.tasks > entry.capacity ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Team Availability Status */}
          <Card className="md:col-span-3 glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Team Status</CardTitle>
              <CardDescription className="text-xs">Real-time monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workloadData.map((member) => (
                  <div key={member.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-primary border border-primary/10 text-xs">
                        {member.name[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{member.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold">
                          {member.tasks} tasks
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={member.availability === "Critical" || member.availability === "Overloaded" ? "destructive" : "secondary"}
                      className="px-1.5 py-0 text-[9px]"
                    >
                      {member.availability}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-border">
                <Button variant="outline" className="w-full gap-2 text-[10px] h-8 font-bold uppercase tracking-widest" asChild>
                  <Link href="/team">
                    Full Planner <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* My Recent Projects */}
          <Card className="md:col-span-7 glass-card border-accent/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Active Projects</CardTitle>
                <CardDescription className="text-xs">Quick access to assigned boards</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link href="/projects" className="text-primary hover:underline flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider">
                  View All <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentProjects.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {recentProjects.map((project) => (
                    <Link key={project.id} href={`/projects/${project.id}`}>
                      <div className="p-4 rounded-xl border border-border bg-white hover:border-primary/40 hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <Zap className="w-3.5 h-3.5" />
                          </div>
                          <Badge variant="outline" className="text-[9px] px-1">{project.type}</Badge>
                        </div>
                        <h4 className="font-bold text-xs truncate group-hover:text-primary transition-colors">{project.name}</h4>
                        <div className="mt-4 space-y-2">
                           <div className="flex justify-between text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">
                             <span>Health</span>
                             <span className="text-green-600">{project.status}</span>
                           </div>
                           <Progress value={65} className="h-1" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center bg-secondary/20 rounded-xl border-2 border-dashed">
                  <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">No projects assigned yet.</p>
                  <Button variant="link" asChild className="mt-2 text-xs">
                    <Link href="/projects">Create your first project</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ title, value, description, icon }: { title: string, value: string, description: string, icon: React.ReactNode }) {
  return (
    <Card className="glass-card overflow-hidden border-primary/5">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{title}</p>
          <div className="h-4 w-4 text-muted-foreground opacity-70">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="text-[9px] text-muted-foreground flex items-center gap-1 font-medium italic">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
