
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Pause, Calendar, Clock, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function TimeTrackingPage() {
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isActive) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Time Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Clock-in and clock-out for productivity.</p>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Main Timer */}
          <Card className="lg:col-span-1 glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Session</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-4">
              <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tighter text-primary mb-6">
                {formatTime(time)}
              </div>
              <div className="flex gap-3 w-full">
                <Button 
                  className={`flex-1 gap-2 h-11 ${isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary'}`} 
                  onClick={() => setIsActive(!isActive)}
                >
                  {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isActive ? "Pause" : "Start"}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-11 w-11 shrink-0"
                  onClick={() => { setIsActive(false); setTime(0); }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-6 w-full p-4 bg-secondary/50 rounded-lg border border-border text-center">
                 <p className="text-[9px] font-bold text-muted-foreground uppercase mb-1">Active Task:</p>
                 <p className="text-xs font-semibold">Customer Portal 2.0 / UI Design</p>
              </div>
            </CardContent>
          </Card>

          {/* Time Summary */}
          <Card className="lg:col-span-2 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Time Log</CardTitle>
              <Button variant="outline" size="sm" className="gap-2 h-8 text-[10px] font-bold uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5" />
                This Week
              </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Project</TableHead>
                        <TableHead className="text-xs">Task</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-right text-xs">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs font-medium">Cloud Migration</TableCell>
                        <TableCell className="text-xs">Database Backup</TableCell>
                        <TableCell className="text-xs">Nov 14, 2023</TableCell>
                        <TableCell className="text-right font-mono text-xs">02:45:00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">Customer Portal 2.0</TableCell>
                        <TableCell className="text-xs">API Research</TableCell>
                        <TableCell className="text-xs">Nov 14, 2023</TableCell>
                        <TableCell className="text-right font-mono text-xs">01:15:32</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">Branding Refresh</TableCell>
                        <TableCell className="text-xs">Logo Concepts</TableCell>
                        <TableCell className="text-xs">Nov 13, 2023</TableCell>
                        <TableCell className="text-right font-mono text-xs">04:20:00</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
