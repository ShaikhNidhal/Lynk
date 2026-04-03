
"use client";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Filter, 
  Settings, 
  Loader2,
  Calendar,
  BarChart2,
  LayoutDashboard,
  Trello,
  Flag,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, use } from "react";
import { useUser, useFirebase, useCollection, useDoc, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, serverTimestamp } from "firebase/firestore";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProjectMembersDialog } from "@/components/projects/project-members-dialog";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectTimeline } from "@/components/projects/project-timeline";
import { ProjectAnalytics } from "@/components/projects/project-analytics";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // 1. Fetch User Profile for Admin check
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  // 2. Fetch Project Details
  const projectRef = useMemoFirebase(() => {
    if (!firestore || !projectId) return null;
    return doc(firestore, "projects", projectId);
  }, [firestore, projectId]);
  const { data: project, isLoading: isProjectLoading } = useDoc(projectRef);

  // 3. Fetch Tasks
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !user?.uid || isProfileLoading || !profile) return null;
    const tasksRef = collection(firestore, "projects", projectId, "tasks");
    if (profile.role === 'Admin') return query(tasksRef);
    return query(tasksRef, where(`members.${user.uid}`, "!=", null));
  }, [firestore, projectId, user?.uid, profile, isProfileLoading]);
  const { data: rawTasks, isLoading: isTasksLoading } = useCollection(tasksQuery);

  // 4. Fetch Milestones
  const milestonesQuery = useMemoFirebase(() => {
    if (!firestore || !projectId) return null;
    return query(collection(firestore, "projects", projectId, "milestones"));
  }, [firestore, projectId]);
  const { data: milestones } = useCollection(milestonesQuery);

  const columns = useMemo(() => {
    const defaultCols = [
      { id: "todo", title: "To Do", tasks: [] as any[] },
      { id: "in-progress", title: "In Progress", tasks: [] as any[] },
      { id: "done", title: "Done", tasks: [] as any[] }
    ];
    if (!rawTasks) return defaultCols;
    const sortedTasks = [...rawTasks].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    sortedTasks.forEach(task => {
      const status = task.status?.toLowerCase();
      const col = defaultCols.find(c => c.id === status) || defaultCols[0];
      col.tasks.push(task);
    });
    return defaultCols;
  }, [rawTasks]);

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const handleDrop = (status: string) => {
    if (!draggingTaskId || !firestore || !projectId) return;
    const taskRef = doc(firestore, "projects", projectId, "tasks", draggingTaskId);
    updateDocumentNonBlocking(taskRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
    setDraggingTaskId(null);
    toast({ title: "Task Moved", description: `Moved to ${status.replace("-", " ")}` });
  };

  const handleArchiveProject = () => {
    if (!firestore || !projectId) return;
    if (confirm("Archive this project? It will be removed from active boards.")) {
      updateDocumentNonBlocking(doc(firestore, "projects", projectId), {
        status: "Cancelled",
        updatedAt: serverTimestamp()
      });
      toast({ title: "Project Archived" });
      router.push("/projects");
    }
  };

  const isLoading = isProjectLoading || isProfileLoading;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
          <h2 className="text-xl font-bold">Project not found</h2>
          <Button asChild variant="outline">
            <Link href="/projects">Back to Projects</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/projects"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-md">
                 {project.name?.[0]?.toUpperCase() || "P"}
               </div>
               <div>
                 <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                   {project.name}
                   {profile?.role === 'Admin' && <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter h-4">Admin Access</Badge>}
                 </h1>
                 <p className="text-sm text-muted-foreground flex items-center gap-2">
                   {project.companyName || 'Independent'} • <span className="text-green-600 font-medium">{project.status}</span>
                 </p>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 mr-2">
              {Object.keys(project.members || {}).slice(0, 4).map(uid => (
                <Avatar key={uid} className="w-8 h-8 border-2 border-white ring-1 ring-border">
                  <AvatarImage src={`https://picsum.photos/seed/${uid}/100/100`} />
                  <AvatarFallback>?</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <ProjectMembersDialog projectId={projectId} projectName={project.name} currentMembers={project.members || {}} />
            <Button variant="outline" size="sm" className="gap-2 bg-white" onClick={handleArchiveProject}>
              <Trash2 className="w-4 h-4 text-destructive" />
              Archive
            </Button>
          </div>
        </div>

        {/* View Switcher */}
        <Tabs defaultValue="board" className="flex-1 flex flex-col min-h-0">
          <TabsList className="bg-secondary/20 p-1 self-start">
            <TabsTrigger value="board" className="gap-2"><Trello className="w-4 h-4" /> Kanban</TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2"><Calendar className="w-4 h-4" /> Timeline</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2"><BarChart2 className="w-4 h-4" /> Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="flex-1 mt-6">
            <div className="flex gap-6 overflow-x-auto pb-4 items-start h-full">
              {isTasksLoading ? (
                <div className="flex items-center justify-center w-full py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                </div>
              ) : (
                columns.map(column => (
                  <div 
                    key={column.id} 
                    className="w-80 shrink-0 flex flex-col gap-4"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(column.id)}
                  >
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm tracking-widest uppercase text-muted-foreground">{column.title}</h3>
                        <Badge variant="secondary" className="rounded-sm px-1.5 h-5">{column.tasks.length}</Badge>
                      </div>
                      <CreateTaskDialog 
                        projectId={projectId} 
                        projectMembers={project.members} 
                        initialStatus={column.id}
                        trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Plus className="w-4 h-4" /></Button>}
                      />
                    </div>

                    <div className="flex flex-col gap-3 min-h-[500px] bg-secondary/10 rounded-xl p-2 transition-colors border-2 border-transparent hover:border-primary/5">
                      {column.tasks.map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onClick={() => handleTaskClick(task)}
                          onDragStart={() => setDraggingTaskId(task.id)}
                        />
                      ))}
                      <CreateTaskDialog 
                        projectId={projectId} 
                        projectMembers={project.members} 
                        initialStatus={column.id}
                        trigger={
                          <Button variant="ghost" className="w-full border-2 border-dashed border-border py-8 hover:bg-secondary text-muted-foreground text-xs font-semibold uppercase tracking-widest gap-2">
                            <Plus className="w-4 h-4" /> Add Task
                          </Button>
                        }
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 mt-6">
            <ProjectTimeline projectId={projectId} tasks={rawTasks || []} milestones={milestones || []} />
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 mt-6">
            <ProjectAnalytics project={project} tasks={rawTasks || []} />
          </TabsContent>
        </Tabs>
      </div>

      <TaskDetailSheet 
        isOpen={isTaskDetailOpen} 
        onOpenChange={setIsTaskDetailOpen} 
        task={selectedTask}
        projectId={projectId}
        projectMembers={project.members}
      />
    </AppShell>
  );
}
