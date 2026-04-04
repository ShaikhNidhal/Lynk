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
import { Plus, Loader2, UserPlus } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, serverTimestamp, query, where } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CreateContactDialog({ initialCompanyId = "none", trigger }: { initialCompanyId?: string, trigger?: React.ReactNode }) {
  const { firestore, profile } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const companiesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "companies"),
      where("workspaceId", "==", profile.currentWorkspaceId)
    );
  }, [firestore, profile?.currentWorkspaceId]);
  
  const { data: companies } = useCollection(companiesQuery);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    companyId: initialCompanyId,
    isPrimary: false
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !profile?.currentWorkspaceId) return;
    setLoading(true);

    const selectedCompany = companies?.find(c => c.id === formData.companyId);

    try {
      await addDocumentNonBlocking(collection(firestore, "contacts"), {
        ...formData,
        workspaceId: profile.currentWorkspaceId,
        companyName: selectedCompany?.name || "Independent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Contact Created", description: `${formData.firstName} ${formData.lastName} added.` });
      setIsOpen(false);
      setFormData({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", companyId: initialCompanyId, isPrimary: false });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 shadow-lg bg-primary"><Plus className="w-4 h-4" />Add Contact</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            New Stakeholder
          </DialogTitle>
          <DialogDescription>Map a new individual to a client organization or project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">First Name</Label>
              <Input required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} placeholder="Jane" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Name</Label>
              <Input required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} placeholder="Doe" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company Association</Label>
            <Select value={formData.companyId} onValueChange={v => setFormData({...formData, companyId: v})}>
              <SelectTrigger><SelectValue placeholder="Select Organization" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Independent / No Company</SelectItem>
                {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jane@company.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Phone</Label>
              <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Job Title</Label>
            <Input value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="e.g., Chief Technology Officer" />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Contact
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}