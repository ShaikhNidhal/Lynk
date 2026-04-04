
"use client";

import React, { useState, useMemo } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, Loader2, Clock } from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, serverTimestamp, query, where } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateTaskDialogProps {
  projectId: string;
  projectMembers: Record<string, string>;
  initialStatus?: string;
  trigger?: React.ReactNode;
}

export function CreateTaskDialog({ projectId, projectMembers, initialStatus = "todo", trigger }: CreateTaskDialogProps) {
  const { user, profile } = useUser();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    status: initialStatus,
    dueDate: "",
    estimatedHours: "",
    assignedToId: "unassigned",
  });

  // Fetch profiles for project members to show names in the selector
  const memberIds = useMemo(() => Object.keys(projectMembers || {}), [projectMembers]);
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || memberIds.length === 0) return null;
    return query(
      collection(firestore, "users"),
      where("id", "in", memberIds.slice(0, 30))
    );
  }, [firestore, memberIds]);

  const { data: members, isLoading: isMembersLoading } = useCollection(usersQuery);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !projectId || !profile?.currentWorkspaceId) return;

    setLoading(true);
    try {
      const tasksRef = collection(firestore, "projects", projectId, "tasks");
      
      addDocumentNonBlocking(tasksRef, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        estimatedHours: Number(formData.estimatedHours) || 0,
        actualHours: 0,
        ownerId: user.uid,
        assignedToId: formData.assignedToId === "unassigned" ? null : formData.assignedToId,
        projectId: projectId,
        workspaceId: profile.currentWorkspaceId, // Critical for analytics
        members: projectMembers, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Task Created",
        description: `"${formData.title}" has been added to the board.`,
      });
      
      setIsOpen(false);
      setFormData({ 
        title: "", 
        description: "", 
        priority: "Medium", 
        status: initialStatus,
        dueDate: "",
        estimatedHours: "",
        assignedToId: "unassigned"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Task Title</Label>
            <Input 
              id="title" 
              placeholder="e.g., Design System Update" 
              required 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="bg-white/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
            <Textarea 
              id="description" 
              placeholder="What needs to be done?" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="bg-white/50 min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignee" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assignee</Label>
              <Select 
                value={formData.assignedToId} 
                onValueChange={(value) => setFormData({...formData, assignedToId: value})}
              >
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder={isMembersLoading ? "Loading members..." : "Select assignee"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members?.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5 border">
                          <AvatarImage src={`https://picsum.photos/seed/${m.id}/50/50`} />
                          <AvatarFallback className="text-[10px]">{m.firstName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{m.firstName} {m.lastName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estHours" className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Est. Hours</Label>
              <Input 
                id="estHours" 
                type="number"
                placeholder="0.0"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({...formData, estimatedHours: e.target.value})}
                className="bg-white/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({...formData, priority: value})}
              >
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger className="bg-white/50">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dueDate" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Due Date (Optional)</Label>
            <Input 
              id="dueDate" 
              type="date" 
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
              className="bg-white/50"
            />
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="font-bold uppercase tracking-widest text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
