
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Plus, Loader2, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, serverTimestamp, doc } from "firebase/firestore";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useState, useMemo } from "react";
import { CreateDealDialog } from "@/components/crm/create-deal-dialog";
import { format } from "date-fns";

const STAGES = [
  { id: "prospecting", name: "Prospecting", color: "bg-blue-500" },
  { id: "qualified", name: "Qualified", color: "bg-purple-500" },
  { id: "proposal", name: "Proposal", color: "bg-orange-500" },
  { id: "negotiation", name: "Negotiation", color: "bg-pink-500" },
  { id: "closed", name: "Closed Won", color: "bg-green-500" }
];

export default function PipelinePage() {
  const { firestore } = useFirebase();
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);

  const dealsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "deals"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: deals, isLoading } = useCollection(dealsQuery);

  const columns = useMemo(() => {
    const cols = STAGES.map(stage => ({ ...stage, deals: [] as any[] }));
    if (!deals) return cols;
    deals.forEach(deal => {
      const col = cols.find(c => c.id === deal.stage) || cols[0];
      col.deals.push(deal);
    });
    return cols;
  }, [deals]);

  const handleDragStart = (id: string) => setDraggingDealId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (stageId: string) => {
    if (!draggingDealId || !firestore) return;
    const dealRef = doc(firestore, "deals", draggingDealId);
    updateDocumentNonBlocking(dealRef, {
      stage: stageId,
      updatedAt: serverTimestamp()
    });
    setDraggingDealId(null);
  };

  const totalValue = deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              <LineChart className="w-8 h-8 text-primary" />
              Sales Pipeline
            </h1>
            <div className="flex items-center gap-4 mt-1">
              <p className="text-muted-foreground">Manage deal flow and revenue forecasting.</p>
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1.5">
                <TrendingUp className="w-3 h-3" />
                Pipeline Value: ${totalValue.toLocaleString()}
              </Badge>
            </div>
          </div>
          <CreateDealDialog />
        </div>

        <div className="flex gap-6 overflow-x-auto pb-8 items-start">
          {isLoading ? (
            <div className="w-full py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            columns.map(column => (
              <div 
                key={column.id} 
                className="w-80 shrink-0 flex flex-col gap-4"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", column.color)} />
                    <h3 className="font-bold text-sm tracking-widest uppercase text-muted-foreground">{column.name}</h3>
                    <Badge variant="secondary" className="rounded-sm px-1.5 h-5">{column.deals.length}</Badge>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">
                    ${column.deals.reduce((s, d) => s + (d.value || 0), 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex flex-col gap-3 min-h-[500px] bg-secondary/10 rounded-xl p-2 transition-colors border-2 border-transparent hover:border-primary/5">
                  {column.deals.map(deal => (
                    <Card 
                      key={deal.id} 
                      draggable 
                      onDragStart={() => handleDragStart(deal.id)}
                      className="p-4 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all group bg-white shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-1.5 border-primary/20">
                          {deal.companyName || "No Company"}
                        </Badge>
                        <span className="text-[10px] font-bold text-primary/60">{deal.probability}%</span>
                      </div>
                      <h4 className="font-bold text-sm mb-3 group-hover:text-primary transition-colors">{deal.title}</h4>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                          <DollarSign className="w-3.5 h-3.5 text-green-600" />
                          {deal.value?.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                          <Calendar className="w-3 h-3" />
                          {deal.expectedCloseDate ? format(new Date(deal.expectedCloseDate), "MMM d") : "TBD"}
                        </div>
                      </div>
                    </Card>
                  ))}
                  <CreateDealDialog 
                    initialStage={column.id}
                    trigger={
                      <Button variant="ghost" className="w-full border-2 border-dashed py-10 opacity-40 hover:opacity-100 hover:bg-white text-xs font-bold uppercase gap-2">
                        <Plus className="w-4 h-4" /> Add Deal
                      </Button>
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
