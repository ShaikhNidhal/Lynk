"use client";

import React, { useState } from "react";
import { 
  MessageSquare, 
  Send, 
  Loader2,
  User
} from "lucide-react";
import { useFirebase, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

interface TaskCommentsProps {
  projectId: string;
  taskId: string;
  projectMembers: Record<string, string>;
}

export function TaskComments({ projectId, taskId, projectMembers }: TaskCommentsProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !taskId) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks", taskId, "comments"),
      orderBy("createdAt", "asc")
    );
  }, [firestore, projectId, taskId]);

  const { data: comments, isLoading } = useCollection(commentsQuery);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !firestore) return;

    setIsSubmitting(true);
    const commentsRef = collection(firestore, "projects", projectId, "tasks", taskId, "comments");
    
    addDocumentNonBlocking(commentsRef, {
      content: newComment.trim(),
      authorId: user.uid,
      members: projectMembers, // RBAC denormalization
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).finally(() => {
      setNewComment("");
      setIsSubmitting(false);
    });
  };

  return (
    <div className="flex flex-col h-[500px] space-y-4">
      <div className="flex items-center gap-2 font-bold text-sm tracking-tight mb-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        Activity & Comments
      </div>

      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic">No comments yet. Start the conversation!</p>
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleAddComment} className="flex gap-2 pt-4 border-t">
        <Input 
          placeholder="Write a comment..." 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!newComment.trim() || isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}

function CommentItem({ comment }: { comment: any }) {
  const { firestore } = useFirebase();
  const userRef = useMemoFirebase(() => {
    if (!firestore || !comment.authorId) return null;
    return doc(firestore, "users", comment.authorId);
  }, [firestore, comment.authorId]);
  
  const { data: profile } = useDoc(userRef);

  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Avatar className="w-8 h-8 shrink-0 border">
        <AvatarImage src={`https://picsum.photos/seed/${comment.authorId}/100/100`} />
        <AvatarFallback>{profile?.firstName?.[0] || '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold truncate">
            {profile ? `${profile.firstName} ${profile.lastName}` : '...'}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
            {comment.createdAt?.seconds 
              ? format(new Date(comment.createdAt.seconds * 1000), "MMM d, h:mm a") 
              : "Just now"}
          </span>
        </div>
        <div className="bg-secondary/30 p-3 rounded-lg border border-border text-sm leading-relaxed text-foreground">
          {comment.content}
        </div>
      </div>
    </div>
  );
}
