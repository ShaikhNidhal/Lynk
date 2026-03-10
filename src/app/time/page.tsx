
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Pause, Calendar, Clock, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Time Tracking</h1>
          <p className="text-muted-foreground mt-1">Clock-in and clock-out to track your productivity.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Timer */}
          <Card className="md:col-span-1 glass-card border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Current Session</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6">
              <div className="text-5xl font-mono font-bold tracking-tighter text-primary mb-8">
                {formatTime(time)}
              </div>
              <div className="flex gap-4 w-full">
                <Button 
                  className={`flex-1 gap-2 ${isActive ? 'bg-orange-500 hover:bg-orange-600' : 'bg-primary'}`} 
                  onClick={() => setIsActive(!isActive)}
                >
                  {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isActive ? "Pause" : "Start"}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => { setIsActive(false); setTime(0); }}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-6 w-full p-4 bg-secondary/50 rounded-lg border border-border text-center">
                 <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Active Task:</p>
                 <p className="text-sm font-medium">Customer Portal 2.0 / UI Design</p>
              </div>
            </CardContent>
          </Card>

          {/* Time Summary */}
          <Card className="md:col-span-2 glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Time Log</CardTitle>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-4 h-4" />
                This Week
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Cloud Migration</TableCell>
                    <TableCell>Database Backup</TableCell>
                    <TableCell>Nov 14, 2023</TableCell>
                    <TableCell className="text-right font-mono">02:45:00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Customer Portal 2.0</TableCell>
                    <TableCell>API Research</TableCell>
                    <TableCell>Nov 14, 2023</TableCell>
                    <TableCell className="text-right font-mono">01:15:32</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Branding Refresh</TableCell>
                    <TableCell>Logo Concepts</TableCell>
                    <TableCell>Nov 13, 2023</TableCell>
                    <TableCell className="text-right font-mono">04:20:00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
