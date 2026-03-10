"use client";

import React, { useState } from "react";
import { 
  Paperclip, 
  File, 
  Download, 
  Trash2, 
  Plus, 
  Loader2, 
  X,
  ExternalLink
} from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface TaskAttachmentsProps {
  projectId: string;
  taskId: string;
  projectMembers: Record<string, string>;
}

export function TaskAttachments({ projectId, taskId, projectMembers }: TaskAttachmentsProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const attachmentsQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !taskId) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks", taskId, "attachments"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, projectId, taskId]);

  const { data: attachments, isLoading } = useCollection(attachmentsQuery);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !user || !firestore) return;

    setIsSubmitting(true);
    const attachmentsRef = collection(firestore, "projects", projectId, "tasks", taskId, "attachments");
    
    // Simulate real file URL with a placeholder if not provided
    const fileUrl = formData.url.trim() || `https://picsum.photos/seed/${Math.random()}/800/600`;

    addDocumentNonBlocking(attachmentsRef, {
      fileName: formData.name.trim(),
      fileUrl: fileUrl,
      uploaderId: user.uid,
      members: projectMembers, // RBAC denormalization
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).finally(() => {
      setFormData({ name: "", url: "" });
      setIsAdding(false);
      setIsSubmitting(false);
      toast({ title: "Attachment added" });
    });
  };

  const handleDelete = (attachmentId: string) => {
    if (!firestore) return;
    const ref = doc(firestore, "projects", projectId, "tasks", taskId, "attachments", attachmentId);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Attachment removed" });
  };

  return (
    <div className="flex flex-col h-[500px] space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
          <Paperclip className="w-4 h-4 text-primary" />
          Task Attachments
        </div>
        {!isAdding && (
          <Button variant="ghost" size="sm" onClick={() => setIsAdding(true)} className="h-8 gap-1.5 text-xs text-primary">
            <Plus className="w-3.5 h-3.5" />
            Add File
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="bg-secondary/20 p-4 rounded-lg border border-primary/20 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider">New Attachment</h4>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsAdding(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileName" className="text-[10px] uppercase font-bold text-muted-foreground">File Name</Label>
            <Input 
              id="fileName" 
              placeholder="e.g., Design Specs.pdf" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fileUrl" className="text-[10px] uppercase font-bold text-muted-foreground">URL (Optional)</Label>
            <Input 
              id="fileUrl" 
              placeholder="https://..." 
              value={formData.url}
              onChange={(e) => setFormData({...formData, url: e.target.value})}
            />
          </div>
          <Button className="w-full h-8 text-xs" onClick={handleAdd} disabled={!formData.name.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
            Save Attachment
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : attachments && attachments.length > 0 ? (
          <div className="space-y-3">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/5 rounded flex items-center justify-center text-primary/60 border border-primary/10">
                    <File className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate max-w-[200px] text-foreground">{attachment.fileName}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                       {attachment.createdAt?.seconds 
                         ? format(new Date(attachment.createdAt.seconds * 1000), "MMM d, yyyy") 
                         : "Just now"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" asChild title="Open Link">
                    <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10" 
                    onClick={() => handleDelete(attachment.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Paperclip className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic">No files attached yet.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
