
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import { Flag, ListTodo, Calendar, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProjectTimelineProps {
  projectId: string;
  tasks: any[];
  milestones: any[];
}

export function ProjectTimeline({ projectId, tasks, milestones }: ProjectTimelineProps) {
  const sortedMilestones = [...milestones].sort((a, b) => 
    new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime()
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-primary" />
              Active Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{milestones.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              {milestones.filter(m => m.status === 'Achieved').length} completed
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <ListTodo className="w-3.5 h-3.5 text-accent" />
              Total Task Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tasks.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1">
              {tasks.filter(t => t.status === 'done').length} finished
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              Next Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold truncate">
              {sortedMilestones[0]?.name || "None Scheduled"}
            </p>
            <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase">
              {sortedMilestones[0]?.dueDate ? format(new Date(sortedMilestones[0].dueDate), "MMMM d, yyyy") : "---"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          Project Critical Path
        </h3>
        <div className="space-y-3">
          {sortedMilestones.length > 0 ? sortedMilestones.map((milestone, idx) => (
            <div key={milestone.id} className="relative pl-8 pb-8 last:pb-0 group">
              {idx < sortedMilestones.length - 1 && (
                <div className="absolute left-[15px] top-6 w-0.5 h-full bg-border group-hover:bg-primary/20 transition-colors" />
              )}
              <div className="absolute left-0 top-0 w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center z-10">
                <Flag className={`w-4 h-4 ${milestone.status === 'Achieved' ? 'text-green-500' : 'text-primary'}`} />
              </div>
              <div className="bg-white/50 border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-base">{milestone.name}</h4>
                  <Badge variant={milestone.status === 'Achieved' ? 'default' : 'secondary'} className="text-[10px] uppercase h-5">
                    {milestone.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{milestone.description}</p>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Target: {format(new Date(milestone.dueDate), "PPP")}
                  </div>
                  <div className="flex items-center gap-1">
                    {milestone.status === 'Achieved' ? (
                      <span className="text-green-600">Phase Complete</span>
                    ) : (
                      <span>{differenceInDays(new Date(milestone.dueDate), new Date())} Days Remaining</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-secondary/5 border-2 border-dashed rounded-2xl">
              <Flag className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground italic">No milestones defined for this roadmap.</p>
              <Button variant="outline" size="sm" className="mt-4 gap-2">
                <Plus className="w-3.5 h-3.5" /> Define First Milestone
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
