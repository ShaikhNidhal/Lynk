
"use client";

import React, { useState, useMemo } from "react";
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
  User as UserIcon, 
  Plus, 
  Trash2, 
  Loader2,
  ListTodo,
  MessageSquare,
  Paperclip,
  Info,
  Share2,
  Check,
  UserCheck,
  AlertTriangle,
  History,
  Timer
} from "lucide-react";
import { useFirebase, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp, query, where } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { AIBreakdownButton } from "@/components/tasks/ai-breakdown-button";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { TaskTimeLogs } from "@/components/tasks/task-time-logs";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createNotification } from "@/lib/notifications";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [isCopying, setIsCopying] = useState(false);

  // Fetch Assignee Profile
  const assigneeRef = useMemoFirebase(() => {
    if (!firestore || !task?.assignedToId) return null;
    return doc(firestore, "users", task.assignedToId);
  }, [firestore, task?.assignedToId]);
  const { data: assigneeProfile } = useDoc(assigneeRef);

  // Fetch Creator Profile
  const creatorRef = useMemoFirebase(() => {
    if (!firestore || !task?.ownerId) return null;
    return doc(firestore, "users", task.ownerId);
  }, [firestore, task?.ownerId]);
  const { data: creatorProfile } = useDoc(creatorRef);

  // Fetch potential assignees (Project Members)
  const memberIds = useMemo(() => Object.keys(projectMembers || {}), [projectMembers]);
  const membersQuery = useMemoFirebase(() => {
    if (!firestore || memberIds.length === 0) return null;
    return query(collection(firestore, "users"), where("id", "in", memberIds.slice(0, 30)));
  }, [firestore, memberIds]);
  const { data: members } = useCollection(membersQuery);

  // Fetch Subtasks with QAP filter
  const subtasksQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !task?.id || !user?.uid) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks", task.id, "subtasks"),
      where(`members.${user.uid}`, "!=", null)
    );
  }, [firestore, projectId, task?.id, user?.uid]);

  const { data: rawSubtasks, isLoading: isSubtasksLoading } = useCollection(subtasksQuery);

  // Client-side sort subtasks
  const subtasks = useMemo(() => {
    if (!rawSubtasks) return [];
    return [...rawSubtasks].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateA - dateB; // asc
    });
  }, [rawSubtasks]);

  const handleAddSubtask = (title: string) => {
    if (!title.trim() || !firestore || !projectId || !task?.id) return;

    const subtasksRef = collection(firestore, "projects", projectId, "tasks", task.id, "subtasks");
    addDocumentNonBlocking(subtasksRef, {
      title: title.trim(),
      status: "pending",
      ownerId: user?.uid,
      projectId,
      taskId: task.id,
      members: projectMembers, 
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

  const handleDeleteTask = () => {
    if (!firestore || !projectId || !task?.id) return;
    if (!confirm(`Are you sure you want to delete "${task.title}"? This cannot be undone.`)) return;

    const taskRef = doc(firestore, "projects", projectId, "tasks", task.id);
    deleteDocumentNonBlocking(taskRef);
    toast({ title: "Task Deleted", variant: "destructive" });
    onOpenChange(false);
  };

  const handleUpdateStatus = (newStatus: string) => {
    if (!firestore || !projectId || !task?.id) return;
    const taskRef = doc(firestore, "projects", projectId, "tasks", task.id);
    updateDocumentNonBlocking(taskRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    if (task.ownerId && task.ownerId !== user?.uid) {
      createNotification(
        firestore, 
        task.ownerId, 
        'status_change', 
        `Task "${task.title}" was updated to ${newStatus}`
      );
    }

    toast({ title: "Status Updated", description: `Task is now ${newStatus}` });
  };

  const handleUpdateAssignee = (newAssigneeId: string) => {
    if (!firestore || !projectId || !task?.id) return;
    const taskRef = doc(firestore, "projects", projectId, "tasks", task.id);
    updateDocumentNonBlocking(taskRef, {
      assignedToId: newAssigneeId === "unassigned" ? null : newAssigneeId,
      updatedAt: serverTimestamp(),
    });

    if (newAssigneeId !== "unassigned" && newAssigneeId !== user?.uid) {
      createNotification(
        firestore,
        newAssigneeId,
        'assignment',
        `You have been assigned to: ${task.title}`,
        `/projects/${projectId}`
      );
    }

    toast({ title: "Assignee Updated" });
  };

  const copyTaskLink = () => {
    if (typeof window === "undefined") return;
    const link = `${window.location.origin}/projects/${projectId}?task=${task.id}`;
    navigator.clipboard.writeText(link);
    setIsCopying(true);
    toast({ title: "Task Link Copied" });
    setTimeout(() => setIsCopying(false), 2000);
  };

  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] p-0 flex flex-col glass-card">
        <div className="p-6 pb-0">
          <SheetHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={task.priority === "High" || task.priority === "Critical" ? "destructive" : "default"} className="uppercase text-[10px] font-bold">
                  {task.priority}
                </Badge>
                <Button variant="ghost" size="sm" onClick={copyTaskLink} className="h-7 gap-1.5 text-[10px] uppercase font-bold text-muted-foreground hover:text-primary">
                  {isCopying ? <Check className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3" />}
                  Share
                </Button>
              </div>
              <div className="flex gap-2">
                <SelectStatus currentStatus={task.status} onStatusChange={handleUpdateStatus} />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={handleDeleteTask}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <SheetTitle className="text-2xl font-bold leading-tight text-foreground">{task.title}</SheetTitle>
          </SheetHeader>
        </div>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0 mt-6">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-4 bg-secondary/30 h-9 p-1">
              <TabsTrigger value="details" className="gap-2 text-[10px] font-bold uppercase">
                <Info className="w-3 h-3" /> Info
              </TabsTrigger>
              <TabsTrigger value="time" className="gap-2 text-[10px] font-bold uppercase">
                <Timer className="w-3 h-3" /> Time
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2 text-[10px] font-bold uppercase">
                <MessageSquare className="w-3 h-3" /> Chats
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-2 text-[10px] font-bold uppercase">
                <Paperclip className="w-3 h-3" /> Files
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator className="my-4 opacity-50" />

          <div className="flex-1 overflow-y-auto px-6 pb-24">
            <TabsContent value="details" className="mt-0 space-y-8">
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</h4>
                <p className="text-sm leading-relaxed text-foreground">
                  {task.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserCheck className="w-3 h-3 text-primary" /> Assignee
                  </span>
                  <Select 
                    value={task.assignedToId || "unassigned"} 
                    onValueChange={handleUpdateAssignee}
                  >
                    <SelectTrigger className="h-9 w-full bg-white/50 border-primary/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members?.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={`https://picsum.photos/seed/${m.id}/50/50`} />
                              <AvatarFallback>{m.firstName?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{m.firstName} {m.lastName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-primary" /> Est. Capacity
                  </span>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-sm font-bold">{task.estimatedHours || "0.0"} hrs</span>
                    <Badge variant="outline" className="text-[9px] h-4">Target</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserIcon className="w-3 h-3 text-primary" /> Created By
                  </span>
                  <div className="flex items-center gap-2 pt-1.5">
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={`https://picsum.photos/seed/${task.ownerId}/50/50`} />
                      <AvatarFallback>{creatorProfile?.firstName?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {creatorProfile ? `${creatorProfile.firstName} ${creatorProfile.lastName}` : "Loading..."}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-primary" /> Due Date
                  </span>
                  <p className="text-sm font-medium pt-1.5">
                    {task.dueDate ? format(new Date(task.dueDate), "PPP") : "No due date"}
                  </p>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-primary" />
                    Checklist & Subtasks
                    {subtasks && subtasks.length > 0 && (
                      <Badge variant="secondary" className="ml-1 rounded-sm text-[10px]">
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
                      <div key={sub.id} className="flex items-center justify-between group p-2 rounded-md hover:bg-secondary/30 transition-colors border border-transparent hover:border-border">
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={sub.status === "done"} 
                            onCheckedChange={() => handleToggleSubtask(sub)}
                          />
                          <span className={`text-sm ${sub.status === "done" ? 'line-through text-muted-foreground font-normal' : 'text-foreground font-medium'}`}>
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
                    <div className="text-center py-8 border-2 border-dashed rounded-lg bg-secondary/10">
                      <ListTodo className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground italic">No subtasks yet.</p>
                    </div>
                  )}

                  {isAddingSubtask ? (
                    <div className="flex gap-2 pt-2 animate-in fade-in slide-in-from-top-1">
                      <Input 
                        placeholder="What needs to be done?" 
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(newSubtaskTitle)}
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => handleAddSubtask(newSubtaskTitle)}>Add</Button>
                        <Button size="sm" variant="ghost" onClick={() => setIsAddingSubtask(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start gap-2 text-primary hover:bg-primary/5 border border-dashed hover:border-solid transition-all mt-2"
                      onClick={() => setIsAddingSubtask(true)}
                    >
                      <Plus className="w-4 h-4" />
                      Add item to checklist
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="time" className="mt-0">
              <TaskTimeLogs 
                projectId={projectId} 
                taskId={task.id} 
                projectMembers={projectMembers} 
              />
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <TaskComments 
                projectId={projectId} 
                taskId={task.id} 
                projectMembers={projectMembers} 
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0">
              <TaskAttachments 
                projectId={projectId} 
                taskId={task.id} 
                projectMembers={projectMembers} 
              />
            </TabsContent>
          </div>
        </Tabs>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t z-10">
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
          className="h-7 text-[10px] uppercase font-bold px-3"
          onClick={() => onStatusChange(s.id)}
        >
          {s.label}
        </Button>
      ))}
    </div>
  );
}
