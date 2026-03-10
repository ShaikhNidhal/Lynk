
"use client";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { 
  MoreVertical, 
  Plus, 
  Search, 
  Filter, 
  Settings, 
  MessageSquare, 
  Paperclip, 
  Clock,
  Clock3,
  ChevronDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { AIBreakdownButton } from "@/components/tasks/ai-breakdown-button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const initialColumns = [
  { id: "todo", title: "To Do", tasks: [
    { id: "t1", title: "Design Login Flow", priority: "High", comments: 4, files: 2, subtasks: 3, description: "Create user authentication screens for both web and mobile." },
    { id: "t2", title: "Setup Firestore", priority: "Medium", comments: 1, files: 0, subtasks: 0, description: "Configure collections and security rules." },
  ]},
  { id: "in-progress", title: "In Progress", tasks: [
    { id: "t3", title: "Agile Dashboard", priority: "High", comments: 12, files: 5, subtasks: 5, description: "Build the main interactive dashboard component with charts." },
  ]},
  { id: "done", title: "Done", tasks: [
    { id: "t4", title: "Initial Project Setup", priority: "Low", comments: 2, files: 1, subtasks: 2, description: "Create base repository and configure environment variables." },
  ]}
];

export default function ProjectBoardPage({ params }: { params: { id: string } }) {
  const [columns, setColumns] = useState(initialColumns);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleSubtasksGenerated = (taskId: string, newSubtasks: string[]) => {
    // In a real app, this would update Firestore
    console.log(`Adding ${newSubtasks.length} subtasks to task ${taskId}`);
  };

  return (
    <AppShell>
      <div className="flex flex-col h-full space-y-6">
        {/* Project Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl">
               CP
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Portal 2.0</h1>
               <p className="text-sm text-muted-foreground flex items-center gap-2">
                 Agile Scrum Board • <span className="text-green-600 font-medium">Sprint 12</span>
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 overflow-hidden mr-4">
              {[1, 2, 3, 4].map(i => (
                <Avatar key={i} className="inline-block border-2 border-white w-8 h-8">
                  <AvatarImage src={`https://picsum.photos/seed/user${i}/100/100`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ))}
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-secondary text-[10px] font-bold">
                +4
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Settings className="w-4 h-4" />
              Board Settings
            </Button>
          </div>
        </div>

        {/* Board */}
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start">
          {columns.map(column => (
            <div key={column.id} className="w-80 shrink-0 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-widest uppercase text-muted-foreground">{column.title}</h3>
                  <Badge variant="secondary" className="rounded-sm px-1.5 h-5">{column.tasks.length}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {column.tasks.map(task => (
                  <Card 
                    key={task.id} 
                    className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group bg-white border-border"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "default" : "outline"} className="text-[10px] uppercase font-bold py-0 h-4">
                        {task.priority}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                    <h4 className="font-semibold text-foreground mb-1 leading-snug">{task.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {task.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        {task.comments > 0 && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <MessageSquare className="w-3 h-3" />
                            {task.comments}
                          </div>
                        )}
                        {task.files > 0 && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <Paperclip className="w-3 h-3" />
                            {task.files}
                          </div>
                        )}
                        {task.subtasks > 0 && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <ChevronDown className="w-3 h-3" />
                            {task.subtasks}
                          </div>
                        )}
                      </div>
                      <Avatar className="w-6 h-6 border">
                        <AvatarImage src={`https://picsum.photos/seed/user${task.id}/100/100`} />
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                       <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase">
                         <Clock className="w-3 h-3 text-primary" />
                         <span>Track Time</span>
                       </div>
                       <AIBreakdownButton 
                         taskDescription={task.description} 
                         onSubtasksGenerated={(newSubs) => handleSubtasksGenerated(task.id, newSubs)} 
                       />
                    </div>
                  </Card>
                ))}
                
                <Button variant="ghost" className="w-full border-2 border-dashed border-border py-8 hover:bg-secondary hover:border-primary/20 text-muted-foreground text-xs font-semibold uppercase tracking-widest gap-2">
                  <Plus className="w-4 h-4" />
                  Add Task
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
