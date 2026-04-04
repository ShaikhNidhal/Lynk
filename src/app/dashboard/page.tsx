
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
  Zap,
  Calendar,
  Search,
  Plus
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
import { doc, collection, query, where, limit, orderBy } from "firebase/firestore";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user, profile, firestore, isUserLoading: isProfileLoading } = useFirebase();

  // 2. Fetch Projects - filtered by active workspace
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || isProfileLoading || !profile?.currentWorkspaceId) return null;
    const projectsRef = collection(firestore, "projects");
    
    // Always filter by workspaceId to ensure results are allowed by Security Rules
    return query(
      projectsRef, 
      where("workspaceId", "==", profile.currentWorkspaceId),
      limit(20)
    );
  }, [firestore, user?.uid, profile?.currentWorkspaceId, isProfileLoading]);
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  // 3. Fetch Team - restricted to current workspace members
  const teamQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "workspaces", profile.currentWorkspaceId, "members"), limit(10));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: teamMembers, isLoading: isTeamLoading } = useCollection(teamQuery);

  const isLoading = isProfileLoading || isProjectsLoading || isTeamLoading;

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
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Hello, {profile?.firstName || "Leader"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Your organizational oversight for {format(new Date(), "MMMM do, yyyy")}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/crm/dashboard" className="gap-2"><TrendingUp className="w-4 h-4" /> Sales Stats</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/projects" className="gap-2"><Plus className="w-4 h-4" /> New Initiative</Link>
            </Button>
          </div>
        </div>

        {/* Strategic Metrics */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Active Boards" 
            value={(projects?.length || 0).toString()} 
            description="Live delivery workflows" 
            icon={<Briefcase className="text-primary" />} 
          />
          <StatCard 
            title="Internal Team" 
            value={(teamMembers?.length || 0).toString()} 
            description="Collaborators online" 
            icon={<Users className="text-accent" />} 
          />
          <StatCard 
            title="Billable Target" 
            value="84%" 
            description="Weekly utilization" 
            icon={<TrendingUp className="text-green-500" />} 
          />
          <StatCard 
            title="Open Risks" 
            value="3" 
            description="Blocked task alerts" 
            icon={<AlertCircle className="text-destructive" />} 
          />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
          {/* Main Delivery View */}
          <Card className="lg:col-span-8 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Delivery Velocity</CardTitle>
                <CardDescription>Live project burn rate and completion status.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/projects" className="text-xs font-bold uppercase text-primary">View All Boards</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {projects && projects.length > 0 ? (
                  projects.slice(0, 5).map(project => (
                    <div key={project.id} className="group cursor-pointer">
                      <Link href={`/projects/${project.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-xs group-hover:bg-primary group-hover:text-white transition-colors">
                              {project.name?.[0]}
                            </div>
                            <span className="text-sm font-bold group-hover:text-primary transition-colors">{project.name}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] uppercase font-bold">{project.status}</Badge>
                        </div>
                        <div className="flex items-center gap-4">
                          <Progress value={65} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-bold text-muted-foreground w-8">65%</span>
                        </div>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 opacity-40 italic text-sm">No active initiatives found.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Activity/Alerts Sidebar */}
          <Card className="lg:col-span-4 glass-card border-accent/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                Strategic Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <AlertItem 
                  type="risk" 
                  title="Budget Threshold Met" 
                  description="Project 'Mobile Redesign' reached 85% budget."
                />
                <AlertItem 
                  type="info" 
                  title="New Client Onboarded" 
                  description="Global Solutions added to the CRM directory."
                />
                <AlertItem 
                  type="urgent" 
                  title="Milestone Approaching" 
                  description="Phase 1 due in 48 hours for Client A."
                />
              </div>
              <div className="mt-8 p-4 rounded-xl bg-secondary/20 border border-dashed border-primary/20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">System Health</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Nodes Operational</span>
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-3 bg-green-500 rounded-sm" />)}
                  </div>
                </div>
              </div>
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
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <div className="h-8 w-8 rounded-lg bg-secondary/30 flex items-center justify-center opacity-70">
            {icon}
          </div>
        </div>
        <p className="text-3xl font-black tracking-tighter text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 italic font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}

function AlertItem({ type, title, description }: { type: 'risk' | 'info' | 'urgent', title: string, description: string }) {
  const colors = {
    risk: 'bg-orange-500',
    info: 'bg-blue-500',
    urgent: 'bg-destructive'
  };

  return (
    <div className="flex gap-3 items-start group">
      <div className={cn("w-1 h-10 rounded-full shrink-0", colors[type])} />
      <div className="min-w-0">
        <p className="text-xs font-bold truncate group-hover:text-primary transition-colors">{title}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
    </div>
  );
}
