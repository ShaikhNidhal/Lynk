
"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, MessageSquare, Paperclip, ChevronDown, Clock, Calendar } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface TaskCardProps {
  task: any;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "Critical": return "destructive";
      case "High": return "destructive";
      case "Medium": return "default";
      case "Low": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card 
      className="p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group bg-white border-border"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant={getPriorityVariant(task.priority)} className="text-[10px] uppercase font-bold py-0 h-4">
          {task.priority || "Medium"}
        </Badge>
        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-4 h-4" />
        </Button>
      </div>
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
            {format(new Date(task.createdAt?.seconds * 1000 || Date.now()), "MMM d")}
          </div>
        </div>
        <Avatar className="w-6 h-6 border">
          <AvatarImage src={`https://picsum.photos/seed/${task.ownerId}/100/100`} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
      </div>
    </Card>
  );
}
