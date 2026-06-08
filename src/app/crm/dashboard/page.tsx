
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { useMemo } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid
} from "recharts";
import { 
  DollarSign, 
  Target, 
  TrendingUp, 
  Rocket, 
  Loader2, 
  Building2, 
  ArrowRightLeft,
  ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function CRMDashboard() {
  const { firestore, profile } = useFirebase();

  const dealsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "deals"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      orderBy("createdAt", "desc")
    );
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: deals, isLoading } = useCollection(dealsQuery);

  // Bug #13 fix: fetch all pipelines to build a stageId → stage name lookup map
  const pipelinesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "pipelines"),
      where("workspaceId", "==", profile.currentWorkspaceId)
    );
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: pipelines } = useCollection(pipelinesQuery);

  const stageNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    pipelines?.forEach((p: any) => {
      p.stages?.forEach((s: any) => { map[s.id] = s.name; });
    });
    return map;
  }, [pipelines]);

  const stats = useMemo(() => {
    if (!deals) return { totalValue: 0, winRate: 0, openCount: 0, weightedValue: 0 };
    
    const wonDeals = deals.filter(d => d.status === 'Won');
    const lostDeals = deals.filter(d => d.status === 'Lost');
    const openDeals = deals.filter(d => d.status === 'Open');
    
    const totalWonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const totalOpenValue = openDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const weightedValue = openDeals.reduce((sum, d) => sum + ((d.value || 0) * ((d.probability || 0) / 100)), 0);
    
    const winRate = (wonDeals.length + lostDeals.length) > 0 
      ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 
      : 0;

    return {
      totalValue: totalWonValue + totalOpenValue,
      winRate: Math.round(winRate),
      openCount: openDeals.length,
      weightedValue: Math.round(weightedValue)
    };
  }, [deals]);

  const pipelineData = useMemo(() => {
    if (!deals) return [];
    // Bug #13 fix: group by stage name (not raw stageId) using the lookup map
    const stages: Record<string, number> = {};
    deals.forEach(d => {
      // Use the human-readable stage name if available, otherwise format the stageId
      const stageName = stageNameMap[d.stageId]
        || (d.stageId ? d.stageId.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Unknown');
      stages[stageName] = (stages[stageName] || 0) + (d.value || 0);
    });
    return Object.entries(stages).map(([name, value]) => ({ name, value }));
  }, [deals, stageNameMap]);

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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            CRM Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">Pipeline performance and revenue forecasting.</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <CRMStatCard title="Pipeline Value" value={`$${stats.totalValue.toLocaleString()}`} icon={<DollarSign />} color="text-primary" />
          <CRMStatCard title="Win Rate" value={`${stats.winRate}%`} icon={<TrendingUp />} color="text-green-500" />
          <CRMStatCard title="Open Deals" value={stats.openCount.toString()} icon={<ArrowRightLeft />} color="text-accent" />
          <CRMStatCard title="Weighted Forecast" value={`$${stats.weightedValue.toLocaleString()}`} icon={<Rocket />} color="text-orange-500" />
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Revenue Distribution</CardTitle>
              <CardDescription>Deal volume by pipeline stage.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                    <Tooltip cursor={{fill: 'hsl(var(--secondary)/0.5)'}} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">High Value Opportunities</CardTitle>
              <CardDescription>Top active deals in the current cycle.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deals?.filter(d => d.status === 'Open').sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 5).map(deal => (
                  <div key={deal.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-white hover:border-primary/30 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{deal.title}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{deal.companyName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">${deal.value?.toLocaleString()}</p>
                      <Badge variant="secondary" className="text-[9px] h-4">{deal.probability}% Prob.</Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="ghost" className="w-full mt-4 gap-2 text-xs font-bold uppercase tracking-widest" asChild>
                <Link href="/crm/pipeline">Full Pipeline <ChevronRight className="w-4 h-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function CRMStatCard({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-2xl bg-secondary/30 flex items-center justify-center", color)}>
            {icon}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            <p className="text-2xl font-black tracking-tight">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
