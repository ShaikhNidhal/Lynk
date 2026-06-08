
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
import { Building2, Plus, Loader2 } from "lucide-react";
import { useFirebase, useUser } from "@/firebase";
import { collection, serverTimestamp, addDoc } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

export function CreateCompanyDialog() {
  const { firestore } = useFirebase();
  const { profile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    website: "",
    street: "",
    city: "",
    state: "",
    status: "Lead"
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !profile?.currentWorkspaceId) return;
    setLoading(true);

    try {
      // Bug #14 fix: use addDoc directly (blocking) so errors are properly caught
      await addDoc(collection(firestore, "companies"), {
        name: formData.name,
        industry: formData.industry,
        website: formData.website,
        // Bug #2 fix: save as structured object to match how all pages read it
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
        },
        status: formData.status,
        workspaceId: profile.currentWorkspaceId,
        healthScore: 100,
        lifetimeValue: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Company Created", description: `${formData.name} added to directory.` });
      setIsOpen(false);
      setFormData({ name: "", industry: "", website: "", street: "", city: "", state: "", status: "Lead" });
    } catch (e: any) {
      toast({ title: "Error creating company", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg bg-primary">
          <Plus className="w-4 h-4" />
          Add Company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            New Client Organization
          </DialogTitle>
          <DialogDescription>Enter corporate details to establish a new client relationship.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company Name</Label>
            <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g., Acme Corp" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Industry</Label>
              <Input value={formData.industry} onChange={e => setFormData({...formData, industry: e.target.value})} placeholder="e.g., Fintech" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lead">Lead</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Churned">Churned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Website</Label>
            <Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://..." />
          </div>
          {/* Bug #2 fix: structured address fields instead of a flat string */}
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Street Address</Label>
            <Input value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} placeholder="123 Business St" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">City</Label>
              <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="New York" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">State</Label>
              <Input value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} placeholder="NY" />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Profile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
