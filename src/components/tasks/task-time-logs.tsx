
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
  Trash2,
  Pause,
  Check
} from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
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
  const [manualDuration, setManualDuration] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch persistent active timer for this specific task
  const activeTimerQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !taskId) return null;
    return query(
      collection(firestore, "users", user.uid, "timeEntries"),
      where("taskId", "==", taskId),
      where("endTime", "==", null),
      limit(1)
    );
  }, [firestore, user?.uid, taskId]);
  const { data: activeEntries } = useCollection(activeTimerQuery);
  const activeEntry = activeEntries?.[0] || null;

  // 2. Fetch completed time entries for this specific task
  const timeQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !taskId) return null;
    return query(
      collection(firestore, "users", user.uid, "timeEntries"),
      where("taskId", "==", taskId),
      where("endTime", "!=", null),
      orderBy("endTime", "desc"),
      limit(20)
    );
  }, [firestore, user?.uid, taskId]);
  const { data: rawEntries, isLoading } = useCollection(timeQuery);

  const totalMinutes = useMemo(() => {
    if (!rawEntries) return 0;
    return rawEntries.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0);
  }, [rawEntries]);

  const handleStartTimer = () => {
    if (!firestore || !user || !taskId) return;
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "timeEntries"), {
      userId: user.uid,
      projectId,
      taskId,
      startTime: new Date().toISOString(),
      endTime: null,
      isBillable: true,
      createdAt: serverTimestamp(),
    });
    toast({ title: "Timer started for task" });
  };

  const handleStopTimer = () => {
    if (!activeEntry || !firestore || !user) return;
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - new Date(activeEntry.startTime).getTime()) / 1000);
    
    updateDocumentNonBlocking(doc(firestore, "users", user.uid, "timeEntries", activeEntry.id), {
      endTime: endTime.toISOString(),
      duration: duration,
      updatedAt: serverTimestamp(),
    });
    toast({ title: "Task session logged" });
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDuration || !user || !firestore) return;

    setIsSubmitting(true);
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "timeEntries"), {
      userId: user.uid,
      projectId,
      taskId,
      duration: Number(manualDuration) * 60, // Store as seconds
      description: manualNotes.trim() || "Manual log",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      isBillable: true,
      createdAt: serverTimestamp(),
    }).finally(() => {
      setManualDuration("");
      setManualNotes("");
      setIsAdding(false);
      setIsSubmitting(false);
      toast({ title: "Manual time entry added" });
    });
  };

  const handleDelete = (entryId: string) => {
    if (!firestore || !user) return;
    deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "timeEntries", entryId));
    toast({ title: "Entry removed", variant: "destructive" });
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="flex flex-col h-[500px] space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-bold text-sm tracking-tight text-foreground">
          <History className="w-4 h-4 text-primary" />
          Task Productivity
        </div>
        {!activeEntry && !isAdding && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsAdding(true)} className="h-8 text-[10px] font-bold uppercase">Manual</Button>
            <Button size="sm" onClick={handleStartTimer} className="h-8 gap-1.5 text-[10px] font-bold uppercase bg-primary">
              <Play className="w-3 h-3 fill-current" /> Start
            </Button>
          </div>
        )}
      </div>

      {activeEntry && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-in pulse duration-2000 infinite">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
              <Clock className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <p className="text-xs font-bold text-primary">Timer Active</p>
              <p className="text-[10px] text-muted-foreground">Running since {format(new Date(activeEntry.startTime), "h:mm a")}</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" className="gap-2 font-bold text-[10px] uppercase" onClick={handleStopTimer}>
            <Pause className="w-3.5 h-3.5 fill-current" /> Stop Session
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-secondary/20 p-3 rounded-lg border border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Effort</p>
          <p className="text-xl font-bold">{formatDuration(totalMinutes)}</p>
        </div>
        <div className="bg-accent/5 p-3 rounded-lg border border-accent/10">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent/70 mb-1">Status</p>
          <Badge variant="outline" className="mt-1 text-[9px] h-5 uppercase">{totalMinutes > 0 ? 'Logged' : 'Est Pending'}</Badge>
        </div>
      </div>

      {isAdding && (
        <div className="bg-secondary/30 p-4 rounded-lg border border-primary/20 space-y-3 animate-in zoom-in-95">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Minutes Worked</Label>
            <Input type="number" placeholder="e.g., 45" value={manualDuration} onChange={(e) => setManualDuration(e.target.value)} autoFocus />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Log Description</Label>
            <Input placeholder="Describe the work..." value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1 text-[10px] font-bold uppercase" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button className="flex-1 text-[10px] font-bold uppercase gap-2" onClick={handleManualAdd} disabled={!manualDuration || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save Log
            </Button>
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" /></div>
        ) : rawEntries && rawEntries.length > 0 ? (
          <div className="space-y-2">
            {rawEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-border group hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center text-primary/60">
                    <Timer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{Math.round(entry.duration / 60)} mins</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{format(new Date(entry.endTime), "MMM d")}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic line-clamp-1">{entry.description || 'Task work'}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(entry.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-secondary/5">
            <Timer className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic">No session history.</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
