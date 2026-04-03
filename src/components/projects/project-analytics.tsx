
"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertCircle, DollarSign, Zap } from "lucide-react";

interface ProjectAnalyticsProps {
  project: any;
  tasks: any[];
}

export function ProjectAnalytics({ project, tasks }: ProjectAnalyticsProps) {
  const taskStatusData = useMemo(() => {
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const done = tasks.filter(t => t.status === 'done').length;
    
    return [
      { name: 'To Do', value: todo, color: 'hsl(var(--muted-foreground))' },
      { name: 'Active', value: inProgress, color: 'hsl(var(--accent))' },
      { name: 'Completed', value: done, color: 'hsl(var(--primary))' }
    ];
  }, [tasks]);

  const budgetUsage = project.budget ? Math.min(((project.budgetSpent || 0) / project.budget) * 100, 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Financial Status */}
        <Card className="glass-card border-primary/10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Budget Allocation
            </CardTitle>
            <CardDescription>Real-time burn rate vs. total budget.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Projected Cost</p>
                <p className="text-3xl font-bold">${(project.budget || 0).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actual Spent</p>
                <p className="text-2xl font-bold text-accent">${(project.budgetSpent || 0).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Resource Consumption</span>
                <span className={budgetUsage > 90 ? 'text-destructive' : 'text-primary'}>
                  {budgetUsage.toFixed(1)}%
                </span>
              </div>
              <Progress value={budgetUsage} className="h-2" />
            </div>

            <div className="p-4 rounded-xl bg-secondary/20 border border-border flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                {budgetUsage > 80 
                  ? "Project is approaching budget limits. Recommendation: Review resource allocation immediately."
                  : "Spending is currently within acceptable margins for this phase of delivery."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Task Velocity */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" />
              Delivery Velocity
            </CardTitle>
            <CardDescription>Work distribution across board columns.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Health Indicators */}
      <Card className="glass-card border-accent/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Strategic Oversight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8 md:grid-cols-3">
            <HealthIndicator 
              label="Timeline Integrity" 
              value={project.healthStatus || "Good"} 
              description="Alignment with target end dates." 
            />
            <HealthIndicator 
              label="Resource Loading" 
              value="Optimal" 
              description="Team allocation and task density." 
            />
            <HealthIndicator 
              label="Strategic Priority" 
              value={project.priority || "Medium"} 
              description="Impact on organizational goals." 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthIndicator({ label, value, description }: { label: string, value: string, description: string }) {
  const getStatusColor = (v: string) => {
    switch (v.toLowerCase()) {
      case 'good':
      case 'optimal': return 'text-green-600 bg-green-50';
      case 'at risk':
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical':
      case 'urgent': return 'text-destructive bg-destructive/5';
      default: return 'text-primary bg-primary/5';
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className={`px-3 py-1 rounded-full text-xs font-bold w-fit ${getStatusColor(value)}`}>
        {value}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">{description}</p>
    </div>
  );
}
