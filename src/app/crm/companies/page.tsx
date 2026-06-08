
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Search, Plus, ExternalLink, Globe, MapPin, Loader2, Heart, Filter } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { useState, useMemo } from "react";
import { CreateCompanyDialog } from "@/components/crm/create-company-dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermission } from "@/hooks/use-permission";

export default function CompaniesPage() {
  const { firestore, profile } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // Bug #9 fix: guard create action by permission
  const canCreate = usePermission("crm:create");

  const companiesQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "companies"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      orderBy("createdAt", "desc"), 
      limit(100)
    );
  }, [firestore, profile?.currentWorkspaceId]);

  const { data: companies, isLoading } = useCollection(companiesQuery);

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter(c => {
      const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.industry?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <Building2 className="w-8 h-8 text-primary" />
              Company Directory
            </h1>
            <p className="text-muted-foreground mt-1">Manage client organizations and institutional relationships.</p>
          </div>
          {canCreate && <CreateCompanyDialog />}
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or industry..." 
              className="pl-9 bg-white border-none shadow-sm" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-white border-none shadow-sm">
              <Filter className="w-4 h-4 mr-2 opacity-50" />
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Churned">Churned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : filteredCompanies.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCompanies.map((company) => (
              <Card key={company.id} className="glass-card overflow-hidden hover:border-primary/40 transition-all group">
                <Link href={`/crm/companies/${company.id}`} className="block">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                        {company.name?.[0]}
                      </div>
                      <Badge variant={company.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                        {company.status}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4 text-lg font-bold group-hover:text-primary transition-colors">
                      {company.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-medium">{company.industry || "General Industry"}</p>
                  </CardHeader>
                </Link>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {company.website && (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Globe className="w-3.5 h-3.5" />
                        <span className="truncate">{company.website}</span>
                      </div>
                    )}
                    {company.address?.city && (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{company.address.city}, {company.address.state}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Heart className={cn("w-3.5 h-3.5", (company.healthScore || 0) > 70 ? "text-green-500" : "text-orange-500")} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Health: {company.healthScore || 0}%</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase font-bold text-primary gap-1" asChild>
                      <Link href={`/crm/companies/${company.id}`}>
                        Profile <ExternalLink className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-border">
            <Building2 className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No companies found</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first client organization or adjust filters.</p>
            {canCreate && <CreateCompanyDialog />}
          </div>
        )}
      </div>
    </AppShell>
  );
}
