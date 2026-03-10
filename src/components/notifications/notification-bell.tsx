"use client";

import React from "react";
import { Bell, Check, Loader2, Info, AlertTriangle, Zap } from "lucide-react";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function NotificationBell() {
  const { user } = useUser();
  const { firestore } = useFirebase();

  const notificationsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
  }, [firestore, user?.uid]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const markAllAsRead = async () => {
    if (!firestore || !user?.uid || !notifications) return;
    
    const unread = notifications.filter(n => !n.read);
    unread.forEach(n => {
      const ref = doc(firestore, "users", user.uid, "notifications", n.id);
      updateDoc(ref, { read: true });
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <Zap className="w-4 h-4 text-blue-500" />;
      case 'status_change': return <Info className="w-4 h-4 text-primary" />;
      case 'due_soon': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      default: return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 glass-card" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-[10px] h-7 px-2 font-bold uppercase tracking-wider text-primary">
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-4 border-b last:border-0 flex gap-3 transition-colors hover:bg-secondary/30",
                    !n.read && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="mt-1">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-xs leading-relaxed", !n.read ? "font-semibold" : "text-muted-foreground")}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground italic">
                      {n.createdAt?.seconds ? format(new Date(n.createdAt.seconds * 1000), "MMM d, h:mm a") : "Just now"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
              <Bell className="w-8 h-8 opacity-20 mb-2" />
              <p className="text-sm italic">All caught up!</p>
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-8">
            View all history
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
