'use client';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/use-language';
import Link from 'next/link';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Home,
  Sparkles,
  ScrollText,
  UserSquare,
  Palmtree,
  BookHeart,
  CalendarDays,
  PartyPopper,
  MessageCircle,
  Film,
  ShoppingCart,
  Upload,
  Settings,
  PlusCircle,
  Star,
  ShieldCheck,
  HandHeart,
  ListMusic,
  Trophy,
  ChevronRight,
  Clapperboard,
  Brain,
  LayoutDashboard,
  Award,
  Package,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useAuth } from '@/lib/firebase/provider';
import { ScrollArea } from '@/components/ui/scroll-area';

const mainNav = [
  { href: '/feed', label: 'home', icon: Home, exact: true },
  { href: '/reels', label: 'reels', icon: Clapperboard },
  { href: '/virtual-pooja', label: 'virtualPooja', icon: HandHeart },
];

const libraryNav = [
  { href: '/deities', label: 'deities', icon: Sparkles },
  { href: '/stories', label: 'stories', icon: ScrollText },
  { href: '/characters', label: 'characters', icon: UserSquare },
  { href: '/temples', label: 'temples', icon: Palmtree },
  { href: '/rituals', label: 'rituals', icon: BookHeart },
  { href: '/festivals', label: 'festivals', icon: PartyPopper },
];

const communityNav = [
  { href: '/forum', label: 'forum', icon: MessageCircle },
  { href: '/channels', label: 'channels', icon: PlusCircle },
  { href: '/media', label: 'media', icon: Film },
];

const personalNav = [
  { href: '/panchang', label: 'panchang', icon: CalendarDays },
  { href: '/horoscope', label: 'horoscope', icon: Star },
  { href: '/manifestation', label: 'manifestation', icon: Brain },
  { href: '/playlists', label: 'playlists', icon: ListMusic },
  { href: '/challenges', label: 'challenges', icon: Trophy },
  { href: '/contests', label: 'contests', icon: Award },
  { href: '/samuhikaa', label: 'samuhikaa', icon: Users },
];

const marketplaceNav = [{ href: '/shop', label: 'shop', icon: ShoppingCart }];

const adminNav = [
  { href: '/admin', label: 'adminDashboard', icon: LayoutDashboard, exact: true },
  { href: '/upload', label: 'upload', icon: Upload },
  { href: '/admin/content', label: 'adminContent', icon: ShieldCheck },
  { href: '/admin/review', label: 'adminReview', icon: ShieldCheck },
  { href: '/admin/orders', label: 'adminOrders', icon: Package },
  { href: '/admin/samuhikaa', label: 'samuhikaaAdmin', icon: Users },
  { href: '/settings', label: 'settings', icon: Settings },
];

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

const NavLink = ({ href, label, icon: Icon, exact = false }: NavLinkProps) => {
  const { t } = useLanguage();
  const pathname = usePathname();
  let isActive = exact ? pathname === href : (href && typeof href === 'string' && pathname.startsWith(href) && href !== '/');

  // Special case for home/feed
  if (href === '/feed') {
      isActive = pathname === '/' || pathname === '/feed';
  }


  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 py-2 px-3 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-foreground/70 hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5" />
      <span>
        {t.sidebar[label as keyof typeof t.sidebar] ||
          label.charAt(0).toUpperCase() + label.slice(1)}
      </span>
    </Link>
  );
};

interface CollapsibleNavSectionProps {
  title: string;
  items: NavLinkProps[];
}

const CollapsibleNavSection = ({
  title,
  items,
}: CollapsibleNavSectionProps) => {
    const pathname = usePathname();
    const isSectionActive = items.some(item => item?.href && typeof item.href === 'string' && pathname.startsWith(item.href) && item.href !== '/');

  return (
    <Collapsible defaultOpen={isSectionActive}>
      <CollapsibleTrigger className="flex justify-between items-center w-full px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider group">
        <span>{title}</span>
        <ChevronRight className="h-4 w-4 transform transition-transform duration-200 group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pl-4 border-l border-border ml-3">
        {items.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const Sidebar = () => {
  const [user] = useAuthState(useAuth());
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isSuperAdmin = user?.uid === "9RwsoEEkWPR3Wpv6wKZmhos1xTG2" || user?.email === "smr@aaura.com";

  return (
    <aside className="w-64 hidden md:block border-r bg-secondary/30">
      <ScrollArea className="h-screen p-4">
        <nav className="space-y-2">
          <div className="space-y-1">
            {mainNav.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
          <NavLink href="/temples/seva" label="templeSeva" icon={HandHeart} />
          <CollapsibleNavSection title="Library" items={libraryNav} />
          <CollapsibleNavSection title="Community" items={communityNav} />
          <CollapsibleNavSection title="Personal" items={personalNav} />
          <CollapsibleNavSection title="Marketplace" items={marketplaceNav} />
          {isClient && isSuperAdmin && <CollapsibleNavSection title="Manage" items={adminNav} />}
        </nav>
      </ScrollArea>
    </aside>
  );
};
