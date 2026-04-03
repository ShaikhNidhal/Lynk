
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
import { useState, useEffect, useRef } from "react";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
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
  Check,
  Phone,
  Camera,
  Upload,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  
  const { data: profile, isLoading } = useDoc(userProfileRef);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    profilePictureUrl: ""
  });

  const [currentTheme, setCurrentTheme] = useState<string>("light");

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phoneNumber: profile.phoneNumber || "",
        profilePictureUrl: profile.profilePictureUrl || ""
      });
    }
  }, [profile]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("lynk-theme") || "light";
    setCurrentTheme(savedTheme);
    applyThemeToDocument(savedTheme);
  }, []);

  const applyThemeToDocument = (theme: string) => {
    const root = document.documentElement;
    root.classList.remove("dark", "glass");
    if (theme !== "light") {
      root.classList.add(theme);
    }
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
    applyThemeToDocument(theme);
    localStorage.setItem("lynk-theme", theme);
    toast({
      title: "Theme Updated",
      description: `Interface switched to ${theme.charAt(0).toUpperCase() + theme.slice(1)} mode.`,
    });
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user?.uid) return;

    const userRef = doc(firestore, "users", user.uid);
    updateDocumentNonBlocking(userRef, {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phoneNumber: formData.phoneNumber,
      profilePictureUrl: formData.profilePictureUrl,
      updatedAt: serverTimestamp(),
    });

    toast({
      title: "Profile Updated",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 500 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 500KB for synchronization.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, profilePictureUrl: base64String }));
        toast({
          title: "Photo Uploaded",
          description: "Click 'Save Changes' to apply this update to your profile.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleNotification = (field: string, currentVal: boolean) => {
    if (!firestore || !user?.uid) return;
    const userRef = doc(firestore, "users", user.uid);
    updateDocumentNonBlocking(userRef, {
      [`notificationSettings.${field}`]: !currentVal,
      updatedAt: serverTimestamp()
    });
    toast({
      title: "Alert Settings Updated",
      description: "Your notification preferences have been saved.",
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
  const notificationSettings = profile?.notificationSettings || {
    emailSummaries: true,
    inAppAlerts: true,
    securityAlerts: true
  };

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

          <TabsContent value="profile" className="mt-6">
            <Card className="glass-card">
              <form onSubmit={handleUpdateProfile}>
                <CardHeader>
                  <CardTitle className="text-xl">Personal Information</CardTitle>
                  <CardDescription>Update your public profile details and contact information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center gap-8 pb-8 border-b border-border/50">
                    <div 
                      className="relative group cursor-pointer" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Avatar className="w-24 h-24 border-4 border-white shadow-xl group-hover:opacity-80 transition-all ring-2 ring-primary/5">
                        <AvatarImage src={formData.profilePictureUrl || `https://picsum.photos/seed/${user?.uid}/200/200`} className="object-cover" />
                        <AvatarFallback className="text-2xl font-bold bg-primary text-white">
                          {formData.firstName?.[0]}{formData.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                      />
                    </div>
                    
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <h3 className="text-lg font-bold">Profile Photo</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                        Click the avatar to upload a new image from your device. <br/>
                        Allowed formats: JPG, PNG. Max size 500KB.
                      </p>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          className="h-8 text-[10px] uppercase font-bold tracking-widest gap-2"
                        >
                          <Upload className="w-3 h-3" />
                          Upload Photo
                        </Button>
                        {formData.profilePictureUrl && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setFormData(p => ({...p, profilePictureUrl: ""}))}
                            className="h-8 text-[10px] uppercase font-bold tracking-widest text-destructive hover:bg-destructive/5"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Remove
                          </Button>
                        )}
                      </div>
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Email Address</Label>
                      <Input 
                        id="email" 
                        value={formData.email} 
                        readOnly 
                        className="bg-secondary/20 cursor-not-allowed border-dashed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Phone className="w-3 h-3" /> Phone Number
                      </Label>
                      <Input 
                        id="phoneNumber" 
                        placeholder="+1 (555) 000-0000"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-secondary/5 pt-6 flex justify-end">
                  <Button type="submit" className="gap-2 font-bold uppercase tracking-widest text-xs h-10 px-8 shadow-md">
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

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
                  <p className="text-sm text-foreground/80 leading-relaxed border-l-2 border-primary/30 pol-4 py-1 italic">
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
                      <CapabilityBadge label="Create Projects" enabled={role === "Admin"} />
                      <CapabilityBadge label="Manage Team" enabled={role === "Admin"} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-xl">Notification Preferences</CardTitle>
                <CardDescription>Configure how and when you want to be alerted.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotificationToggle 
                  label="Email Summaries" 
                  description="Get a daily digest of your task activity." 
                  checked={notificationSettings.emailSummaries}
                  onToggle={() => toggleNotification('emailSummaries', notificationSettings.emailSummaries)}
                />
                <NotificationToggle 
                  label="In-App Alerts" 
                  description="Instant notifications for comments and assignments." 
                  checked={notificationSettings.inAppAlerts}
                  onToggle={() => toggleNotification('inAppAlerts', notificationSettings.inAppAlerts)}
                />
                <NotificationToggle 
                  label="Security Alerts" 
                  description="Notifications about login activity and account changes." 
                  checked={notificationSettings.securityAlerts}
                  onToggle={() => toggleNotification('securityAlerts', notificationSettings.securityAlerts)}
                />
              </CardContent>
            </Card>
          </TabsContent>

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
                    <ThemeCard 
                      label="Light" 
                      active={currentTheme === 'light'} 
                      onClick={() => handleThemeChange('light')} 
                    />
                    <ThemeCard 
                      label="Dark" 
                      active={currentTheme === 'dark'} 
                      onClick={() => handleThemeChange('dark')} 
                    />
                    <ThemeCard 
                      label="Glassmorphism" 
                      active={currentTheme === 'glass'} 
                      onClick={() => handleThemeChange('glass')} 
                    />
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

function NotificationToggle({ label, description, checked, onToggle }: { label: string, description: string, checked: boolean, onToggle: () => void }) {
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
        onClick={onToggle}
      >
        {checked ? "Enabled" : "Disabled"}
      </Button>
    </div>
  );
}

function ThemeCard({ label, active = false, disabled = false, onClick }: { label: string, active?: boolean, disabled?: boolean, onClick?: () => void }) {
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={cn(
        "p-6 rounded-xl border-2 text-center space-y-3 transition-all flex flex-col items-center justify-center min-h-[120px]",
        active ? "border-primary bg-primary/5 shadow-md" : "border-border/50 bg-secondary/5",
        disabled ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer hover:border-primary/50"
      )}
    >
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
