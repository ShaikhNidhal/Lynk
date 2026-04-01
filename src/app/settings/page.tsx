
"use client";

import { AppShell } from "@/components/layout/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser, useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { useState, useEffect } from "react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Settings as SettingsIcon, 
  Shield, 
  Bell, 
  Palette, 
  Loader2, 
  Briefcase,
  Zap,
  Handshake,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  
  const { data: profile, isLoading } = useDoc(userProfileRef);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
      });
    }
  }, [profile]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user?.uid) return;

    const userRef = doc(firestore, "users", user.uid);
    updateDocumentNonBlocking(userRef, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      updatedAt: serverTimestamp(),
    });

    toast({
      title: "Profile Updated",
      description: "Your changes have been saved successfully.",
    });
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const role = profile?.role || "Team Member";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-primary" />
            Workspace Settings
          </h1>
          <p className="text-muted-foreground mt-1">Manage your account preferences and role-specific configurations.</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 bg-secondary/10 h-auto gap-2 p-2">
            <TabsTrigger value="profile" className="gap-2 text-xs py-2">
              <User className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="role-details" className="gap-2 text-xs py-2">
              <Shield className="w-4 h-4" /> {role} Hub
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 text-xs py-2">
              <Bell className="w-4 h-4" /> Alerts
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2 text-xs py-2">
              <Palette className="w-4 h-4" /> Style
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="glass-card">
              <form onSubmit={handleUpdateProfile}>
                <CardHeader>
                  <CardTitle className="text-xl">Personal Information</CardTitle>
                  <CardDescription>Update your public profile details and contact information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-border/50">
                    <Avatar className="w-20 h-20 border-4 border-white shadow-md">
                      <AvatarImage src={`https://picsum.photos/seed/${user?.uid}/200/200`} />
                      <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                        {formData.firstName?.[0]}{formData.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2 text-center sm:text-left">
                      <Button variant="outline" size="sm" type="button" className="h-8">Change Avatar</Button>
                      <p className="text-[10px] text-muted-foreground italic">Recommended: Square image, 200x200px</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">First Name</Label>
                      <Input 
                        id="firstName" 
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Name</Label>
                      <Input 
                        id="lastName" 
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                    <Input 
                      id="email" 
                      value={formData.email} 
                      readOnly 
                      className="bg-secondary/20 cursor-not-allowed border-dashed"
                    />
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Shield className="w-3 h-3 text-primary" /> Managed via Firebase Authentication
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/5 pt-6 flex justify-end">
                  <Button type="submit" className="gap-2 font-bold uppercase tracking-widest text-xs h-10 px-8">
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Role Hub Tab */}
          <TabsContent value="role-details" className="mt-6">
            <div className="space-y-6">
              <Card className="glass-card border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        {role === "Admin" && <Shield className="w-5 h-5 text-destructive" />}
                        {role === "Project Manager" && <Briefcase className="w-5 h-5 text-accent" />}
                        {role === "Team Member" && <Zap className="w-5 h-5 text-accent" />}
                        {role === "Client" && <Handshake className="w-5 h-5 text-green-500" />}
                        {role} Access Level
                      </CardTitle>
                      <CardDescription>Your current permissions and workspace capabilities.</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white/80 font-bold uppercase tracking-widest text-[9px] hidden sm:flex">Active Session</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-primary/30 pl-4 py-1 italic">
                    {role === "Admin" && "As an Administrator, you have full control over organization users, project billing, and global settings. You can manage roles and view all system activity."}
                    {role === "Project Manager" && "You are responsible for board initialization, resource allocation, and team oversight. You can create projects, invite members, and manage deadlines."}
                    {role === "Team Member" && "You have access to assigned project boards, time tracking tools, and collaborative task features. Focus on execution and keep your board status updated."}
                    {role === "Client" && "Welcome to the external portal. You have view access to shared project boards and can provide feedback via task comments and attachments."}
                  </p>
                  
                  <div className="grid gap-2 pt-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Capabilities</h4>
                    <div className="flex flex-wrap gap-2">
                      <CapabilityBadge label="View Boards" enabled />
                      <CapabilityBadge label="Comment" enabled />
                      <CapabilityBadge label="Manage Tasks" enabled={role !== "Client"} />
                      <CapabilityBadge label="Create Projects" enabled={role === "Admin" || role === "Project Manager"} />
                      <CapabilityBadge label="Manage Team" enabled={role === "Admin"} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {role === "Admin" && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Organization Controls</CardTitle>
                    <CardDescription>Global workspace configuration for administrators.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AdminControlItem 
                      label="Public Registration" 
                      description="Allow new users to sign up via /register link." 
                      status="Enabled" 
                    />
                    <AdminControlItem 
                      label="Default Role" 
                      description="The role assigned to new registrations." 
                      status="Team Member" 
                    />
                  </CardContent>
                </Card>
              )}

              {role === "Project Manager" && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Oversight Summary</CardTitle>
                    <CardDescription>High-level view of your project health.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-around py-4 bg-secondary/5 rounded-xl border border-border/50">
                      <StatItem value="12" label="Active Boards" />
                      <StatItem value="84%" label="Avg. Velocity" />
                      <StatItem value="3" label="Blocked Items" color="text-destructive" />
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {role === "Client" && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Partner Support</CardTitle>
                    <CardDescription>How to get help with your portal.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl border border-accent/20 bg-accent/5">
                      <p className="text-sm font-medium mb-2">Need project updates?</p>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">Please reach out to your assigned Project Manager for any specific queries regarding deadlines or scope.</p>
                      <Button size="sm" variant="outline" className="h-8 text-[10px] uppercase font-bold tracking-widest">Contact Support</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl">Notification Preferences</CardTitle>
                <CardDescription>Configure how and when you want to be alerted.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotificationToggle label="Email Summaries" description="Get a daily digest of your task activity." defaultChecked />
                <NotificationToggle label="In-App Alerts" description="Instant notifications for comments and assignments." defaultChecked />
                <NotificationToggle label="Security Alerts" description="Notifications about login activity and account changes." defaultChecked />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl">Display Settings</CardTitle>
                <CardDescription>Customize the look and feel of your Lynk workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Interface Theme</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ThemeCard label="Light (Default)" active />
                    <ThemeCard label="Dark (Beta)" disabled />
                    <ThemeCard label="Glassmorphism" disabled />
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/5">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold">Compact Mode</Label>
                    <p className="text-[10px] text-muted-foreground max-w-[200px]">Reduces whitespace for data-heavy project boards.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest">Enabled</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function CapabilityBadge({ label, enabled }: { label: string, enabled: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight border shadow-sm transition-all",
      enabled 
        ? "bg-primary/5 text-primary border-primary/20" 
        : "bg-muted/30 text-muted-foreground border-border/50 opacity-40 grayscale"
    )}>
      {enabled ? <Check className="w-3 h-3" /> : <Loader2 className="w-3 h-3" />}
      {label}
    </div>
  );
}

function NotificationToggle({ label, description, defaultChecked = false }: { label: string, description: string, defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/5 transition-all group">
      <div className="space-y-1">
        <p className="text-sm font-bold group-hover:text-primary transition-colors">{label}</p>
        <p className="text-[10px] text-muted-foreground font-medium">{description}</p>
      </div>
      <Button 
        variant={checked ? "default" : "outline"} 
        size="sm" 
        className={cn("h-8 text-[10px] uppercase font-bold tracking-widest px-4 shadow-sm", checked ? "bg-primary" : "bg-white")}
        onClick={() => setChecked(!checked)}
      >
        {checked ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}

function AdminControlItem({ label, description, status }: { label: string, description: string, status: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-secondary/10 border border-border gap-4">
      <div className="space-y-1">
        <p className="text-xs font-bold">{label}</p>
        <p className="text-[10px] text-muted-foreground italic">{description}</p>
      </div>
      <Badge variant="secondary" className="h-6 rounded-md font-bold uppercase text-[9px] w-fit sm:w-auto px-3">
        {status}
      </Badge>
    </div>
  );
}

function StatItem({ value, label, color = "text-foreground" }: { value: string, label: string, color?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-2xl font-bold tracking-tighter", color)}>{value}</p>
      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">{label}</p>
    </div>
  );
}

function ThemeCard({ label, active = false, disabled = false }: { label: string, active?: boolean, disabled?: boolean }) {
  return (
    <div className={cn(
      "p-6 rounded-xl border-2 text-center space-y-3 transition-all flex flex-col items-center justify-center min-h-[120px]",
      active ? "border-primary bg-primary/5 shadow-md" : "border-border/50 bg-secondary/5",
      disabled ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer hover:border-primary/50"
    )}>
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center",
        active ? "bg-primary text-white" : "border border-border"
      )}>
        {active && <Check className="w-3 h-3" />}
      </div>
      <p className="text-[10px] font-extrabold uppercase tracking-widest">{label}</p>
      {disabled && <Badge variant="secondary" className="text-[8px] h-4 py-0 uppercase">Locked</Badge>}
    </div>
  );
}
