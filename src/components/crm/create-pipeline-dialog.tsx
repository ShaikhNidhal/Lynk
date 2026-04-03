
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
import { Settings2, Plus, Loader2, X, Palette } from "lucide-react";
import { useFirebase, useUser } from "@/firebase";
import { collection, serverTimestamp, doc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";

const COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-green-500", "bg-yellow-500", "bg-red-500", "bg-cyan-500"
];

export function CreatePipelineDialog() {
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [stages, setStages] = useState([
    { id: "prospecting", name: "Prospecting", color: "bg-blue-500", probability: 20 },
    { id: "proposal", name: "Proposal", color: "bg-orange-500", probability: 50 },
    { id: "closed", name: "Closed Won", color: "bg-green-500", probability: 100 }
  ]);

  const addStage = () => {
    const id = `stage_${Math.random().toString(36).substr(2, 9)}`;
    setStages([...stages, { id, name: "New Stage", color: "bg-primary", probability: 10 }]);
  };

  const removeStage = (id: string) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStage = (id: string, field: string, value: any) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleCreate = async () => {
    if (!firestore || !name) return;
    setLoading(true);

    try {
      const pipelineRef = doc(collection(firestore, "pipelines"));
      setDocumentNonBlocking(pipelineRef, {
        id: pipelineRef.id,
        name,
        stages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      toast({ title: "Pipeline Created", description: `"${name}" is now available.` });
      setIsOpen(false);
      setName("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-white">
          <Settings2 className="w-4 h-4" />
          Pipelines
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] glass-card">
        <DialogHeader>
          <DialogTitle>Configure Sales Pipeline</DialogTitle>
          <DialogDescription>Define the stages and win probabilities for your deal workflow.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pipeline Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Enterprise Sales" />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Workflow Stages</Label>
              <Button variant="ghost" size="sm" onClick={addStage} className="h-7 text-[10px] uppercase font-bold text-primary">
                <Plus className="w-3 h-3 mr-1" /> Add Stage
              </Button>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {stages.map((stage, idx) => (
                <div key={stage.id} className="flex items-center gap-3 p-3 bg-secondary/10 rounded-lg group">
                  <div className={cn("w-4 h-4 rounded-full shrink-0", stage.color)} />
                  <Input 
                    value={stage.name} 
                    onChange={e => updateStage(stage.id, 'name', e.target.value)}
                    className="h-8 text-xs font-bold bg-transparent border-none shadow-none focus-visible:ring-0 p-0"
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] font-bold text-muted-foreground">Prob%</Label>
                    <Input 
                      type="number" 
                      value={stage.probability} 
                      onChange={e => updateStage(stage.id, 'probability', Number(e.target.value))}
                      className="h-8 w-16 text-xs bg-white"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeStage(stage.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !name} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
