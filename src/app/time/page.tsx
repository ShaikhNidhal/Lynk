
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, Calendar, RotateCcw, Loader2, Save, FolderKanban, ListTodo } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp, where } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function TimeTrackingPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("none");
  const [isSaving, setIsSubmitting] = useState(false);

  // 1. Fetch User Profile for Role Check
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: profile } = useDoc(userProfileRef);

  // 2. Fetch Projects (Admin sees all, others see member projects)
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !profile) return null;
    const projectsRef = collection(firestore, "projects");
    if (profile.role === 'Admin') {
      return query(projectsRef);
    }
    return query(projectsRef, where(`members.${user.uid}`, "!=", null));
  }, [firestore, user?.uid, profile]);
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  // 3. Fetch Tasks for selected project
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || selectedProjectId === "none") return null;
    return query(collection(firestore, "projects", selectedProjectId, "tasks"));
  }, [firestore, selectedProjectId]);
  const { data: tasks, isLoading: isTasksLoading } = useCollection(tasksQuery);

  // 4. Fetch User's Real Time Entries
  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "timeEntries"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, user?.uid]);
  const { data: timeEntries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const handleStart = () => {
    if (selectedProjectId === "none") {
      toast({ title: "Select a project", description: "You must select a project to start tracking.", variant: "destructive" });
      return;
    }
    setStartTime(new Date());
    setIsActive(true);
  };

  const handleSave = async () => {
    if (!user || !firestore || !startTime) return;
    setIsSubmitting(true);

    const project = projects?.find(p => p.id === selectedProjectId);
    const task = tasks?.find(t => t.id === selectedTaskId);

    const entryData = {
      userId: user.uid,
      projectId: selectedProjectId,
      projectName: project?.name || "Unknown Project",
      taskId: selectedTaskId !== "none" ? selectedTaskId : null,
      taskTitle: task?.title || "General Work",
      startTime: startTime.toISOString(),
      endTime: new Date().toISOString(),
      duration: time,
      createdAt: serverTimestamp(),
    };

    addDocumentNonBlocking(collection(firestore, "users", user.uid, "timeEntries"), entryData)
      .finally(() => {
        setIsActive(false);
        setTime(0);
        setStartTime(null);
        setIsSubmitting(false);
        toast({ title: "Time log saved", description: `Logged ${formatTime(time)} to ${project?.name}` });
      });
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedProjectName = useMemo(() => {
    return projects?.find(p => p.id === selectedProjectId)?.name || "Select Project";
  }, [projects, selectedProjectId]);

  const selectedTaskTitle = useMemo(() => {
    return tasks?.find(t => t.id === selectedTaskId)?.title || "Select Task";
  }, [tasks, selectedTaskId]);

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Time Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Track productivity and log work sessions in real-time.</p>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Tracker Controls */}
          <Card className="lg:col-span-1 glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Timer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-4">
                <div className="text-5xl font-mono font-bold tracking-tighter text-primary mb-2">
                  {formatTime(time)}
                </div>
                {startTime && (
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">
                    Started at {format(startTime, "h:mm a")}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <FolderKanban className="w-3 h-3" /> Project
                  </label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={isActive}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Pick a project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Project Selected</SelectItem>
                      {projects?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <ListTodo className="w-3 h-3" /> Specific Task (Optional)
                  </label>
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={isActive || selectedProjectId === "none"}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={isTasksLoading ? "Loading tasks..." : "Select task..."} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General Project Work</SelectItem>
                      {tasks?.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {isActive ? (
                  <>
                    <Button 
                      variant="outline"
                      className="flex-1 border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => setIsActive(false)}
                    >
                      <Pause className="w-4 h-4 mr-2" /> Pause
                    </Button>
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Log
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="w-full bg-primary h-11 text-lg font-bold"
                    onClick={handleStart}
                  >
                    <Play className="w-5 h-5 mr-2 fill-current" /> Start Timer
                  </Button>
                )}
              </div>
              
              {!isActive && time > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-[10px] uppercase font-bold text-muted-foreground"
                  onClick={() => { setTime(0); setStartTime(null); }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset Timer
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Time Log History */}
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Personal Time Log</CardTitle>
                <CardDescription className="text-xs">Your recent work sessions from all projects.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2 h-8 text-[10px] font-bold uppercase tracking-wider bg-white">
                <Calendar className="w-3.5 h-3.5" />
                This Week
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase font-bold tracking-widest">Project</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-widest">Task</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold tracking-widest">Date</TableHead>
                        <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isEntriesLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/40" />
                          </TableCell>
                        </TableRow>
                      ) : timeEntries && timeEntries.length > 0 ? (
                        timeEntries.map((entry) => (
                          <TableRow key={entry.id} className="group hover:bg-primary/5 transition-colors">
                            <TableCell className="py-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-foreground">{entry.projectName}</span>
                                <span className="text-[9px] text-muted-foreground uppercase font-mono">ID: {entry.projectId.slice(0, 8)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] bg-white border-primary/10">
                                {entry.taskTitle || "General"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {entry.createdAt?.seconds 
                                ? format(new Date(entry.createdAt.seconds * 1000), "MMM d, yyyy") 
                                : "Syncing..."}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono text-xs font-bold text-primary">
                                {formatTime(entry.duration)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground italic">
                            No time entries logged yet. Start tracking to see your data here!
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
