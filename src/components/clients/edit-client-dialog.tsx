
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
import { UserCog, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface EditClientDialogProps {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  trigger?: React.ReactNode;
}

export function EditClientDialog({ client, trigger }: EditClientDialogProps) {
  const { firestore } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: client.firstName || "",
    lastName: client.lastName || "",
    email: client.email || "",
  });

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setLoading(true);

    const clientRef = doc(firestore, "users", client.id);
    
    updateDocumentNonBlocking(clientRef, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      updatedAt: serverTimestamp(),
    });

    toast({
      title: "Client Updated",
      description: `${formData.firstName} ${formData.lastName}'s details have been saved.`,
    });
    
    setIsOpen(false);
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="text-[9px] h-7 font-bold uppercase tracking-wider hover:text-accent hover:bg-accent/5">
            Edit Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-accent" />
            Edit Client Details
          </DialogTitle>
          <DialogDescription>
            Update the contact information for this external stakeholder.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpdateClient} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First Name</Label>
              <Input 
                id="edit-firstName" 
                required 
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last Name</Label>
              <Input 
                id="edit-lastName" 
                required 
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email Address</Label>
            <Input 
              id="edit-email" 
              type="email" 
              required 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-accent hover:bg-accent/90 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
