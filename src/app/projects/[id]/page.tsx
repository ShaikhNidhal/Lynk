
"use client";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Filter, 
  Settings, 
  Loader2,
  ChevronRight,
  Share2
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
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";

export default function ProjectBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // 1. Fetch Project Details
  const projectRef = useMemoFirebase(() => {
    if (!firestore || !projectId) return null;
    return doc(firestore, "projects", projectId);
  }, [firestore, projectId]);
  const { data: project, isLoading: isProjectLoading } = useDoc(projectRef);

  // 2. Fetch Tasks with QAP filter
  const tasksQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !user?.uid) return null;
    return query(
      collection(firestore, "projects", projectId, "tasks"),
      where(`members.${user.uid}`, "!=", null)
    );
  }, [firestore, projectId, user?.uid]);
  const { data: rawTasks, isLoading: isTasksLoading } = useCollection(tasksQuery);

  // 3. Client-side sorting and column organization
  const columns = useMemo(() => {
    const defaultCols = [
      { id: "todo", title: "To Do", tasks: [] as any[] },
      { id: "in-progress", title: "In Progress", tasks: [] as any[] },
      { id: "done", title: "Done", tasks: [] as any[] }
    ];

    if (!rawTasks) return defaultCols;

    const sortedTasks = [...rawTasks].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

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

  const handleDragStart = (taskId: string) => {
    setDraggingTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: string) => {
    if (!draggingTaskId || !firestore || !projectId) return;
    
    const taskRef = doc(firestore, "projects", projectId, "tasks", draggingTaskId);
    updateDocumentNonBlocking(taskRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
    
    setDraggingTaskId(null);
    toast({
      title: "Task Moved",
      description: `Moved to ${status.replace("-", " ")}`,
    });
  };

  if (isProjectLoading) {
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
            <a href="/projects">Back to Projects</a>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-md shadow-primary/20">
               {project.name?.[0]?.toUpperCase() || "P"}
             </div>
             <div>
               <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
               <p className="text-sm text-muted-foreground flex items-center gap-2">
                 {project.type} Board • <span className="text-green-600 font-medium">{project.status}</span>
               </p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2 overflow-hidden mr-4">
              {Object.keys(project.members || {}).slice(0, 4).map(uid => (
                <Avatar key={uid} className="inline-block border-2 border-white w-8 h-8">
                  <AvatarImage src={`https://picsum.photos/seed/${uid}/100/100`} />
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              ))}
              {Object.keys(project.members || {}).length > 4 && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white bg-secondary text-[10px] font-bold">
                  +{Object.keys(project.members || {}).length - 4}
                </div>
              )}
            </div>
            
            <ProjectMembersDialog 
              projectId={projectId} 
              projectName={project.name} 
              currentMembers={project.members || {}} 
            />

            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-2 bg-white">
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 items-start">
          {isTasksLoading ? (
            <div className="flex items-center justify-center w-full py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            </div>
          ) : (
            columns.map(column => (
              <div 
                key={column.id} 
                className="w-80 shrink-0 flex flex-col gap-4"
                onDragOver={handleDragOver}
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
                    trigger={
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Plus className="w-4 h-4" />
                      </Button>
                    }
                  />
                </div>

                <div className="flex flex-col gap-3 min-h-[150px] bg-secondary/10 rounded-xl p-2 transition-colors border-2 border-transparent hover:border-primary/5">
                  {column.tasks.map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onClick={() => handleTaskClick(task)}
                      onDragStart={() => handleDragStart(task.id)}
                    />
                  ))}
                  
                  <CreateTaskDialog 
                    projectId={projectId} 
                    projectMembers={project.members} 
                    initialStatus={column.id}
                    trigger={
                      <Button variant="ghost" className="w-full border-2 border-dashed border-border py-8 hover:bg-secondary hover:border-primary/20 text-muted-foreground text-xs font-semibold uppercase tracking-widest gap-2">
                        <Plus className="w-4 h-4" />
                        Add Task
                      </Button>
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
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
