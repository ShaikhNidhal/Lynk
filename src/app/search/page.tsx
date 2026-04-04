
"use client";

import { AppShell } from "@/components/layout/shell";
import { useSearchParams } from "next/navigation";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, limit, where } from "firebase/firestore";
import { useMemo, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  FolderKanban, 
  CheckCircle2, 
  Contact as ContactIcon, 
  Loader2,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const { firestore, profile } = useFirebase();

  // Fetch Projects for search - strictly scoped to current workspace
  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "projects"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      limit(50)
    );
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: projects, isLoading: isProjectsLoading } = useCollection(projectsQuery);

  // Fetch Contacts for search - strictly scoped to current workspace
  const contactsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "contacts"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      limit(50)
    );
  }, [firestore, profile?.currentWorkspaceId]);
  const { data: contacts, isLoading: isContactsLoading } = useCollection(contactsQuery);

  const filtered = useMemo(() => {
    if (!q) return { projects: [], contacts: [] };
    const term = q.toLowerCase();
    
    return {
      projects: projects?.filter(p => p.name?.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)) || [],
      contacts: contacts?.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term)) || []
    };
  }, [q, projects, contacts]);

  const totalResults = filtered.projects.length + filtered.contacts.length;

  return (
    <div className="space-y-8 pb-20">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Search className="w-8 h-8 text-primary" />
          Global Search Results
        </h1>
        <p className="text-muted-foreground mt-1">
          Found {totalResults} matches for <span className="text-primary font-bold">"{q}"</span>
        </p>
      </div>

      {(isProjectsLoading || isContactsLoading) ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Indexing organizational records...</p>
        </div>
      ) : totalResults > 0 ? (
        <div className="grid gap-8">
          {/* Projects Results */}
          {filtered.projects.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FolderKanban className="w-4 h-4" /> Projects ({filtered.projects.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.projects.map(p => (
                  <Card key={p.id} className="glass-card hover:border-primary/40 transition-all group">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-[9px] font-bold">{p.type}</Badge>
                        <div className={cn("w-2 h-2 rounded-full", p.status === 'Active' ? 'bg-green-500' : 'bg-orange-500')} />
                      </div>
                      <CardTitle className="text-base group-hover:text-primary transition-colors">{p.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{p.description}</p>
                      <Button variant="ghost" size="sm" className="w-full text-[10px] font-bold uppercase tracking-widest h-8" asChild>
                        <Link href={`/projects/${p.id}`}>Open Board <ArrowRight className="w-3 h-3 ml-2" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Contacts Results */}
          {filtered.contacts.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <ContactIcon className="w-4 h-4" /> Stakeholders ({filtered.contacts.length})
              </h2>
              <div className="space-y-3">
                {filtered.contacts.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-border hover:border-accent/30 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent/5 flex items-center justify-center text-accent font-bold">
                        {c.firstName?.[0]}{c.lastName?.[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{c.firstName} {c.lastName}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                          {c.jobTitle} @ {c.companyName || 'Independent'}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-bold uppercase tracking-widest">
                      <Link href={`/crm/contacts/${c.id}`}>Profile <ExternalLink className="w-3 h-3 ml-2" /></Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-32 bg-secondary/5 rounded-3xl border-2 border-dashed">
          <Search className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold">No organizational matches</h3>
          <p className="text-muted-foreground mt-2">Adjust your query to find specific initiatives or stakeholders.</p>
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/dashboard">Return Home</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SearchResultsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
        <SearchResultsContent />
      </Suspense>
    </AppShell>
  );
}
