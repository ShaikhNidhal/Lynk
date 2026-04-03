"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  File, 
  Folder, 
  Plus, 
  Loader2, 
  Trash2, 
  ExternalLink, 
  Search,
  Grid,
  List as ListIcon,
  Download,
  Filter,
  Paperclip,
  MoreVertical,
  X,
  FileText,
  Upload
} from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, serverTimestamp, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface ProjectFilesProps {
  projectId: string;
  projectMembers: Record<string, string>;
}

export function ProjectFiles({ projectId, projectMembers }: ProjectFilesProps) {
  const { user, profile, storage, firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch project-level attachments
  const filesQuery = useMemoFirebase(() => {
    if (!firestore || !projectId || !user?.uid) return null;
    return query(
      collection(firestore, "projects", projectId, "attachments"),
      orderBy("createdAt", "desc")
    );
  }, [firestore, projectId, user?.uid]);

  const { data: files, isLoading } = useCollection(filesQuery);

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    return files.filter(f => 
      f.fileName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !storage || !profile?.currentWorkspaceId) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Path based on multi-tenant security rules: /workspaces/{workspaceId}/{allPaths=**}
      const storagePath = `workspaces/${profile.currentWorkspaceId}/projects/${projectId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);

      const filesRef = collection(firestore, "projects", projectId, "attachments");
      await addDocumentNonBlocking(filesRef, {
        fileName: file.name,
        fileUrl: downloadUrl,
        storagePath: storagePath,
        mimeType: file.type,
        sizeBytes: file.size,
        uploaderId: user.uid,
        members: projectMembers,
        version: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Asset Uploaded", description: `${file.name} has been added to the project.` });
      setIsAdding(false);
    } catch (error: any) {
      console.error("Upload failed", error);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (file: any) => {
    if (!firestore || !storage) return;
    if (!confirm(`Remove "${file.fileName}" from the project?`)) return;

    try {
      // Delete from Storage if it's a real file
      if (file.storagePath) {
        const storageRef = ref(storage, file.storagePath);
        await deleteObject(storageRef);
      }

      // Delete from Firestore
      const docRef = doc(firestore, "projects", projectId, "attachments", file.id);
      deleteDocumentNonBlocking(docRef);
      
      toast({ title: "Asset Removed", variant: "destructive" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-sm:w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search assets..." 
              className="pl-9 bg-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-secondary/20 p-1 rounded-lg border">
            <Button 
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <Button 
            className="gap-2 bg-primary shadow-lg" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Asset
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary/20" /></div>
      ) : filteredFiles.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="group glass-card overflow-hidden hover:border-primary/40 transition-all">
                <div className="h-32 bg-secondary/20 relative flex items-center justify-center border-b">
                  <FileText className="w-12 h-12 text-primary/20" />
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFile(file)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Asset
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{file.fileName}</h4>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                      Added {file.createdAt?.seconds ? format(new Date(file.createdAt.seconds * 1000), "MMM d, yyyy") : 'Recently'}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <Badge variant="outline" className="text-[9px] uppercase h-5 font-bold">v{file.version || 1}</Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest text-primary gap-1.5" asChild>
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="glass-card">
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-4 group hover:bg-secondary/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-primary/60 border">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold truncate max-w-[300px]">{file.fileName}</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                        v{file.version || 1} • {file.createdAt?.seconds ? format(new Date(file.createdAt.seconds * 1000), "MMM d, yyyy") : 'Just now'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteFile(file)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      ) : (
        <div className="text-center py-20 bg-secondary/5 rounded-2xl border-2 border-dashed">
          <Folder className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold">No project assets found</h3>
          <p className="text-muted-foreground mb-6">Centralize technical specs, requirements, and design files here.</p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Upload First Asset
          </Button>
        </div>
      )}
    </div>
  );
}
