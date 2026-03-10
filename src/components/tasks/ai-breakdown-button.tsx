
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Plus, Check } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { aiTaskBreakdownAssistant } from "@/ai/flows/ai-task-breakdown-assistant";
import { toast } from "@/hooks/use-toast";

interface AIBreakdownButtonProps {
  taskDescription: string;
  onSubtasksGenerated: (subtasks: string[]) => void;
}

export function AIBreakdownButton({ taskDescription, onSubtasksGenerated }: AIBreakdownButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [generatedSubtasks, setGeneratedSubtasks] = useState<string[]>([]);

  const handleBreakdown = async () => {
    if (!taskDescription) {
      toast({
        title: "Error",
        description: "Please provide a task description first.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await aiTaskBreakdownAssistant({ taskDescription });
      setGeneratedSubtasks(result.subtasks);
    } catch (error) {
      console.error("AI breakdown failed", error);
      toast({
        title: "AI Assistant Error",
        description: "Failed to generate subtasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applySubtasks = () => {
    onSubtasksGenerated(generatedSubtasks);
    setIsOpen(false);
    setGeneratedSubtasks([]);
    toast({
      title: "Success",
      description: "Subtasks added to your task.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 text-primary">
          <Sparkles className="w-4 h-4" />
          AI Breakdown
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Task Breakdown Assistant
          </DialogTitle>
          <DialogDescription>
            I'll help you break down this task into smaller, manageable subtasks.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-secondary/50 p-3 rounded-lg border border-border">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 tracking-wider">Source Task:</p>
            <p className="text-sm italic">"{taskDescription || "No description provided..."}"</p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">Thinking about structure...</p>
            </div>
          ) : generatedSubtasks.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Suggested Subtasks:</p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {generatedSubtasks.map((sub, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 bg-white rounded-md border border-border hover:border-primary/30 transition-colors">
                    <div className="w-5 h-5 mt-0.5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold">
                      {i + 1}
                    </div>
                    <span className="text-sm">{sub}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Ready to analyze your task</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {generatedSubtasks.length > 0 ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={() => setGeneratedSubtasks([])} className="flex-1">
                Clear
              </Button>
              <Button onClick={applySubtasks} className="flex-1 gap-2">
                <Plus className="w-4 h-4" />
                Add to Task
              </Button>
            </div>
          ) : (
            <Button onClick={handleBreakdown} className="w-full gap-2" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Generate Breakdown
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
