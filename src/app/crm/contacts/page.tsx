
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Contact as ContactIcon, Search, Plus, Mail, Phone, Building2, Loader2, Star, ExternalLink } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, where } from "firebase/firestore";
import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { CreateContactDialog } from "@/components/crm/create-contact-dialog";

export default function ContactsPage() {
  const { firestore, profile } = useFirebase();
  const [searchTerm, setSearchTerm] = useState("");

  const contactsQuery = useMemoFirebase(() => {
    if (!firestore || !profile?.currentWorkspaceId) return null;
    return query(
      collection(firestore, "contacts"), 
      where("workspaceId", "==", profile.currentWorkspaceId),
      orderBy("createdAt", "desc"), 
      limit(100)
    );
  }, [firestore, profile?.currentWorkspaceId]);

  const { data: contacts, isLoading } = useCollection(contactsQuery);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(c => 
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [contacts, searchTerm]);

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <ContactIcon className="w-8 h-8 text-primary" />
              Contacts
            </h1>
            <p className="text-muted-foreground mt-1">Manage individual stakeholders across all client accounts.</p>
          </div>
          <CreateContactDialog />
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search contacts, emails or companies..." 
            className="pl-9 bg-white border-none shadow-sm" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : filteredContacts.length > 0 ? (
          <div className="grid gap-4">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="glass-card hover:border-primary/40 transition-all group overflow-hidden">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border">
                        <AvatarImage src={`https://picsum.photos/seed/contact-${contact.id}/100/100`} />
                        <AvatarFallback>{contact.firstName?.[0]}{contact.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={`/crm/contacts/${contact.id}`} className="hover:text-primary transition-colors">
                            <h3 className="font-bold text-base">{contact.firstName} {contact.lastName}</h3>
                          </Link>
                          {contact.isPrimary && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" title="Primary Contact" />}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {contact.companyName || "Independent"}</span>
                          <span className="text-primary/40">•</span>
                          <span>{contact.jobTitle || "Stakeholder"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-6 flex-wrap">
                      <div className="flex items-center gap-2 text-xs font-medium text-foreground bg-secondary/30 px-3 py-1.5 rounded-full">
                        <Mail className="w-3.5 h-3.5 text-primary" />
                        {contact.email}
                      </div>
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-xs font-medium text-foreground bg-secondary/30 px-3 py-1.5 rounded-full">
                          <Phone className="w-3.5 h-3.5 text-primary" />
                          {contact.phone}
                        </div>
                      )}
                      <Button variant="outline" size="sm" asChild className="h-8 text-[10px] font-bold uppercase tracking-widest">
                        <Link href={`/crm/contacts/${contact.id}`}>
                          Profile <ExternalLink className="w-3 h-3 ml-1.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-border">
            <ContactIcon className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">No contacts found</h3>
            <p className="text-muted-foreground mb-4">Start mapping stakeholders to your client companies.</p>
            <CreateContactDialog />
          </div>
        )}
      </div>
    </AppShell>
  );
}
