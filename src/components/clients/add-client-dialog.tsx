
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Handshake, Loader2, UserPlus, FolderKanban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, collection, query, where } from "firebase/firestore";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export function AddClientDialog() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    initialProjectId: "none"
  });

  // Fetch projects the current user can assign the client to
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "projects"),
      where(`members.${user.uid}`, "!=", null)
    );
  }, [firestore, user?.uid]);
  
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setLoading(true);

    try {
      // 1. Create the Client User Profile
      const clientId = `client_${Math.random().toString(36).substring(2, 11)}`;
      const clientRef = doc(firestore, "users", clientId);
      
      setDocumentNonBlocking(clientRef, {
        id: clientId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: "Client",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Assign to Project if selected
      if (formData.initialProjectId !== "none") {
        const projectRef = doc(firestore, "projects", formData.initialProjectId);
        updateDocumentNonBlocking(projectRef, {
          [`members.${clientId}`]: 'client',
          updatedAt: serverTimestamp()
        });
      }

      toast({
        title: "Client Onboarded",
        description: `${formData.firstName} ${formData.lastName} has been added and linked to the workspace.`,
      });
      
      setIsOpen(false);
      setFormData({ firstName: "", lastName: "", email: "", initialProjectId: "none" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to onboard client. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-accent/20 bg-accent hover:bg-accent/90">
          <UserPlus className="w-4 h-4" />
          Add Client
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Handshake className="w-5 h-5 text-accent" />
            Add External Client
          </DialogTitle>
          <DialogDescription>
            Invite a new client to view projects and provide feedback.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAddClient} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input 
                id="firstName" 
                placeholder="Jane" 
                required 
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input 
                id="lastName" 
                placeholder="Smith" 
                required 
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="jane.smith@client-corp.com" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="space-y-2 pt-2">
            <Label htmlFor="project" className="flex items-center gap-2">
              <FolderKanban className="w-3.5 h-3.5 text-accent" />
              Assign to Initial Project
            </Label>
            <Select 
              value={formData.initialProjectId} 
              onValueChange={(val) => setFormData({...formData, initialProjectId: val})}
            >
              <SelectTrigger id="project">
                <SelectValue placeholder={isProjectsLoading ? "Loading projects..." : "Select a project..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project yet</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-accent hover:bg-accent/90 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Onboard & Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
