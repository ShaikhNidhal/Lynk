"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  Paperclip, 
  File, 
  Download, 
  Trash2, 
  Plus, 
  Loader2, 
  X,
  ExternalLink,
  Upload
} from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
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
  const { user, profile, storage, firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch attachments with QAP filter
  const attachmentsQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !taskId || !user?.uid) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks", taskId, "attachments"),
      where(`members.${user.uid}`, "!=", null)
    );
  }, [firestore, projectId, taskId, user?.uid]);

  const { data: rawAttachments, isLoading } = useCollection(attachmentsQuery);

  // Client-side sort attachments
  const attachments = useMemo(() => {
    if (!rawAttachments) return [];
    return [...rawAttachments].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA; // desc
    });
  }, [rawAttachments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage || !profile?.currentWorkspaceId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const storagePath = `workspaces/${profile.currentWorkspaceId}/projects/${projectId}/tasks/${taskId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const attachmentsRef = collection(firestore, "projects", projectId, "tasks", taskId, "attachments");
      await addDocumentNonBlocking(attachmentsRef, {
        fileName: file.name,
        fileUrl: downloadUrl,
        storagePath: storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        uploaderId: user.uid,
        members: projectMembers,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Attachment Uploaded" });
    } catch (error: any) {
      console.error("Upload failed", error);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (attachment: any) => {
    if (!firestore || !storage) return;
    if (!confirm(`Delete "${attachment.fileName}"?`)) return;

    try {
      if (attachment.storagePath) {
        const storageRef = ref(storage, attachment.storagePath);
        await deleteObject(storageRef);
      }

      const refDoc = doc(firestore, "projects", projectId, "tasks", taskId, "attachments", attachment.id);
      deleteDocumentNonBlocking(refDoc);
      toast({ title: "Attachment removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-[500px] space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-bold text-sm tracking-tight">
          <Paperclip className="w-4 h-4 text-primary" />
          Task Attachments
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()} 
            className="h-8 gap-1.5 text-xs text-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            Upload File
          </Button>
        </div>
      </div>

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
                    onClick={() => handleDelete(attachment)}
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
