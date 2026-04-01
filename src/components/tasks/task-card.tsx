
"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Clock, Calendar, User, GripVertical } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: any;
  onClick: () => void;
  onDragStart?: () => void;
}

export function TaskCard({ task, onClick, onDragStart }: TaskCardProps) {
  const { firestore } = useFirebase();
  
  // Resolve assignee profile if exists
  const assigneeRef = useMemoFirebase(() => {
    if (!firestore || !task.assignedToId) return null;
    return doc(firestore, "users", task.assignedToId);
  }, [firestore, task.assignedToId]);
  
  const { data: assignee } = useDoc(assigneeRef);

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "Critical": return "destructive";
      case "High": return "destructive";
      case "Medium": return "default";
      case "Low": return "secondary";
      default: return "outline";
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart();
      // Required for some browsers to initiate drag
      e.dataTransfer.setData("text/plain", task.id);
      e.dataTransfer.effectAllowed = "move";
    }
  };

  return (
    <Card 
      draggable={!!onDragStart}
      onDragStart={handleDragStart}
      className={cn(
        "p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group bg-white border-border relative active:cursor-grabbing",
        onDragStart && "cursor-grab"
      )}
      onClick={onClick}
    >
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-3 h-3 text-muted-foreground/30" />
      </div>

      <div className="flex items-start justify-between mb-2 pl-2">
        <Badge variant={getPriorityVariant(task.priority)} className="text-[10px] uppercase font-bold py-0 h-4">
          {task.priority || "Medium"}
        </Badge>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="pl-2">
        <h4 className="font-semibold text-foreground mb-1 leading-snug">{task.title}</h4>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
            {task.description}
          </p>
        )}

        {task.dueDate && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-4 font-medium">
            <Calendar className="w-3 h-3 text-primary" />
            <span>Due {format(new Date(task.dueDate), "MMM d")}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3" />
              {task.createdAt?.seconds 
                ? format(new Date(task.createdAt.seconds * 1000), "MMM d") 
                : "Just now"}
            </div>
          </div>
          <div className="flex items-center -space-x-1">
            {assignee ? (
              <Avatar title={`Assigned to ${assignee.firstName} ${assignee.lastName}`} className="w-6 h-6 border-2 border-white shadow-sm ring-1 ring-primary/10">
                <AvatarImage src={`https://picsum.photos/seed/${assignee.id}/50/50`} />
                <AvatarFallback className="text-[8px]">{assignee.firstName?.[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-6 h-6 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-secondary/20" title="Unassigned">
                <User className="w-3 h-3 text-muted-foreground/40" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
