
"use client";

import React, { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Calendar, 
  User, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Loader2,
  ListTodo,
  Check
} from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { AIBreakdownButton } from "@/components/tasks/ai-breakdown-button";
import { toast } from "@/hooks/use-toast";

interface TaskDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task: any;
  projectId: string;
  projectMembers: Record<string, string>;
}

export function TaskDetailSheet({ isOpen, onOpenChange, task, projectId, projectMembers }: TaskDetailSheetProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  // Fetch Subtasks
  const subtasksQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !task?.id) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks", task.id, "subtasks"),
      orderBy("createdAt", "asc")
    );
  }, [firestore, projectId, task?.id]);

  const { data: subtasks, isLoading: isSubtasksLoading } = useCollection(subtasksQuery);

  const handleAddSubtask = (title: string) => {
    if (!title.trim() || !firestore || !projectId || !task?.id) return;

    const subtasksRef = collection(firestore, "projects", projectId, "tasks", task.id, "subtasks");
    addDocumentNonBlocking(subtasksRef, {
      title: title.trim(),
      status: "pending",
      ownerId: user?.uid,
      projectId,
      taskId: task.id,
      members: projectMembers, // Denormalize project members for RBAC
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
  };

  const handleToggleSubtask = (subtask: any) => {
    if (!firestore || !projectId || !task?.id) return;
    const subtaskRef = doc(firestore, "projects", projectId, "tasks", task.id, "subtasks", subtask.id);
    updateDocumentNonBlocking(subtaskRef, {
      status: subtask.status === "done" ? "pending" : "done",
      updatedAt: serverTimestamp(),
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!firestore || !projectId || !task?.id) return;
    const subtaskRef = doc(firestore, "projects", projectId, "tasks", task.id, "subtasks", subtaskId);
    deleteDocumentNonBlocking(subtaskRef);
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (!firestore || !projectId || !task?.id) return;
    const taskRef = doc(firestore, "projects", projectId, "tasks", task.id);
    updateDocumentNonBlocking(taskRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Status Updated", description: `Task is now ${newStatus}` });
  };

  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant={task.priority === "High" || task.priority === "Critical" ? "destructive" : "default"}>
              {task.priority}
            </Badge>
            <div className="flex gap-2">
              <SelectStatus currentStatus={task.status} onStatusChange={handleUpdateStatus} />
            </div>
          </div>
          <SheetTitle className="text-2xl font-bold">{task.title}</SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            {task.description || "No description provided."}
          </SheetDescription>
        </SheetHeader>

        <div className="py-8 space-y-8">
          {/* Task Metadata */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Due Date
              </span>
              <p className="text-sm font-medium">
                {task.dueDate ? format(new Date(task.dueDate), "PPP") : "No due date"}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="w-3 h-3" /> Assignee
              </span>
              <p className="text-sm font-medium">
                Unassigned
              </p>
            </div>
          </div>

          <Separator />

          {/* Subtasks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary" />
                Subtasks
                {subtasks && subtasks.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {subtasks.filter(s => s.status === "done").length}/{subtasks.length}
                  </Badge>
                )}
              </h3>
              <AIBreakdownButton 
                taskDescription={task.title + ": " + task.description} 
                onSubtasksGenerated={(titles) => titles.forEach(t => handleAddSubtask(t))} 
              />
            </div>

            <div className="space-y-2">
              {isSubtasksLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
                </div>
              ) : subtasks && subtasks.length > 0 ? (
                subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between group p-2 rounded-md hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={sub.status === "done"} 
                        onCheckedChange={() => handleToggleSubtask(sub)}
                      />
                      <span className={`text-sm ${sub.status === "done" ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {sub.title}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteSubtask(sub.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed rounded-lg">
                  No subtasks added yet. Use AI Breakdown or add manually.
                </p>
              )}

              {isAddingSubtask ? (
                <div className="flex gap-2 pt-2">
                  <Input 
                    placeholder="New subtask..." 
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(newSubtaskTitle)}
                    autoFocus
                  />
                  <Button size="sm" onClick={() => handleAddSubtask(newSubtaskTitle)}>Add</Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsAddingSubtask(false)}>Cancel</Button>
                </div>
              ) : (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-2 text-primary hover:bg-primary/5"
                  onClick={() => setIsAddingSubtask(true)}
                >
                  <Plus className="w-4 h-4" />
                  Add Subtask
                </Button>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t">
          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close Task View
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SelectStatus({ currentStatus, onStatusChange }: { currentStatus: string, onStatusChange: (s: string) => void }) {
  const statuses = [
    { id: "todo", label: "To Do" },
    { id: "in-progress", label: "In Progress" },
    { id: "done", label: "Done" }
  ];

  return (
    <div className="flex gap-1 bg-secondary/50 p-1 rounded-md">
      {statuses.map((s) => (
        <Button 
          key={s.id} 
          variant={currentStatus?.toLowerCase() === s.id ? "default" : "ghost"} 
          size="sm" 
          className="h-7 text-[10px] uppercase font-bold"
          onClick={() => onStatusChange(s.id)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
