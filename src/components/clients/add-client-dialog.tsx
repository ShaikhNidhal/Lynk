
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
import { Handshake, Loader2, Mail, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AddClientDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate onboarding a client
    // In a real app, this would create a user document with role: 'Client'
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Client Onboarded",
        description: `${formData.firstName} ${formData.lastName} has been added as a Client stakeholder.`,
      });
      setIsOpen(false);
      setFormData({ firstName: "", lastName: "", email: "" });
    }, 1500);
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

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-accent hover:bg-accent/90 text-white">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Onboard Client
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
