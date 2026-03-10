
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
    icon: <FolderKanban className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />,
    image: "https://picsum.photos/seed/lynk1/800/600",
    imageHint: "project workspace",
    color: "bg-primary/5"
  },
  {
    title: "AI-Powered Efficiency",
    description: "Break down complex tasks into actionable steps instantly with our built-in AI assistant.",
    icon: <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-accent" />,
    image: "https://picsum.photos/seed/lynk2/800/600",
    imageHint: "ai productivity",
    color: "bg-accent/5"
  },
  {
    title: "Seamless Collaboration",
    description: "Keep your team aligned with real-time comments, file sharing, and workload tracking.",
    icon: <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />,
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
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row h-auto md:h-[600px]">
        {/* Illustration/Image */}
        <div className="w-full md:w-1/2 relative bg-secondary/20 h-48 md:h-auto overflow-hidden">
          <Image 
            src={splashScreens[current].image}
            alt="Welcome Illustration"
            fill
            className="object-cover transition-opacity duration-500"
            data-ai-hint={splashScreens[current].imageHint}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
          <div className="absolute bottom-4 left-4 sm:bottom-8 sm:left-8 text-white z-10">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <Zap className="w-4 h-4 text-accent fill-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Lynk Platform</span>
            </div>
            <p className="text-[10px] sm:text-sm font-medium opacity-90 italic">"The future of agile is here."</p>
          </div>
        </div>

        {/* Content & Controls */}
        <div className="flex-1 p-6 sm:p-8 md:p-12 flex flex-col justify-between gap-8 md:gap-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-primary">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white">
                <FolderKanban className="w-4 h-4" />
              </div>
              <span className="text-lg tracking-tight">Lynk</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleFinish} className="text-[10px] h-7 px-2 font-bold uppercase tracking-widest text-muted-foreground">
              Skip
            </Button>
          </div>

          <Carousel setApi={setApi} className="w-full">
            <CarouselContent>
              {splashScreens.map((screen, index) => (
                <CarouselItem key={index}>
                  <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className={cn("w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-inner", screen.color)}>
                      {screen.icon}
                    </div>
                    <div className="space-y-1 sm:space-y-2">
                      <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-foreground">{screen.title}</h2>
                      <p className="text-muted-foreground text-sm sm:text-lg leading-relaxed">
                        {screen.description}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>

          <div className="space-y-4 sm:space-y-6">
            <div className="flex gap-2">
              {splashScreens.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-1 transition-all duration-300 rounded-full",
                    current === i ? "w-6 sm:w-8 bg-primary" : "w-1.5 sm:w-2 bg-secondary"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                <CarouselPrevious className="static translate-y-0 h-9 w-9 sm:h-11 sm:w-11" />
                {!isLast && <CarouselNext className="static translate-y-0 h-9 w-9 sm:h-11 sm:w-11" />}
              </div>
              
              <Button 
                onClick={isLast ? handleFinish : () => api?.scrollNext()} 
                className={cn(
                  "flex-1 h-9 sm:h-11 font-bold text-xs sm:text-sm transition-all gap-2 shadow-lg shadow-primary/20",
                  isLast ? "bg-accent text-accent-foreground hover:bg-accent/90" : "bg-primary text-white hover:bg-primary/90"
                )}
              >
                {isLast ? "Dashboard" : "Next"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] text-muted-foreground flex items-center gap-2">
        <ShieldCheck className="w-3 h-3" /> Secure professional environment
      </p>
    </div>
  );
}
