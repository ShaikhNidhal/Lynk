"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  Building, 
  Percent, 
  MessageSquare, 
  Info, 
  Trash2, 
  Loader2, 
  Send,
  Check,
  Building2
} from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase, useDoc } from "@/firebase";
import { usePermission } from "@/hooks/use-permission";
import { collection, doc, serverTimestamp, query, orderBy, setDoc, deleteDoc } from "firebase/firestore";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DealDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  deal: any;
  pipelineStages: any[];
  companies: any[];
}

export function DealDetailSheet({ isOpen, onOpenChange, deal, pipelineStages, companies }: DealDetailSheetProps) {
  const { firestore, user } = useFirebase();
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);

  const canUpdate = usePermission("crm:update");
  const canDelete = usePermission("crm:delete");

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    companyId: "none",
    value: "",
    probability: "20",
    expectedCloseDate: "",
    stageId: "",
    status: "Open"
  });

  // Load deal details when deal changes
  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title || "",
        companyId: deal.companyId || "none",
        value: deal.value !== undefined ? String(deal.value) : "",
        probability: deal.probability !== undefined ? String(deal.probability) : "20",
        expectedCloseDate: deal.expectedCloseDate || "",
        stageId: deal.stageId || "",
        status: deal.status || "Open"
      });
    }
  }, [deal]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !deal?.id) return;
    setLoading(true);

    const selectedCompany = companies.find(c => c.id === formData.companyId);
    
    try {
      const dealRef = doc(firestore, "deals", deal.id);
      await setDoc(dealRef, {
        title: formData.title,
        companyId: formData.companyId,
        companyName: selectedCompany?.name || "Independent",
        value: Number(formData.value),
        probability: Number(formData.probability),
        expectedCloseDate: formData.expectedCloseDate,
        stageId: formData.stageId,
        status: formData.status,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({
        title: "Deal Updated",
        description: `"${formData.title}" details saved.`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Error updating deal",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!firestore || !deal?.id) return;
    if (!confirm(`Are you sure you want to delete deal "${deal.title}"? This cannot be undone.`)) return;

    try {
      const dealRef = doc(firestore, "deals", deal.id);
      deleteDocumentNonBlocking(dealRef);
      toast({
        title: "Deal Deleted",
        description: "The opportunity has been removed.",
        variant: "destructive"
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: "Error deleting deal",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  if (!deal) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[550px] p-0 flex flex-col glass-card">
        {/* Header */}
        <div className="p-6 pb-0">
          <SheetHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant={formData.status === 'Won' ? 'default' : formData.status === 'Lost' ? 'destructive' : 'secondary'} className="uppercase text-[10px] font-bold">
                {formData.status}
              </Badge>
              {canDelete && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10" 
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <SheetTitle className="text-xl font-black tracking-tight text-foreground pr-8">
              {formData.title || "Deal Opportunity Details"}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Workspace Sales Pipeline Lead Card
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 mt-6">
          <div className="px-6">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/30 h-9 p-1">
              <TabsTrigger value="details" className="gap-2 text-[10px] font-bold uppercase">
                <Info className="w-3 h-3" /> Information
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2 text-[10px] font-bold uppercase">
                <MessageSquare className="w-3 h-3" /> Notes & Chats
              </TabsTrigger>
            </TabsList>
          </div>

          <Separator className="my-4 opacity-50" />

          {/* Form / Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 pb-24">
            <TabsContent value="details" className="mt-0 space-y-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Deal Title</Label>
                  <Input 
                    required 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    disabled={!canUpdate}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sales Value ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                      <Input 
                        type="number" 
                        required 
                        value={formData.value} 
                        onChange={e => setFormData({...formData, value: e.target.value})} 
                        className="pl-9"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Win Probability (%)</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="number" 
                        required 
                        value={formData.probability} 
                        onChange={e => setFormData({...formData, probability: e.target.value})} 
                        className="pl-9"
                        min="0"
                        max="100"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pipeline Stage</Label>
                    <Select value={formData.stageId} onValueChange={v => setFormData({...formData, stageId: v})} disabled={!canUpdate}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {pipelineStages.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expected Close</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        type="date" 
                        required 
                        value={formData.expectedCloseDate} 
                        onChange={e => setFormData({...formData, expectedCloseDate: e.target.value})} 
                        className="pl-9"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Linked Company</Label>
                    <Select value={formData.companyId} onValueChange={v => setFormData({...formData, companyId: v})} disabled={!canUpdate}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Independent</SelectItem>
                        {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Opportunity Status</Label>
                    <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})} disabled={!canUpdate}>
                      <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Won">Won</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {canUpdate && (
                  <div className="pt-6 border-t flex justify-end">
                    <Button type="submit" disabled={loading} className="gap-2 shadow-md w-full sm:w-auto">
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <DealComments dealId={deal.id} />
            </TabsContent>
          </div>
        </Tabs>

        <SheetFooter className="absolute bottom-0 left-0 right-0 p-6 bg-background border-t z-10">
          <Button variant="outline" className="w-full font-bold uppercase tracking-widest text-xs h-10" onClick={() => onOpenChange(false)}>
            Close Lead View
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DealComments({ dealId }: { dealId: string }) {
  const { firestore, user } = useFirebase();
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch comments
  const commentsQuery = useMemoFirebase(() => {
    if (!firestore || !dealId) return null;
    return query(collection(firestore, "deals", dealId, "comments"), orderBy("createdAt", "asc"));
  }, [firestore, dealId]);
  const { data: comments, isLoading } = useCollection(commentsQuery);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !firestore || !user?.uid) return;

    setSubmitting(true);
    try {
      const commentRef = doc(collection(firestore, "deals", dealId, "comments"));
      await setDoc(commentRef, {
        id: commentRef.id,
        content: newComment.trim(),
        authorId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewComment("");
    } catch (e: any) {
      toast({
        title: "Error adding comment",
        description: e.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] space-y-4">
      <div className="flex items-center justify-between font-bold text-sm tracking-tight mb-2">
        <span className="text-foreground">Activity Notes & Stakeholder Chats</span>
      </div>

      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-secondary/5">
            <MessageSquare className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground italic">No discussion notes logged yet.</p>
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t">
        <Input 
          placeholder="Log a client call, email recap or general note..." 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 bg-white/50"
        />
        <Button type="submit" size="icon" disabled={!newComment.trim() || submitting}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}

function CommentItem({ comment }: { comment: any }) {
  const { firestore } = useFirebase();

  // Fetch author profile
  const authorRef = useMemoFirebase(() => {
    if (!firestore || !comment.authorId) return null;
    return doc(firestore, "users", comment.authorId);
  }, [firestore, comment.authorId]);
  const { data: profile } = useDoc(authorRef);

  return (
    <div className="flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Avatar className="w-8 h-8 shrink-0 border shadow-sm">
        <AvatarImage src={`https://picsum.photos/seed/${comment.authorId}/100/100`} />
        <AvatarFallback>{profile?.firstName?.[0] || '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-foreground">
            {profile ? `${profile.firstName} ${profile.lastName}` : 'System User'}
          </span>
          <span className="text-[9px] text-muted-foreground italic">
            {comment.createdAt?.seconds 
              ? format(new Date(comment.createdAt.seconds * 1000), "MMM d, h:mm a") 
              : "Just now"}
          </span>
        </div>
        <div className="p-3 rounded-xl border border-border bg-white text-xs leading-relaxed text-foreground shadow-sm">
          <p className="whitespace-pre-wrap">{comment.content}</p>
        </div>
      </div>
    </div>
  );
}
