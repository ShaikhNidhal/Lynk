"use client";

import { AppShell } from "@/components/layout/shell";
import { useFirebase, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, where, orderBy, limit, setDoc, serverTimestamp } from "firebase/firestore";
import { use, useState } from "react";
import { 
  Building2, 
  Globe, 
  MapPin, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Users, 
  Briefcase, 
  MessageSquare,
  ArrowLeft,
  Settings,
  Trash2,
  Plus,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Heart,
  Save,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateContactDialog } from "@/components/crm/create-contact-dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = use(params);
  const { firestore, profile } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  // Bug #11 fix: edit dialog state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // 1. Fetch Company Data
  const companyRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return doc(firestore, "companies", companyId);
  }, [firestore, companyId]);
  const { data: company, isLoading: isCompanyLoading } = useDoc(companyRef);

  // 2. Fetch Contacts - filtered by workspace
  const contactsQuery = useMemoFirebase(() => {
    if (!firestore || !companyId || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "contacts"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      where("companyId", "==", companyId)
    );
  }, [firestore, companyId, profile?.currentWorkspaceId]);
  const { data: contacts, isLoading: isContactsLoading } = useCollection(contactsQuery);

  // 3. Fetch Deals - filtered by workspace
  const dealsQuery = useMemoFirebase(() => {
    if (!firestore || !companyId || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "deals"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      where("companyId", "==", companyId)
    );
  }, [firestore, companyId, profile?.currentWorkspaceId]);
  const { data: deals, isLoading: isDealsLoading } = useCollection(dealsQuery);

  // 4. Fetch Pipelines for stage name lookup
  const pipelinesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(collection(firestore, "pipelines"), where("workspaceId", "==", profile.currentWorkspaceId));
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: pipelines } = useCollection(pipelinesQuery);

  // 4b. Fetch Projects - filtered by workspace
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !companyId || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "projects"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      where("companyId", "==", companyId)
    );
  }, [firestore, companyId, profile?.currentWorkspaceId]);
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  // 5. Fetch Activity Log
  const activityQuery = useMemoFirebase(() => {
    if (!firestore || !companyId || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "activity_logs"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      where("entityId", "==", companyId),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, companyId, profile?.currentWorkspaceId]);
  const { data: activity, isLoading: isActivityLoading } = useCollection(activityQuery);

  // Bug #1 fix: build a stage name lookup from all fetched pipelines
  const stageNameMap = useMemoFirebase(() => {
    const map: Record<string, string> = {};
    pipelines?.forEach(p => {
      p.stages?.forEach((s: any) => {
        map[s.id] = s.name;
      });
    });
    return map;
  }, [pipelines]);

  const handleDelete = async () => {
    if (!company || !firestore) return;
    if (!confirm(`Are you sure you want to archive ${company.name}? This action cannot be undone.`)) return;

    try {
      deleteDocumentNonBlocking(doc(firestore, "companies", companyId));
      toast({ title: "Company Archived", description: `${company.name} has been removed from the directory.` });
      router.push("/crm/companies");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // Bug #11 fix: save edited company profile
  const handleSaveEdit = async () => {
    if (!firestore || !editForm) return;
    setSaving(true);
    try {
      await setDoc(doc(firestore, "companies", companyId), {
        name: editForm.name,
        industry: editForm.industry,
        website: editForm.website,
        status: editForm.status,
        notes: editForm.notes,
        address: {
          street: editForm.street,
          city: editForm.city,
          state: editForm.state,
        },
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast({ title: "Company Updated", description: "Profile saved successfully." });
      setIsEditOpen(false);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = () => {
    if (!company) return;
    setEditForm({
      name: company.name || "",
      industry: company.industry || "",
      website: company.website || "",
      status: company.status || "Active",
      notes: company.notes || "",
      street: company.address?.street || "",
      city: company.address?.city || "",
      state: company.address?.state || "",
    });
    setIsEditOpen(true);
  };

  if (isCompanyLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <Building2 className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h2 className="text-2xl font-bold">Company not found</h2>
          <Button asChild variant="link" className="mt-4">
            <Link href="/crm/companies">Back to Directory</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Breadcrumbs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/crm/companies"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{company.name}</h1>
                <Badge variant={company.status === 'Active' ? 'default' : 'secondary'}>{company.status}</Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2 mt-1">
                {company.industry} • {company.sizeRange || "Mid-size"} Organization
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Bug #11 fix: "Edit Profile" now opens a real edit dialog */}
            <Button variant="outline" className="gap-2" onClick={openEditDialog}>
              <Settings className="w-4 h-4" /> Edit Profile
            </Button>
            <Button variant="outline" className="gap-2 text-destructive hover:bg-destructive/5 border-destructive/20" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Archive
            </Button>
          </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="bg-secondary/10 p-1">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="contacts">Contacts ({contacts?.length || 0})</TabsTrigger>
                <TabsTrigger value="deals">Deals ({deals?.length || 0})</TabsTrigger>
                <TabsTrigger value="projects">Projects ({projects?.length || 0})</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Company Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <InfoItem icon={<Globe className="w-4 h-4" />} label="Website" value={company.website || "No website"} isLink={!!company.website} />
                        <InfoItem icon={<MapPin className="w-4 h-4" />} label="Main Office" value={company.address ? `${company.address.street || ""}, ${company.address.city || ""}`.replace(/^,\s*/, '') || "No address" : "No address"} />
                        <InfoItem icon={<Calendar className="w-4 h-4" />} label="Added To CRM" value={company.createdAt?.seconds ? format(new Date(company.createdAt.seconds * 1000), "PPP") : "Just now"} />
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Health</span>
                            <Heart className={cn("w-4 h-4", (company.healthScore || 0) > 70 ? "text-green-500" : "text-orange-500")} />
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-3xl font-bold">{company.healthScore || 0}%</span>
                            <span className="text-[10px] text-muted-foreground mb-1">Stability Rating</span>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-accent/5 border border-accent/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lifetime Value</span>
                            <TrendingUp className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold">${(company.lifetimeValue || 0).toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground mb-1">Total Revenue</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="opacity-50" />
                    
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Billing Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Tax ID</p>
                          <p className="text-sm">{company.billingInfo?.taxId || "Not specified"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Payment Terms</p>
                          <p className="text-sm">{company.billingInfo?.paymentTerms || "Standard Net 30"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="contacts" className="mt-6">
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Key Stakeholders</CardTitle>
                      <CardDescription>Primary points of contact at {company.name}.</CardDescription>
                    </div>
                    {/* Bug #10 fix: "Add Contact" now opens CreateContactDialog pre-filled with companyId */}
                    <CreateContactDialog 
                      initialCompanyId={companyId}
                      trigger={
                        <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Add Contact</Button>
                      }
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isContactsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : contacts && contacts.length > 0 ? (
                        contacts.map(contact => (
                          <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/5 transition-colors">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={`https://picsum.photos/seed/${contact.id}/100/100`} />
                                <AvatarFallback>{contact.firstName?.[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold">{contact.firstName} {contact.lastName}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">{contact.jobTitle || "Stakeholder"}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild><a href={`mailto:${contact.email}`}><Mail className="w-4 h-4" /></a></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={`/crm/contacts/${contact.id}`}><ExternalLink className="w-4 h-4" /></Link></Button>
                            </div>
                          </div>
                        ))
                      ) : <p className="text-sm text-muted-foreground italic text-center py-8">No contacts mapped yet.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deals" className="mt-6">
                <Card className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Sales Opportunities</CardTitle>
                      <CardDescription>Pipeline flow for this account.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/crm/pipeline" className="gap-2"><TrendingUp className="w-4 h-4" /> View Pipeline</Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {isDealsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : deals && deals.length > 0 ? (
                        deals.map(deal => (
                          <div key={deal.id} className="p-4 rounded-lg border border-border group hover:border-primary/30 transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold text-sm group-hover:text-primary transition-colors">{deal.title}</h4>
                              {/* Bug #1 fix: use stageNameMap to look up the human-readable stage name */}
                              <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                                {stageNameMap[deal.stageId] || deal.stageId || "Unknown"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="font-bold text-foreground">${(deal.value || 0).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {deal.probability}% Prob.</span>
                            </div>
                          </div>
                        ))
                      ) : <p className="text-sm text-muted-foreground italic text-center py-8">No deals in pipeline.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projects" className="mt-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Boards</CardTitle>
                    <CardDescription>Active and historical projects for {company.name}.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {isProjectsLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : projects && projects.length > 0 ? (
                        projects.map(project => (
                          <Link key={project.id} href={`/projects/${project.id}`}>
                            <div className="p-4 rounded-lg border border-border hover:border-primary/30 hover:shadow-md transition-all h-full flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Badge variant="outline" className="text-[9px]">{project.type}</Badge>
                                  <div className={cn("w-2 h-2 rounded-full", project.status === 'Active' ? 'bg-green-500' : 'bg-orange-500')} />
                                </div>
                                <h4 className="font-bold text-sm mb-1">{project.name}</h4>
                                <p className="text-[10px] text-muted-foreground line-clamp-2">{project.description}</p>
                              </div>
                              <div className="mt-4 flex items-center justify-between pt-4 border-t border-border/50">
                                <span className="text-[10px] font-bold uppercase tracking-tighter text-primary">View Board</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </div>
                            </div>
                          </Link>
                        ))
                      ) : <p className="text-sm text-muted-foreground italic text-center py-8 col-span-2">No active projects found.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="mt-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Audit Trail</CardTitle>
                    <CardDescription>Historical log of updates and interactions.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {isActivityLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : activity && activity.length > 0 ? (
                        activity.map((log, idx) => (
                          <div key={log.id} className="relative pl-6 pb-6 last:pb-0 group">
                            {idx < activity.length - 1 && <div className="absolute left-2.5 top-2.5 w-0.5 h-full bg-border group-hover:bg-primary/20 transition-colors" />}
                            <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 border-background bg-secondary flex items-center justify-center z-10">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                <span className="font-bold text-primary">{log.action}</span> • {log.entityType}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {log.createdAt?.seconds ? format(new Date(log.createdAt.seconds * 1000), "MMM d, h:mm a") : "Just now"}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : <p className="text-sm text-muted-foreground italic text-center py-8">No activity recorded.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Metrics Sidebar Column */}
          <div className="space-y-6">
            <Card className="glass-card overflow-hidden">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary/70">Key Performance</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <MetricRow icon={<Users className="w-4 h-4" />} label="Total Stakeholders" value={contacts?.length || 0} />
                  <MetricRow icon={<TrendingUp className="w-4 h-4" />} label="Pipeline Deals" value={deals?.length || 0} />
                  <MetricRow icon={<Briefcase className="w-4 h-4" />} label="Active Projects" value={projects?.filter(p => p.status === 'Active').length || 0} />
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Projects</h4>
                  <div className="space-y-2">
                    {projects?.slice(0, 3).map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded-md bg-secondary/20">
                        <span className="font-medium truncate max-w-[120px]">{p.name}</span>
                        <Badge variant="outline" className="text-[8px] h-4">{p.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bug #12 fix: Direct Note now reads from company.notes field instead of hardcoded string */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Account Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {company.notes ? (
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "{company.notes}"
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic opacity-50">
                    No account notes. Edit profile to add notes.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bug #11 fix: Edit Company Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[520px] glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" /> Edit Company Profile
            </DialogTitle>
            <DialogDescription>Update the company's information and click Save.</DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company Name</Label>
                <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Industry</Label>
                  <Input value={editForm.industry} onChange={e => setEditForm({...editForm, industry: e.target.value})} placeholder="e.g., SaaS" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm({...editForm, status: v})}>
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
                <Input value={editForm.website} onChange={e => setEditForm({...editForm, website: e.target.value})} placeholder="https://..." />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Street Address</Label>
                <Input value={editForm.street} onChange={e => setEditForm({...editForm, street: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">City</Label>
                  <Input value={editForm.city} onChange={e => setEditForm({...editForm, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">State</Label>
                  <Input value={editForm.state} onChange={e => setEditForm({...editForm, state: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Notes</Label>
                <Textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} placeholder="Key account context..." className="min-h-[80px]" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="gap-2"><X className="w-4 h-4" /> Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function InfoItem({ icon, label, value, isLink }: { icon: React.ReactNode, label: string, value: string, isLink?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center text-primary/60 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">{label}</p>
        {isLink ? (
          <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline truncate block">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

function MetricRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: number | string }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{value}</span>
    </div>
  );
}