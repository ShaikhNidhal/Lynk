
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Play, Pause, Calendar, RotateCcw, Loader2, Save, FolderKanban, ListTodo, TrendingUp, BarChart3, Clock, CheckCircle2, FileText, Download, Filter, Search, Trash2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useUser, useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc, serverTimestamp, where, Timestamp } from "firebase/firestore";
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfDay, startOfWeek, startOfMonth, isAfter, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export default function TimeTrackingPage() {
  const { user, profile, firestore } = useFirebase();
  const { toast } = useToast();
  
  const [activeTime, setActiveTime] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("none");
  const [reportFilter, setReportFilter] = useState("week");

  // 2. Fetch Projects - filtered by workspace
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !profile?.currentWorkspaceId) return null;
    const projectsRef = collection(firestore, "projects");
    return query(
      projectsRef, 
      where("workspaceId", "==", profile.currentWorkspaceId)
    );
  }, [firestore, user?.uid, profile?.currentWorkspaceId]);
  const { data: projects } = useCollection(projectsQuery);

  // 3. Fetch Active Timer (Persistent State)
  const activeTimerQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "timeEntries"),
      where("endTime", "==", null),
      limit(1)
    );
  }, [firestore, user?.uid]);
  const { data: activeTimerEntries, isLoading: isActiveLoading } = useCollection(activeTimerQuery);
  const activeEntry = activeTimerEntries?.[0] || null;

  // 4. Fetch History
  const entriesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "timeEntries"),
      where("endTime", "!=", null),
      orderBy("endTime", "desc"),
      limit(50)
    );
  }, [firestore, user?.uid]);
  const { data: timeEntries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (activeEntry) {
      const start = new Date(activeEntry.startTime).getTime();
      interval = setInterval(() => {
        const now = Date.now();
        setActiveTime(Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      setActiveTime(0);
    }
    return () => clearInterval(interval);
  }, [activeEntry]);

  // Summary Logic
  const summary = useMemo(() => {
    if (!timeEntries) return { today: 0, week: 0, month: 0, billable: 0 };
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    return timeEntries.reduce((acc, entry) => {
      const entryDate = new Date(entry.endTime);
      const duration = Number(entry.duration) || 0;
      
      if (isAfter(entryDate, todayStart)) acc.today += duration;
      if (isAfter(entryDate, weekStart)) acc.week += duration;
      if (isAfter(entryDate, monthStart)) acc.month += duration;
      if (entry.isBillable) acc.billable += duration;
      
      return acc;
    }, { today: 0, week: 0, month: 0, billable: 0 });
  }, [timeEntries]);

  const handleStartTimer = () => {
    if (selectedProjectId === "none") {
      toast({ title: "Select a project", description: "You must select a project to start tracking.", variant: "destructive" });
      return;
    }
    if (!firestore || !user) return;

    const project = projects?.find(p => p.id === selectedProjectId);
    
    addDocumentNonBlocking(collection(firestore, "users", user.uid, "timeEntries"), {
      userId: user.uid,
      projectId: selectedProjectId,
      projectName: project?.name || "Unknown Project",
      taskId: selectedTaskId !== "none" ? selectedTaskId : null,
      startTime: new Date().toISOString(),
      endTime: null,
      isBillable: true,
      createdAt: serverTimestamp(),
    });
    
    toast({ title: "Timer Started", description: `Tracking for ${project?.name}` });
  };

  const handleStopTimer = () => {
    if (!activeEntry || !firestore || !user) return;
    setIsSubmitting(true);

    const endTime = new Date();
    const startTime = new Date(activeEntry.startTime);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const entryRef = doc(firestore, "users", user.uid, "timeEntries", activeEntry.id);
    updateDocumentNonBlocking(entryRef, {
      endTime: endTime.toISOString(),
      duration: duration,
      updatedAt: serverTimestamp(),
    });

    setIsSubmitting(false);
    toast({ title: "Timer Stopped", description: `Logged ${formatDuration(duration)}` });
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteEntry = (id: string) => {
    if (!firestore || !user) return;
    if (confirm("Delete this time entry?")) {
      deleteDocumentNonBlocking(doc(firestore, "users", user.uid, "timeEntries", id));
      toast({ title: "Entry deleted" });
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              Time Tracking
            </h1>
            <p className="text-muted-foreground mt-1">Audit your daily productivity and manage project allocations.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2 bg-white">
              <Download className="w-4 h-4" /> Export Report
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Today" value={formatDuration(summary.today)} subtitle="Daily Log" icon={<CheckCircle2 className="text-green-500" />} />
          <SummaryCard title="This Week" value={formatDuration(summary.week)} subtitle="7-Day Cycle" icon={<TrendingUp className="text-primary" />} />
          <SummaryCard title="This Month" value={formatDuration(summary.month)} subtitle="Billing Period" icon={<BarChart3 className="text-accent" />} />
          <SummaryCard title="Billable Ratio" value={`${summary.week > 0 ? Math.round((summary.billable / summary.week) * 100) : 0}%`} subtitle="Revenue Target" icon={<TrendingUp className="text-orange-500" />} />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Active Tracker Control */}
          <Card className="lg:col-span-1 glass-card border-primary/20 shadow-xl">
            <CardHeader className="bg-primary/5 pb-4 border-b">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary/70">Terminal Control</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="text-center">
                <div className="text-6xl font-mono font-black tracking-tighter text-primary mb-4 drop-shadow-sm">
                  {formatDuration(activeTime)}
                </div>
                {activeEntry && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-accent">Active Session Initialized</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {activeEntry.projectName}
                    </p>
                  </div>
                )}
              </div>

              {!activeEntry ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Context Mapping</Label>
                    <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                      <SelectTrigger className="bg-white border-primary/10 h-11">
                        <SelectValue placeholder="Target Project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project Context</SelectItem>
                        {projects?.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all gap-3"
                    onClick={handleStartTimer}
                  >
                    <Play className="w-6 h-6 fill-current" />
                    Initialize Timer
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in-95">
                  <Button 
                    variant="destructive"
                    className="w-full h-14 text-lg font-bold shadow-lg shadow-destructive/20 transition-all gap-3"
                    onClick={handleStopTimer}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Pause className="w-6 h-6 fill-current" />}
                    Conclude Session
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground italic">
                    Session started at {format(new Date(activeEntry.startTime), "h:mm a")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Records & Reporting */}
          <Card className="lg:col-span-2 glass-card overflow-hidden">
            <Tabs defaultValue="history" className="w-full">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-0 px-6">
                <TabsList className="bg-transparent h-12 p-0 gap-6">
                  <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0 h-12 text-xs font-bold uppercase tracking-widest">
                    Live Audit
                  </TabsTrigger>
                  <TabsTrigger value="reports" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none px-0 h-12 text-xs font-bold uppercase tracking-widest">
                    Analytics Report
                  </TabsTrigger>
                </TabsList>
                <div className="hidden sm:flex items-center gap-2">
                  <Badge variant="secondary" className="h-5 px-1.5 text-[9px] uppercase font-bold tracking-tighter">
                    {timeEntries?.length || 0} Records Found
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <TabsContent value="history" className="mt-0">
                  <ScrollArea className="h-[500px] w-full">
                    <Table>
                      <TableHeader className="bg-secondary/10 sticky top-0 z-10">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4 pl-6">Workspace</TableHead>
                          <TableHead className="text-[10px] uppercase font-bold tracking-widest py-4">Timestamp</TableHead>
                          <TableHead className="text-right text-[10px] uppercase font-bold tracking-widest py-4 pr-6">Net Log</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isEntriesLoading ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-64 text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary/20" />
                            </TableCell>
                          </TableRow>
                        ) : timeEntries && timeEntries.length > 0 ? (
                          timeEntries.map((entry) => (
                            <TableRow key={entry.id} className="group hover:bg-primary/5 transition-colors">
                              <TableCell className="py-4 pl-6">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-foreground">{entry.projectName}</span>
                                  <span className="text-[9px] text-muted-foreground uppercase font-medium">Session ID: {entry.id.slice(0, 8)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-medium">
                                {format(new Date(entry.endTime), "MMM d, yyyy • h:mm a")}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-3">
                                  <span className="font-mono text-sm font-bold text-primary">
                                    {formatDuration(entry.duration)}
                                  </span>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteEntry(entry.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="h-64 text-center">
                              <div className="flex flex-col items-center gap-2 opacity-30">
                                <Clock className="w-12 h-12" />
                                <p className="text-sm italic font-medium">No archived work sessions.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="reports" className="p-6 mt-0">
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Time Range</Label>
                        <Select value={reportFilter} onValueChange={setReportFilter}>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="week">Past 7 Days</SelectItem>
                            <SelectItem value="month">Current Month</SelectItem>
                            <SelectItem value="year">Past Year</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Focus Filter</Label>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input className="pl-8 bg-white" placeholder="Search project or description..." />
                        </div>
                      </div>
                    </div>

                    <div className="p-12 text-center border-2 border-dashed rounded-xl bg-secondary/5">
                      <FileText className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                      <h3 className="font-bold text-foreground">Advanced Reports Hub</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">Detailed filtering and PDF generation for the "{reportFilter}" period is ready for export.</p>
                      <Button variant="outline" className="mt-6 gap-2 bg-white">
                        <Download className="w-4 h-4" />
                        Download PDF Audit
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <Card className="glass-card overflow-hidden group hover:border-primary/40 transition-all border-primary/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">{title}</p>
          <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
