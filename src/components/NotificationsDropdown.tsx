
"use client";
import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ClientOnlyTime } from "./ClientOnlyTime";

export function NotificationsDropdown() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationLink = (notification: any) => {
    if (notification.contentId && notification.contentType) {
      if (notification.contentType === 'post') {
        return `/feed#post-${notification.contentId}`;
      } else if (notification.contentType === 'media') {
        return `/watch/${notification.contentId}`;
      }
    }
    return '#';
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-7 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-96">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id);
                    }
                    setIsOpen(false);
                  }}
                >
                  <DropdownMenuItem
                    className={`flex flex-col items-start p-3 cursor-pointer ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <p className="text-sm font-medium flex-1">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary ml-2 mt-1" />
                      )}
                    </div>
                    {notification.metadata?.commentText && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        "{notification.metadata.commentText}"
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      <ClientOnlyTime
                        date={notification.createdAt?.toDate?.() || new Date(notification.createdAt)}
                        fallback="just now"
                      />
                    </div>
                  </DropdownMenuItem>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

