
"use client";

import React, { useState, useEffect } from "react";
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
import { UserPlus, Loader2, Copy, Check, Mail, ShieldAlert } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useFirebase, useUser } from "@/firebase";
import { serverTimestamp, doc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export function InviteMemberDialog() {
  const { firestore } = useFirebase();
  const { user, profile } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    role: "Team Member",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteLink(`${window.location.origin}/register`);
    }
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !profile?.currentWorkspaceId) return;
    setLoading(true);

    try {
      const memberId = `invite_${Math.random().toString(36).substring(2, 11)}`;
      const memberRef = doc(firestore, "workspaces", profile.currentWorkspaceId, "members", memberId);
      
      setDocumentNonBlocking(memberRef, {
        id: memberId,
        userId: memberId,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        invitedById: user?.uid,
        status: "pending",
        joinedAt: serverTimestamp(),
      }, { merge: true });

      toast({
        title: "Invitation Processed",
        description: `${formData.email} has been added to the workspace.`,
      });
      
      setIsOpen(false);
      setFormData({ email: "", firstName: "", lastName: "", role: "Team Member" });
    } catch (error: any) {
      toast({
        title: "Invitation Failed",
        description: error.message || "Could not process invite.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: "Link Copied",
      description: "Registration link copied to clipboard.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Invite to Workspace
          </DialogTitle>
          <DialogDescription>
            Onboard new team members or external collaborators.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-firstName">First Name</Label>
                <Input 
                  id="invite-firstName" 
                  placeholder="Sarah" 
                  required 
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-lastName">Last Name</Label>
                <Input 
                  id="invite-lastName" 
                  placeholder="Chen" 
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
                placeholder="colleague@company.com" 
                required 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Workspace Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({...formData, role: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin (Full Control)</SelectItem>
                  <SelectItem value="Project Manager">Project Manager</SelectItem>
                  <SelectItem value="Team Member">Team Member</SelectItem>
                  <SelectItem value="Client">Client (External)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block flex items-center gap-2">
              <ShieldAlert className="w-3 h-3 text-orange-500" />
              Direct Registration Link
            </Label>
            <div className="flex gap-2">
              <Input 
                readOnly 
                value={inviteLink}
                className="bg-secondary/30 text-[10px] font-mono border-dashed"
              />
              <Button type="button" variant="outline" size="icon" onClick={copyInviteLink} className="h-10 w-10">
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="text-xs font-bold uppercase">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 shadow-md shadow-primary/10">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
