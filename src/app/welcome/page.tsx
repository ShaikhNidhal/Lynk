
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious,
  type CarouselApi 
} from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { 
  FolderKanban, 
  Sparkles, 
  Users, 
  ArrowRight,
  Zap,
  ShieldCheck
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const splashScreens = [
  {
    title: "Welcome to Lynk",
    description: "Your professional hub for agile project management and team collaboration.",
    icon: <FolderKanban className="w-12 h-12 text-primary" />,
    image: "https://picsum.photos/seed/lynk1/800/600",
    imageHint: "project workspace",
    color: "bg-primary/5"
  },
  {
    title: "AI-Powered Efficiency",
    description: "Break down complex tasks into actionable steps instantly with our built-in AI assistant.",
    icon: <Sparkles className="w-12 h-12 text-accent" />,
    image: "https://picsum.photos/seed/lynk2/800/600",
    imageHint: "ai productivity",
    color: "bg-accent/5"
  },
  {
    title: "Seamless Collaboration",
    description: "Keep your team aligned with real-time comments, file sharing, and workload tracking.",
    icon: <Users className="w-12 h-12 text-muted-foreground" />,
    image: "https://picsum.photos/seed/lynk3/800/600",
    imageHint: "team collaboration",
    color: "bg-muted/30"
  }
];

export default function WelcomeSplashPage() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const router = useRouter();

  React.useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const handleFinish = () => {
    router.push("/dashboard");
  };

  const isLast = current === splashScreens.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row h-[600px]">
        {/* Left Side: Illustration/Image */}
        <div className="hidden md:block w-1/2 relative bg-secondary/20">
          <Image 
            src={splashScreens[current].image}
            alt="Welcome Illustration"
            fill
            className="object-cover transition-opacity duration-500"
            data-ai-hint={splashScreens[current].imageHint}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
          <div className="absolute bottom-8 left-8 text-white z-10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-accent fill-accent" />
              <span className="text-xs font-bold uppercase tracking-widest">Lynk Platform</span>
            </div>
            <p className="text-sm font-medium opacity-90 italic">"The future of agile is here."</p>
          </div>
        </div>

        {/* Right Side: Content & Controls */}
        <div className="flex-1 p-8 md:p-12 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2 font-bold text-primary">
              <FolderKanban className="w-6 h-6" />
              <span className="text-xl tracking-tight">Lynk</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleFinish} className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Skip
            </Button>
          </div>

          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {splashScreens.map((screen, index) => (
                <CarouselItem key={index}>
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className={cn("w-20 h-20 rounded-2xl flex items-center justify-center shadow-inner", screen.color)}>
                      {screen.icon}
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-extrabold tracking-tight text-foreground">{screen.title}</h2>
                      <p className="text-muted-foreground text-lg leading-relaxed">
                        {screen.description}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="space-y-6">
            <div className="flex gap-2">
              {splashScreens.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1.5 transition-all duration-300 rounded-full",
                    current === i ? "w-8 bg-primary" : "w-2 bg-secondary"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <CarouselPrevious className="static translate-y-0 h-11 w-11" />
                {!isLast && <CarouselNext className="static translate-y-0 h-11 w-11" />}
              </div>
              
              <Button 
                onClick={isLast ? handleFinish : () => api?.scrollNext()} 
                className={cn(
                  "flex-1 h-11 font-bold transition-all gap-2 shadow-lg shadow-primary/20",
                  isLast ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {isLast ? "Go to Dashboard" : "Next Step"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="w-3 h-3" /> Secure professional environment
      </p>
    </div>
  );
}
