
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Loader2, Calendar, Phone, Mail, History } from "lucide-react";
import { useFirebase, useUser } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { toast } from "@/hooks/use-toast";

export function LogInteractionDialog({ contactId, contactName }: { contactId: string, contactName: string }) {
  const { firestore, user } = useFirebase();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    type: "Call",
    notes: "",
    date: new Date().toISOString().slice(0, 16) // datetime-local format
  });

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user) return;
    setLoading(true);

    try {
      const interactionRef = collection(firestore, "contacts", contactId, "interactions");
      
      await addDocumentNonBlocking(interactionRef, {
        ...formData,
        contactId,
        actorId: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Interaction Logged", description: `Conversation with ${contactName} recorded.` });
      setIsOpen(false);
      setFormData({ type: "Call", notes: "", date: new Date().toISOString().slice(0, 16) });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm bg-accent hover:bg-accent/90">
          <MessageSquare className="w-4 h-4" />
          Log Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px] glass-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-accent" />
            Log Conversation
          </DialogTitle>
          <DialogDescription>Record a communication event with {contactName}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLog} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Call">Call</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="Meeting">Meeting</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Date & Time</Label>
              <Input 
                type="datetime-local" 
                required 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Summary & Notes</Label>
            <Textarea 
              required 
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})} 
              placeholder="What was discussed?"
              className="min-h-[120px] bg-white/50"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-accent hover:bg-accent/90">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Entry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
