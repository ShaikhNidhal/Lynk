
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
import { Plus, Loader2, User } from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, serverTimestamp, query, where, limit } from "firebase/firestore";
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
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium",
    status: initialStatus,
    dueDate: "",
    assignedToId: "unassigned",
  });

  // Fetch profiles for project members to show names in the selector
  const memberIds = useMemo(() => Object.keys(projectMembers || {}), [projectMembers]);
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || memberIds.length === 0) return null;
    // Note: 'in' queries are limited to 30 items in Firestore
    return query(
      collection(firestore, "users"),
      where("id", "in", memberIds.slice(0, 30))
    );
  }, [firestore, memberIds]);

  const { data: members } = useCollection(usersQuery);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore || !projectId) return;

    setLoading(true);
    try {
      const tasksRef = collection(firestore, "projects", projectId, "tasks");
      
      addDocumentNonBlocking(tasksRef, {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        ownerId: user.uid,
        assignedToId: formData.assignedToId === "unassigned" ? null : formData.assignedToId,
        projectId: projectId,
        members: projectMembers, // Denormalize project members for RBAC
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your project board.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input 
              id="title" 
              placeholder="e.g., Design System Update" 
              required 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              placeholder="What needs to be done?" 
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select 
              value={formData.assignedToId} 
              onValueChange={(value) => setFormData({...formData, assignedToId: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
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
                      <span>{m.firstName} {m.lastName}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({...formData, priority: value})}
              >
                <SelectTrigger>
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
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
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
            <Label htmlFor="dueDate">Due Date (Optional)</Label>
            <Input 
              id="dueDate" 
              type="date" 
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
