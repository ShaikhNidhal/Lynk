
"use client";

import React, { useState, useMemo } from "react";
import { 
  Timer, 
  History, 
  Plus, 
  Loader2, 
  Play, 
  StopCircle, 
  Clock,
  Trash2
} from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface TaskTimeLogsProps {
  projectId: string;
  taskId: string;
  projectMembers: Record<string, string>;
}

export function TaskTimeLogs({ projectId, taskId, projectMembers }: TaskTimeLogsProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isAdding, setIsAdding] = useState(false);
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch time entries for this specific task
  const timeQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !taskId || !user?.uid) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks", taskId, "timeEntries"),
      where(`members.${user.uid}`, "!=", null),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, projectId, taskId, user?.uid]);

  const { data: rawEntries, isLoading } = useCollection(timeQuery);

  const totalMinutes = useMemo(() => {
    if (!rawEntries) return 0;
    return rawEntries.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0);
  }, [rawEntries]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!duration || !user || !firestore) return;

    setIsSubmitting(true);
    const timeRef = collection(firestore, "projects", projectId, "tasks", taskId, "timeEntries");
    
    addDocumentNonBlocking(timeRef, {
      userId: user.uid,
      userName: user.displayName || "Team Member",
      duration: Number(duration),
      description: notes.trim() || "Manual entry",
      isBillable: true,
      members: projectMembers,
      createdAt: serverTimestamp(),
    }).finally(() => {
      setDuration("");
      setNotes("");
      setIsAdding(false);
      setIsSubmitting(false);
      toast({ title: "Time logged successfully" });
    });
  };

  const handleDelete = (entryId: string) => {
    if (!firestore) return;
    const ref = doc(firestore, "projects", projectId, "tasks", taskId, "timeEntries", entryId);
    deleteDocumentNonBlocking(ref);
    toast({ title: "Entry removed", variant: "destructive" });
  };

  return (
    <div className="flex flex-col h-[500px] space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-foreground">
          <History className="w-4 h-4 text-primary" />
          Productivity Log
        </div>
        {!isAdding && (
          <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="h-8 gap-1.5 text-[10px] font-bold uppercase">
            <Plus className="w-3 h-3" />
            Add Time
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-1">Total Tracked</p>
          <p className="text-xl font-bold">{(totalMinutes / 60).toFixed(1)} hrs</p>
        </div>
        <div className="bg-accent/5 p-3 rounded-lg border border-accent/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent/70 mb-1">Billable Ratio</p>
          <p className="text-xl font-bold">100%</p>
        </div>
      </div>

      {isAdding && (
        <div className="bg-secondary/20 p-4 rounded-lg border border-primary/20 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Minutes Worked</Label>
            <Input 
              type="number" 
              placeholder="e.g., 60" 
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Work Notes</Label>
            <Input 
              placeholder="What did you work on?" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 text-xs" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button className="flex-1 text-xs gap-2" onClick={handleAddEntry} disabled={!duration || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              Save Entry
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : rawEntries && rawEntries.length > 0 ? (
          <div className="space-y-2">
            {rawEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Timer className="w-4 h-4 text-primary/60" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{entry.duration} mins</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{entry.createdAt?.seconds ? format(new Date(entry.createdAt.seconds * 1000), "MMM d") : "Today"}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground italic line-clamp-1">{entry.description}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                  onClick={() => handleDelete(entry.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-secondary/5">
            <Timer className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic">No time logs recorded yet.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
