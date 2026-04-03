
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Plus, Loader2, Users, Search, Check, X, Briefcase, Building2, DollarSign, Calendar } from "lucide-react";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { collection, serverTimestamp, query, limit } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function CreateProjectDialog({ trigger }: { trigger?: React.ReactNode }) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<{id: string, email: string, name: string, projectRole: string}[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "Scrum",
    companyId: "none",
    budget: "",
    startDate: "",
    targetEndDate: ""
  });

  const usersQuery = useMemoFirebase(() => firestore ? query(collection(firestore, "users"), limit(50)) : null, [firestore]);
  const { data: allUsers } = useCollection(usersQuery);

  const companiesQuery = useMemoFirebase(() => firestore ? collection(firestore, "companies") : null, [firestore]);
  const { data: companies } = useCollection(companiesQuery);

  const filteredUsers = allUsers?.filter(u => 
    u.id !== user?.uid && 
    !selectedMembers.find(m => m.id === u.id) &&
    (u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
     u.firstName?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;
    setLoading(true);

    const membersMap: Record<string, string> = { [user.uid]: "owner" };
    selectedMembers.forEach(m => { membersMap[m.id] = m.projectRole; });

    const selectedCompany = companies?.find(c => c.id === formData.companyId);

    try {
      addDocumentNonBlocking(collection(firestore, "projects"), {
        ...formData,
        companyName: selectedCompany?.name || null,
        budget: Number(formData.budget) || null,
        budgetSpent: 0,
        healthStatus: "Good",
        status: "Active",
        ownerId: user.uid,
        members: membersMap,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({ title: "Project Initialized", description: `${formData.name} is now live.` });
      setIsOpen(false);
      setFormData({ name: "", description: "", type: "Scrum", companyId: "none", budget: "", startDate: "", targetEndDate: "" });
      setSelectedMembers([]);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to create project.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button className="gap-2 shadow-lg bg-primary"><Plus className="w-4 h-4" />New Project</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 glass-card">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" />Initialize Workspace</DialogTitle>
          <DialogDescription>Configure delivery parameters and invite your project team.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Project Identity</Label>
                <Input required placeholder="Board Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Client Entity</Label>
                <Select value={formData.companyId} onValueChange={v => setFormData({...formData, companyId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select Client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Independent / Internal</SelectItem>
                    {companies?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> Allocated Budget</Label>
                <Input type="number" placeholder="50000" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Methodology</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scrum">Agile Scrum</SelectItem>
                    <SelectItem value="Kanban">Kanban</SelectItem>
                    <SelectItem value="Waterfall">Waterfall</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Start</Label>
                  <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Target End</Label>
                  <Input type="date" value={formData.targetEndDate} onChange={e => setFormData({...formData, targetEndDate: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Scope Description</Label>
            <Textarea placeholder="Define objectives..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="min-h-[100px]" />
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <Label className="flex items-center gap-2 font-bold text-sm tracking-tight"><Users className="w-4 h-4 text-primary" />Stakeholder Mapping</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search team members..." className="pl-9" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              {userSearch && filteredUsers && filteredUsers.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-xl max-h-40 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button key={u.id} type="button" className="w-full flex items-center justify-between p-2 hover:bg-primary/5 text-left border-b last:border-0" onClick={() => {
                      setSelectedMembers([...selectedMembers, { id: u.id, email: u.email, name: `${u.firstName} ${u.lastName}`, projectRole: 'member' }]);
                      setUserSearch("");
                    }}>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border"><AvatarImage src={`https://picsum.photos/seed/${u.id}/100/100`} /><AvatarFallback>{u.firstName?.[0]}</AvatarFallback></Avatar>
                        <div><p className="text-sm font-bold">{u.firstName} {u.lastName}</p><p className="text-[10px] text-muted-foreground">{u.email}</p></div>
                      </div>
                      <Plus className="w-4 h-4 text-primary opacity-40" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {selectedMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-secondary/10 rounded-lg">
                  <span className="text-xs font-bold">{m.name}</span>
                  <div className="flex items-center gap-2">
                    <Select value={m.projectRole} onValueChange={v => setSelectedMembers(selectedMembers.map(sm => sm.id === m.id ? {...sm, projectRole: v} : sm))}>
                      <SelectTrigger className="h-7 w-24 text-[10px] uppercase font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="member">Team</SelectItem><SelectItem value="client">Client</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSelectedMembers(selectedMembers.filter(sm => sm.id !== m.id))}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        <DialogFooter className="p-6 border-t border-border bg-secondary/10">
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase">Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !formData.name} className="gap-2 px-8">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Launch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
