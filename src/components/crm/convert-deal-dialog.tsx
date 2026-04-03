
"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Loader2, Rocket, Briefcase } from "lucide-react";
import { useFirebase, useUser } from "@/firebase";
import { collection, serverTimestamp, doc } from "firebase/firestore";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function ConvertDealDialog({ deal }: { deal: any }) {
  const { firestore, user } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const [projectName, setProjectName] = useState(deal.title);

  const handleConvert = async () => {
    if (!firestore || !user) return;
    setLoading(true);

    try {
      // 1. Create the new project
      const projectRef = doc(collection(firestore, "projects"));
      const projectId = projectRef.id;

      setDocumentNonBlocking(projectRef, {
        id: projectId,
        name: projectName,
        companyId: deal.companyId,
        dealId: deal.id,
        description: `Project initialized from Deal: ${deal.title}`,
        status: "Active",
        type: "Scrum",
        budget: deal.value,
        ownerId: user.uid,
        members: {
          [user.uid]: "owner"
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Mark deal as "Won" or "Closed"
      const dealRef = doc(firestore, "deals", deal.id);
      updateDocumentNonBlocking(dealRef, {
        status: "Won",
        projectId: projectId,
        updatedAt: serverTimestamp()
      });

      toast({ 
        title: "Deal Converted!", 
        description: `"${projectName}" has been created as an active project.` 
      });
      
      setIsOpen(false);
      router.push(`/projects/${projectId}`);
    } catch (e: any) {
      toast({ title: "Conversion Failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Convert to Project"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Initialize Project
          </DialogTitle>
          <DialogDescription>
            Transform this sales opportunity into a live delivery board.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-1">
              <span>Source Deal</span>
              <span>${deal.value?.toLocaleString()}</span>
            </div>
            <p className="text-sm font-bold truncate">{deal.title}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Name</Label>
            <Input 
              value={projectName} 
              onChange={e => setProjectName(e.target.value)} 
              placeholder="Enter board name..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleConvert} disabled={loading} className="gap-2 bg-primary">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm & Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
