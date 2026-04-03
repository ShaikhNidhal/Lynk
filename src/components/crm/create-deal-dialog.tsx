
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
import { LineChart, Plus, Loader2, DollarSign } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateDealDialog({ initialStage = "prospecting", trigger }: { initialStage?: string, trigger?: React.ReactNode }) {
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const companiesQuery = useMemoFirebase(() => firestore ? collection(firestore, "companies") : null, [firestore]);
  const { data: companies } = useCollection(companiesQuery);

  const [formData, setFormData] = useState({
    title: "",
    companyId: "none",
    value: "",
    stage: initialStage,
    probability: "20",
    expectedCloseDate: ""
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    const selectedCompany = companies?.find(c => c.id === formData.companyId);

    try {
      await addDocumentNonBlocking(collection(firestore, "deals"), {
        ...formData,
        value: Number(formData.value),
        probability: Number(formData.probability),
        companyName: selectedCompany?.name || "Independent",
        status: "Open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Deal Added", description: `"${formData.title}" added to pipeline.` });
      setIsOpen(false);
      setFormData({ title: "", companyId: "none", value: "", stage: initialStage, probability: "20", expectedCloseDate: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 shadow-lg bg-primary"><Plus className="w-4 h-4" />New Deal</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-primary" />
            Add Sales Opportunity
          </DialogTitle>
          <DialogDescription>Track a new potential project in your pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Deal Title</Label>
            <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Enterprise Web Portal" />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Client</Label>
            <Select value={formData.companyId} onValueChange={v => setFormData({...formData, companyId: v})}>
              <SelectTrigger><SelectValue placeholder="Select Company" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Independent / No Company</SelectItem>
                {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Est. Value ($)</Label>
              <Input type="number" required value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} placeholder="50000" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Win Prob. (%)</Label>
              <Input type="number" value={formData.probability} onChange={e => setFormData({...formData, probability: e.target.value})} placeholder="20" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expected Close</Label>
            <Input type="date" required value={formData.expectedCloseDate} onChange={e => setFormData({...formData, expectedCloseDate: e.target.value})} />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Deal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
