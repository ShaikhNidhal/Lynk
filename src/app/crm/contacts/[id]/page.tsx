"use client";

import { AppShell } from "@/components/layout/shell";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, limit } from "firebase/firestore";
import { use, useState } from "react";
import { 
  User, 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  ArrowLeft,
  Trash2,
  Loader2,
  MessageSquare,
  Linkedin,
  Clock,
  Briefcase,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { LogInteractionDialog } from "@/components/crm/log-interaction-dialog";

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: contactId } = use(params);
  const { firestore, profile } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  // 1. Fetch Contact Data
  const contactRef = useMemoFirebase(() => {
    if (!firestore || !contactId) return null;
    return doc(firestore, "contacts", contactId);
  }, [firestore, contactId]);
  const { data: contact, isLoading: isContactLoading } = useDoc(contactRef);

  // 2. Fetch Interactions (Communication Logs)
  const interactionsQuery = useMemoFirebase(() => {
    if (!firestore || !contactId) return null;
    return query(
      collection(firestore, "contacts", contactId, "interactions"), 
      orderBy("date", "desc"),
      limit(50)
    );
  }, [firestore, contactId]);
  const { data: interactions, isLoading: isInteractionsLoading } = useCollection(interactionsQuery);

  // 3. Fetch Deals associated with the contact's company - filtered by workspace
  const dealsQuery = useMemoFirebase(() => {
    if (!firestore || !contact?.companyId || contact.companyId === 'none' || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "deals"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      where("companyId", "==", contact.companyId)
    );
  }, [firestore, contact?.companyId, profile?.currentWorkspaceId]);
  const { data: deals } = useCollection(dealsQuery);

  const handleDelete = async () => {
    if (!contact || !firestore) return;
    if (!confirm(`Are you sure you want to remove ${contact.firstName}? This action cannot be undone.`)) return;

    try {
      deleteDocumentNonBlocking(doc(firestore, "contacts", contactId));
      toast({ title: "Contact Removed", description: `${contact.firstName} has been deleted from the directory.` });
      router.push("/crm/contacts");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  if (isContactLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!contact) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <User className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Contact not found</h2>
          <Button asChild variant="link" className="mt-4">
            <Link href="/crm/contacts">Back to Directory</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/crm/contacts"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/10 shadow-md">
                <AvatarImage src={`https://picsum.photos/seed/contact-${contact.id}/200/200`} />
                <AvatarFallback className="text-xl font-bold">{contact.firstName?.[0]}{contact.lastName?.[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight">{contact.firstName} {contact.lastName}</h1>
                  {contact.isPrimary && <Badge className="bg-yellow-500 text-white border-none">Primary</Badge>}
                </div>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  {contact.jobTitle || "Stakeholder"} • {contact.companyName || "Independent"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <LogInteractionDialog contactId={contactId} contactName={contact.firstName} />
            <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/5 border-destructive/20" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="bg-secondary/10 p-1">
                <TabsTrigger value="history">Communication History</TabsTrigger>
                <TabsTrigger value="info">Contact Details</TabsTrigger>
                <TabsTrigger value="deals">Related Deals</TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="mt-6">
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Interaction Log</CardTitle>
                      <CardDescription>Chronological record of calls, emails, and meetings.</CardDescription>
                    </div>
                    <LogInteractionDialog contactId={contactId} contactName={contact.firstName} />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {isInteractionsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : interactions && interactions.length > 0 ? (
                        interactions.map((interaction, idx) => (
                          <div key={interaction.id} className="relative pl-8 pb-8 last:pb-0 group">
                            {idx < interactions.length - 1 && <div className="absolute left-3.5 top-3.5 w-0.5 h-full bg-border group-hover:bg-primary/20 transition-colors" />}
                            <div className="absolute left-0 top-1.5 w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center z-10 text-primary">
                              {interaction.type === 'Call' && <Phone className="w-3 h-3" />}
                              {interaction.type === 'Email' && <Mail className="w-3 h-3" />}
                              {interaction.type === 'Meeting' && <MessageSquare className="w-3 h-3" />}
                              {interaction.type === 'Other' && <Clock className="w-3 h-3" />}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-bold text-foreground">{interaction.type} Record</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold">
                                  {interaction.date ? format(new Date(interaction.date), "MMM d, yyyy • h:mm a") : "Date unknown"}
                                </p>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed italic">
                                "{interaction.notes}"
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl">
                          <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground italic">No interactions logged yet.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="info" className="mt-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Stakeholder Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <ContactInfoItem icon={<Mail className="w-4 h-4" />} label="Email Address" value={contact.email} isLink />
                        <ContactInfoItem icon={<Phone className="w-4 h-4" />} label="Phone Number" value={contact.phone || "Not provided"} />
                        <ContactInfoItem icon={<Linkedin className="w-4 h-4" />} label="LinkedIn" value={contact.linkedinUrl || "Not linked"} isLink={!!contact.linkedinUrl} />
                      </div>
                      <div className="space-y-4">
                        <ContactInfoItem icon={<Building2 className="w-4 h-4" />} label="Associated Company" value={contact.companyName || "Independent"} />
                        <ContactInfoItem icon={<Briefcase className="w-4 h-4" />} label="Department" value={contact.department || "General"} />
                        <ContactInfoItem icon={<Calendar className="w-4 h-4" />} label="Added To CRM" value={contact.createdAt?.seconds ? format(new Date(contact.createdAt.seconds * 1000), "PPP") : "Just now"} />
                      </div>
                    </div>
                    
                    {contact.notes && (
                      <>
                        <Separator className="opacity-50" />
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">General Notes</h4>
                          <p className="text-sm text-foreground leading-relaxed">{contact.notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deals" className="mt-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Account Deals</CardTitle>
                    <CardDescription>Pipeline opportunities associated with {contact.companyName}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {deals && deals.length > 0 ? (
                        deals.map(deal => (
                          <div key={deal.id} className="p-4 rounded-lg border border-border group hover:border-primary/30 transition-all flex items-center justify-between">
                            <div>
                              <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{deal.title}</h4>
                              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Value: ${(deal.value || 0).toLocaleString()}</p>
                            </div>
                            <Badge variant="outline" className="text-[9px] uppercase">{deal.stage}</Badge>
                          </div>
                        ))
                      ) : <p className="text-sm text-muted-foreground italic text-center py-8">No active deals found for this account.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="glass-card border-primary/10">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary/70">Quick Context</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Interaction</span>
                    <span className="text-sm font-medium">
                      {interactions?.[0] ? format(new Date(interactions[0].date), "MMM d, yyyy") : "Never contacted"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Primary Contact</span>
                    <Badge variant={contact.isPrimary ? "default" : "outline"} className="w-fit">
                      {contact.isPrimary ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
                
                <Separator />
                
                <Button className="w-full gap-2 font-bold uppercase text-[10px] tracking-widest" asChild>
                  <a href={`mailto:${contact.email}`}><Mail className="w-3.5 h-3.5" /> Send Email</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ContactInfoItem({ icon, label, value, isLink }: { icon: React.ReactNode, label: string, value: string, isLink?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-primary/60 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">{label}</p>
        {isLink ? (
          <a href={label === 'LinkedIn' ? value : `mailto:${value}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground truncate">{value}</p>
        )}
      </div>
    </div>
  );
}