
"use client";

import React, { useState, useMemo } from "react";
import { 
  MessageSquare, 
  Send, 
  Loader2,
  User,
  Reply,
  MoreVertical,
  Edit2,
  Trash2,
  Smile,
  X,
  Check
} from "lucide-react";
import { useFirebase, useUser, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface TaskCommentsProps {
  projectId: string;
  taskId: string;
  projectMembers: Record<string, string>;
}

export function TaskComments({ projectId, taskId, projectMembers }: TaskCommentsProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments with QAP filter
  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !taskId || !user?.uid) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks", taskId, "comments"),
      where(`members.${user.uid}`, "!=", null)
    );
  }, [firestore, projectId, taskId, user?.uid]);

  const { data: rawComments, isLoading } = useCollection(commentsQuery);

  // Client-side sort and tree-ify comments
  const threadedComments = useMemo(() => {
    if (!rawComments) return [];
    
    const sorted = [...rawComments].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateA - dateB; // Chronological
    });

    const roots = sorted.filter(c => !c.parentCommentId);
    const children = sorted.filter(c => c.parentCommentId);

    return roots.map(root => ({
      ...root,
      replies: children.filter(c => c.parentCommentId === root.id)
    }));
  }, [rawComments]);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !firestore) return;

    setIsSubmitting(true);
    const commentsRef = collection(firestore, "projects", projectId, "tasks", taskId, "comments");
    
    addDocumentNonBlocking(commentsRef, {
      content: newComment.trim(),
      authorId: user.uid,
      parentCommentId: replyingTo?.id || null,
      reactions: {},
      members: projectMembers, 
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }).finally(() => {
      setNewComment("");
      setReplyingTo(null);
      setIsSubmitting(false);
    });
  };

  return (
    <div className="flex flex-col h-[550px] space-y-4">
      <div className="flex items-center justify-between gap-2 font-bold text-sm tracking-tight mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Collaboration Hub
        </div>
        {rawComments && rawComments.length > 0 && (
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
            {rawComments.length} Discussions
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : threadedComments && threadedComments.length > 0 ? (
          <div className="space-y-6">
            {threadedComments.map((comment) => (
              <div key={comment.id} className="space-y-4">
                <CommentItem 
                  comment={comment} 
                  projectId={projectId} 
                  taskId={taskId} 
                  onReply={() => setReplyingTo(comment)}
                />
                
                {/* Replies */}
                {comment.replies.length > 0 && (
                  <div className="ml-10 space-y-4 border-l-2 border-primary/5 pl-4">
                    {comment.replies.map((reply: any) => (
                      <CommentItem 
                        key={reply.id} 
                        comment={reply} 
                        projectId={projectId} 
                        taskId={taskId}
                        isReply
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic">No comments yet. Start the conversation!</p>
          </div>
        )}
      </ScrollArea>

      <div className="pt-4 border-t space-y-2">
        {replyingTo && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/30 rounded-md text-[10px] font-bold uppercase tracking-wider animate-in slide-in-from-bottom-1">
            <span className="text-primary flex items-center gap-1.5">
              <Reply className="w-3 h-3" />
              Replying to Discussion
            </span>
            <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <form onSubmit={handleAddComment} className="flex gap-2">
          <Input 
            placeholder={replyingTo ? "Write a reply..." : "Write a comment..."} 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-white/50"
          />
          <Button type="submit" size="icon" className="shadow-md" disabled={!newComment.trim() || isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function CommentItem({ comment, projectId, taskId, onReply, isReply }: { 
  comment: any, 
  projectId: string, 
  taskId: string,
  onReply?: () => void,
  isReply?: boolean
}) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  
  const userRef = useMemoFirebase(() => {
    if (!firestore || !comment.authorId) return null;
    return doc(firestore, "users", comment.authorId);
  }, [firestore, comment.authorId]);
  
  const { data: profile } = useDoc(userRef);

  const isAuthor = user?.uid === comment.authorId;

  const handleUpdate = () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      return;
    }
    const ref = doc(firestore, "projects", projectId, "tasks", taskId, "comments", comment.id);
    updateDocumentNonBlocking(ref, {
      content: editContent.trim(),
      updatedAt: serverTimestamp(),
    });
    setIsEditing(false);
    toast({ title: "Comment updated" });
  };

  const handleDelete = () => {
    if (!confirm("Delete this comment?")) return;
    const ref = doc(firestore, "projects", projectId, "tasks", taskId, "comments", comment.id);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Comment deleted" });
  };

  const handleReact = (emoji: string) => {
    if (!user) return;
    const ref = doc(firestore, "projects", projectId, "tasks", taskId, "comments", comment.id);
    const existingReactions = comment.reactions?.[emoji] || [];
    const hasReacted = existingReactions.includes(user.uid);

    updateDocumentNonBlocking(ref, {
      [`reactions.${emoji}`]: hasReacted 
        ? arrayRemove(user.uid) 
        : arrayUnion(user.uid)
    });
  };

  return (
    <div className={cn(
      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 group",
      isReply && "scale-[0.98] origin-left"
    )}>
      <Avatar className={cn("shrink-0 border shadow-sm", isReply ? "w-7 h-7" : "w-9 h-9")}>
        <AvatarImage src={`https://picsum.photos/seed/${comment.authorId}/100/100`} />
        <AvatarFallback>{profile?.firstName?.[0] || '?'}</AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-foreground">
              {profile ? `${profile.firstName} ${profile.lastName}` : '...'}
            </span>
            <span className="text-[10px] text-muted-foreground italic">
              {comment.createdAt?.seconds 
                ? format(new Date(comment.createdAt.seconds * 1000), "h:mm a") 
                : "Just now"}
            </span>
          </div>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isEditing && onReply && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={onReply} title="Reply">
                <Reply className="w-3.5 h-3.5" />
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Smile className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex gap-1 p-1">
                {['👍', '🔥', '🚀', '👀'].map(emoji => (
                  <button 
                    key={emoji} 
                    className="p-1 hover:bg-secondary rounded transition-colors"
                    onClick={() => handleReact(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass-card">
                  <DropdownMenuItem onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive gap-2">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className={cn(
          "p-3 rounded-xl border border-border text-sm leading-relaxed transition-all",
          isAuthor ? "bg-primary/5 border-primary/10 shadow-sm" : "bg-secondary/30",
          isEditing && "ring-2 ring-primary ring-offset-1"
        )}>
          {isEditing ? (
            <div className="space-y-2">
              <Input 
                value={editContent} 
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <div className="flex justify-end gap-1">
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button size="sm" className="h-7 px-2" onClick={handleUpdate}>Save</Button>
              </div>
            </div>
          ) : (
            <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
          )}
        </div>

        {/* Reaction Display */}
        {comment.reactions && Object.entries(comment.reactions).some(([_, uids]: any) => uids.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(comment.reactions).map(([emoji, uids]: any) => {
              if (uids.length === 0) return null;
              const hasReacted = uids.includes(user?.uid);
              return (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={cn(
                    "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold transition-all",
                    hasReacted 
                      ? "bg-primary/10 border-primary/30 text-primary" 
                      : "bg-white border-border text-muted-foreground hover:border-primary/20"
                  )}
                >
                  <span>{emoji}</span>
                  <span>{uids.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
