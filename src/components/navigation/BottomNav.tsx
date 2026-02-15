"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { useAuth } from "@/lib/firebase/provider";
import { Home, PlayCircle, PlusSquare, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useActiveEventsCount } from "@/hooks/use-active-events-count";
import { Badge } from "@/components/ui/badge";

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [user] = useAuthState(auth);
  const activeEventsCount = useActiveEventsCount();

  const navItems = [
    { href: "/feed", icon: Home, label: "Home" },
    { href: "/reels", icon: PlayCircle, label: "Videos" },
    { href: "/upload", icon: PlusSquare, label: "Create" },
    { href: "/feed?tab=updates", icon: Bell, label: "Updates" },
  ];

  const handleNavigate = (href: string) => {
    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full bg-background/95 backdrop-blur-sm border-t border-border py-2 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-around px-2 sm:px-4">
      {navItems.map(({ href, icon: Icon, label }) => {
        const basePath = href.split("?")[0];
        const isActive = pathname === basePath || (basePath === "/feed" && pathname === "/");
        const showBadge = label === "Home" && activeEventsCount > 0;
        
        return (
          <button
            key={href}
            type="button"
            onClick={() => handleNavigate(href)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors relative",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="relative">
            <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
              {showBadge && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold"
                >
                  {activeEventsCount > 9 ? '9+' : activeEventsCount}
                </Badge>
              )}
            </div>
            <span className="text-xs">{label}</span>
          </button>
        );
      })}
        <button
          type="button"
          onClick={() => handleNavigate(user ? `/profile/${user.uid}` : "/login")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors",
            pathname.startsWith("/profile")
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label="Profile"
          aria-current={pathname.startsWith("/profile") ? "page" : undefined}
        >
          {user ? (
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || ""} />
              <AvatarFallback>{user.email?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="text-xs">{user ? "Profile" : "Login"}</span>
        </button>
      </div>
    </nav>
  );
}

