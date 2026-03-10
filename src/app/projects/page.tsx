
"use client";

import { AppShell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Filter, MoreHorizontal, Users, Calendar } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";

const projects = [
  {
    id: "1",
    name: "Customer Portal 2.0",
    description: "Rebuilding the main customer dashboard with modern agile practices.",
    type: "Scrum",
    status: "Active",
    members: 8,
    dueDate: "Dec 20, 2023",
    image: "https://picsum.photos/seed/sprint1/600/400"
  },
  {
    id: "2",
    name: "API Integration Layer",
    description: "Developing a unified API for third-party service connections.",
    type: "Kanban",
    status: "Planning",
    members: 4,
    dueDate: "Jan 15, 2024",
    image: "https://picsum.photos/seed/sprint2/600/400"
  },
  {
    id: "3",
    name: "Branding Refresh",
    description: "Modernizing our visual identity across all digital platforms.",
    type: "Kanban",
    status: "Review",
    members: 3,
    dueDate: "Nov 30, 2023",
    image: "https://picsum.photos/seed/sprint3/600/400"
  },
  {
    id: "4",
    name: "Security Hardening",
    description: "Implementing advanced security protocols for user data protection.",
    type: "Scrum",
    status: "Active",
    members: 12,
    dueDate: "Feb 10, 2024",
    image: "https://picsum.photos/seed/sprint4/600/400"
  }
];

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your team's agile and kanban workflows.</p>
          </div>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            Create Project
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search projects..." className="pl-9 bg-white border-none shadow-sm" />
          </div>
          <Button variant="outline" className="gap-2 bg-white">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="group overflow-hidden glass-card hover:border-primary/50 transition-all duration-300">
              <div className="relative h-48 w-full overflow-hidden">
                <Image 
                  src={project.image} 
                  alt={project.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  data-ai-hint="project dashboard"
                />
                <div className="absolute top-4 right-4">
                  <Badge className="bg-white/90 backdrop-blur-sm text-primary hover:bg-white">
                    {project.type}
                  </Badge>
                </div>
              </div>
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{project.members} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>{project.dueDate}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-secondary/30 p-4 border-t border-border">
                <Button variant="link" className="p-0 h-auto text-primary font-semibold group-hover:underline" asChild>
                  <Link href={`/projects/${project.id}`}>
                    Go to board
                  </Link>
                </Button>
                <div className="ml-auto flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-green-500"></div>
                   <span className="text-xs font-medium uppercase text-muted-foreground tracking-widest">{project.status}</span>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
