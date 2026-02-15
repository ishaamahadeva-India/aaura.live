'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth, useFirestore } from "@/lib/firebase/provider";
import { useAuthState } from "react-firebase-hooks/auth";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Upload, MessageSquare, Settings, Menu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FollowListDialog } from "@/components/FollowListDialog";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/hooks/use-language";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/BrandLogo";
import { SupportDialog } from "@/components/SupportDialog";

const UserStats = () => {
  const auth = useAuth();
  const { t } = useLanguage();
  const db = useFirestore();
  const [user] = useAuthState(auth);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !user) return null;

  return (
    <div className="flex items-center gap-4 text-sm">
      <FollowListDialog userId={user.uid} type="followers" trigger={
        <div className="text-center cursor-pointer hover:bg-secondary p-2 rounded-md">
          <p className="font-bold">{user.followerCount || 0}</p>
          <p className="text-xs text-muted-foreground">{t.topnav.followers}</p>
        </div>
      } />
      <FollowListDialog userId={user.uid} type="following" trigger={
        <div className="text-center cursor-pointer hover:bg-secondary p-2 rounded-md">
          <p className="font-bold">{user.followingCount || 0}</p>
          <p className="text-xs text-muted-foreground">{t.topnav.following}</p>
        </div>
      } />
    </div>
  );
};

const MobileNav = () => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>
            <BrandLogo variant="default" className="justify-start" />
          </SheetTitle>
          <SheetDescription className="sr-only">Main Navigation</SheetDescription>
        </SheetHeader>
        <MobileSidebar onLinkClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
};

export const TopNav = () => {
  const auth = useAuth();
  const [user, loading] = useAuthState(auth);
  const { t } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  const handleSignOut = () => auth.signOut();

  return (
    <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 border-b bg-background sticky top-0 z-50 min-h-[56px]">
      {/* Left: OM + Aaura */}
      <div className="flex items-center gap-2 min-w-0">
        <MobileNav />
        <BrandLogo variant="small" href="/" />
      </div>

      {/* Right: Stats, Theme, Language, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <SupportDialog />
        </div>
        <div className="hidden lg:flex">
          <UserStats />
        </div>
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        {user && (
          <div className="hidden sm:flex">
            <NotificationsDropdown />
          </div>
        )}

        {isClient ? (
          loading ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || ''} />
                    <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${user.uid}`}><User className="mr-2 h-4 w-4" />My Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/upload"><Upload className="mr-2 h-4 w-4" />{t.sidebar.upload}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/forum"><MessageSquare className="mr-2 h-4 w-4" />{t.forum.createPostTitle}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings"><Settings className="mr-2 h-4 w-4" />{t.sidebar.settings}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild><Link href="/login">Login</Link></Button>
          )
        ) : (
          <Skeleton className="h-8 w-20" />
        )}
      </div>
    </header>
  );
};
