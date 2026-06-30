import * as React from "react";
import { useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEaseEventsAuth, canAccessRole, EaseEventsAuthProvider } from "@/lib/ease-events/auth";
import { easeEventsBrand } from "@/lib/ease-events/brand";
import { hasSupabaseConfig } from "@/lib/ease-events/config";
import { EaseEventsProvider, useEaseEventsStore } from "@/lib/ease-events/store";
import type { UserRole } from "@/lib/ease-events/types";

import { StatusBadge } from "./status-badge";

const staffNav = [
  { label: "Dashboard", href: "/ease-events", icon: LayoutDashboard },
  { label: "Pipeline", href: "/ease-events/leads", icon: FolderOpen },
  { label: "Events", href: "/ease-events/events", icon: CalendarDays },
  { label: "Work", href: "/ease-events/work", icon: CheckSquare },
  { label: "Calendar", href: "/ease-events/calendar", icon: CalendarClock },
  { label: "Finances", href: "/ease-events/budgets", icon: Wallet },
  { label: "Contacts", href: "/ease-events/clients", icon: Users },
  { label: "Retention", href: "/ease-events/retention", icon: CheckCheck },
  { label: "Vendors", href: "/ease-events/vendors", icon: Building2 },
  { label: "Reports", href: "/ease-events/reports", icon: BarChart3 },
  { label: "Settings", href: "/ease-events/settings", icon: Settings },
];

const clientNav = [
  { label: "Client Portal", href: "/ease-events/client-portal", icon: LayoutDashboard },
  { label: "Files", href: "/ease-events/files", icon: FileText },
  { label: "Settings", href: "/ease-events/settings", icon: Settings },
];

const vendorNav = [
  { label: "Dashboard", href: "/ease-events", icon: LayoutDashboard },
  { label: "Events", href: "/ease-events/events", icon: CalendarDays },
  { label: "Tasks", href: "/ease-events/tasks", icon: CheckSquare },
  { label: "Files", href: "/ease-events/files", icon: FileText },
  { label: "Settings", href: "/ease-events/settings", icon: Settings },
];

function getNav(role: UserRole) {
  if (role === "client") return clientNav;
  if (role === "vendor") return vendorNav;
  return staffNav;
}

export function EaseEventsRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  return (
    <EaseEventsAuthProvider>
      <EaseEventsProvider>
        <ProtectedPage allowedRoles={allowedRoles}>{children}</ProtectedPage>
      </EaseEventsProvider>
    </EaseEventsAuthProvider>
  );
}

export function PublicEaseEventsRoute({ children }: { children: React.ReactNode }) {
  return (
    <EaseEventsAuthProvider>
      <EaseEventsProvider>{children}</EaseEventsProvider>
    </EaseEventsAuthProvider>
  );
}

function ProtectedPage({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { currentUser, isLoading } = useEaseEventsAuth();

  if (isLoading) {
    return (
      <div className="ease-events min-h-screen bg-slate-50 p-6 text-slate-950">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-12 w-64 bg-slate-200" />
          <Skeleton className="h-48 w-full bg-slate-200" />
          <Skeleton className="h-96 w-full bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthRequiredState
        title={`Sign in to ${easeEventsBrand.workspaceName}`}
        description="This workspace is protected. Use a Coco Cabana demo account or connect Supabase auth."
      />
    );
  }

  if (!canAccessRole(currentUser, allowedRoles)) {
    return (
      <AuthRequiredState
        title="Access limited"
        description="Your current role does not have permission to view this workspace area."
      />
    );
  }

  return <EaseEventsAppShell>{children}</EaseEventsAppShell>;
}

function AuthRequiredState({ title, description }: { title: string; description: string }) {
  return (
    <div className="ease-events flex min-h-screen items-center justify-center bg-[#f8f5ef] px-4 text-[#17130d]">
      <Card className="w-full max-w-md rounded-lg border-[#dfd2b0] bg-white shadow-sm">
        <CardContent className="p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-[#17130d] p-1">
            <img
              src={easeEventsBrand.logoSrc}
              alt={`${easeEventsBrand.organizationName} logo`}
              className="h-full w-full object-contain"
            />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="mt-2 text-sm text-[#6e6251]">{description}</p>
          <Button
            className="mt-6 w-full"
            onClick={() => (window.location.href = "/ease-events/login")}
          >
            Go to login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function EaseEventsAppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { currentUser, authMode, signOut } = useEaseEventsAuth();
  const {
    data,
    error,
    isLoading,
    persistenceMode,
    refreshData,
    updateNotification,
    markAllNotificationsRead,
  } = useEaseEventsStore();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ease-events-sidebar") === "collapsed";
  });
  const nav = currentUser ? getNav(currentUser.role) : staffNav;
  const activePath = location.pathname.replace(/\/$/, "") || "/ease-events";

  React.useEffect(() => {
    window.localStorage.setItem(
      "ease-events-sidebar",
      isSidebarCollapsed ? "collapsed" : "expanded",
    );
  }, [isSidebarCollapsed]);

  async function handleSignOut() {
    await signOut();
    window.location.href = "/ease-events/login";
  }

  return (
    <div className="ease-events min-h-screen bg-[#f8f5ef] text-[#17130d]">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 border-r border-[#2e261a] bg-[#17130d] text-[#f8f5ef] transition-[transform,width] duration-200 lg:static lg:translate-x-0",
            isSidebarCollapsed ? "lg:w-20" : "lg:w-72",
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            <div
              className={cn(
                "relative flex h-20 items-center justify-between border-b border-[#332a1d] px-5",
                isSidebarCollapsed && "lg:justify-center lg:px-3",
              )}
            >
              <a
                href="/ease-events"
                className={cn(
                  "flex min-w-0 items-center gap-3",
                  isSidebarCollapsed && "lg:justify-center",
                )}
                title={isSidebarCollapsed ? easeEventsBrand.workspaceName : undefined}
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-[#d4af37]/50 bg-black p-1">
                  <img
                    src={easeEventsBrand.logoSrc}
                    alt={`${easeEventsBrand.organizationName} logo`}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className={cn(isSidebarCollapsed && "lg:hidden")}>
                  <p className="text-base font-semibold leading-5 tracking-normal">
                    {easeEventsBrand.workspaceName}
                  </p>
                  <p className="text-xs text-[#d8bf74]">{easeEventsBrand.productName}</p>
                </div>
              </a>
              <Button
                className="absolute -right-3 top-1/2 hidden h-7 w-7 -translate-y-1/2 border-[#3f3322] bg-[#17130d] text-[#d8bf74] shadow-sm hover:bg-[#241d14] lg:inline-flex"
                size="icon"
                variant="outline"
                onClick={() => setIsSidebarCollapsed((current) => !current)}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
              <Button
                className="lg:hidden"
                size="icon"
                variant="ghost"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <TooltipProvider delayDuration={150}>
              <nav className={cn("flex-1 space-y-1 px-3 py-4", isSidebarCollapsed && "lg:px-2")}>
                {nav.map((item) => {
                  const Icon = item.icon;
                  const itemPath = item.href.replace(/\/$/, "");
                  const isActive =
                    activePath === itemPath ||
                    (item.href !== "/ease-events" && activePath.startsWith(itemPath));
                  const navLink = (
                    <a
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#d6ccbc] transition-colors hover:bg-white/10 hover:text-white",
                        isSidebarCollapsed && "lg:justify-center lg:px-0",
                        isActive &&
                          "bg-[#d4af37] text-[#17130d] hover:bg-[#caa331] hover:text-[#17130d]",
                      )}
                      aria-label={isSidebarCollapsed ? item.label : undefined}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={cn(isSidebarCollapsed && "lg:hidden")}>{item.label}</span>
                    </a>
                  );

                  if (!isSidebarCollapsed) return navLink;

                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </TooltipProvider>

            <div className={cn("border-t border-[#332a1d] p-4", isSidebarCollapsed && "lg:p-3")}>
              <div
                className={cn(
                  "rounded-lg border border-[#3f3322] bg-black/20 p-3",
                  isSidebarCollapsed && "lg:p-2",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("min-w-0", isSidebarCollapsed && "lg:hidden")}>
                    <p className="truncate text-sm font-semibold text-white">
                      {currentUser?.fullName}
                    </p>
                    <p className="truncate text-xs text-[#d6ccbc]">{currentUser?.email}</p>
                  </div>
                  <div className={cn(isSidebarCollapsed && "lg:hidden")}>
                    <StatusBadge value={currentUser?.role ?? "demo"} />
                  </div>
                </div>
                <Button
                  className={cn(
                    "mt-3 w-full justify-start",
                    isSidebarCollapsed && "lg:justify-center lg:px-0",
                  )}
                  size="sm"
                  variant="outline"
                  onClick={handleSignOut}
                  aria-label={isSidebarCollapsed ? "Sign out" : undefined}
                  title={isSidebarCollapsed ? "Sign out" : undefined}
                >
                  <LogOut className="h-4 w-4" />
                  <span className={cn(isSidebarCollapsed && "lg:hidden")}>Sign out</span>
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {isMobileNavOpen ? (
          <button
            className="fixed inset-0 z-30 bg-[#17130d]/40 lg:hidden"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dfd2b0] bg-[#fffdf8]/95 px-4 backdrop-blur md:px-6">
            <div className="flex items-center gap-3">
              <Button
                className="lg:hidden"
                size="icon"
                variant="outline"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <p className="text-sm font-semibold text-[#17130d]">{data.organization.name}</p>
                <p className="text-xs text-[#6e6251]">
                  {authMode === "demo" ? "Demo workspace" : "Supabase workspace"} ·{" "}
                  {hasSupabaseConfig() ? "Supabase connected" : "Supabase not connected"}
                </p>
              </div>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <NotificationCenter
                currentUserId={currentUser?.id}
                notifications={data.notifications}
                isOpen={isNotificationOpen}
                onOpenChange={setIsNotificationOpen}
                onMarkRead={(notificationId) =>
                  updateNotification(notificationId, {
                    status: "Read",
                    readAt: new Date().toISOString(),
                  })
                }
                onMarkAllRead={markAllNotificationsRead}
              />
              <StatusBadge value={currentUser?.role ?? "guest"} />
              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = "/ease-events/inquiry")}
              >
                New inquiry
              </Button>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1500px] overflow-x-hidden px-4 py-6 md:px-6 lg:py-8">
            {error ? (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p>
                    Supabase data is not available yet: {error}. The app is showing demo data until
                    the migration and seed are applied.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => void refreshData()}
                  >
                    {isLoading ? "Checking..." : "Retry"}
                  </Button>
                </div>
              </div>
            ) : null}
            {persistenceMode === "demo" ? (
              <div className="mb-5 rounded-lg border border-[#dfd2b0] bg-[#fffdf8] px-4 py-3 text-sm text-[#6e6251] shadow-sm">
                Demo mode is active. Sign out and use a Supabase demo account to persist changes
                across users.
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function NotificationCenter({
  currentUserId,
  notifications,
  isOpen,
  onOpenChange,
  onMarkRead,
  onMarkAllRead,
}: {
  currentUserId?: string;
  notifications: ReturnType<typeof useEaseEventsStore>["data"]["notifications"];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onMarkRead: (notificationId: string) => Promise<unknown>;
  onMarkAllRead: () => Promise<void>;
}) {
  const visibleNotifications = notifications
    .filter(
      (notification) =>
        notification.status !== "Archived" &&
        notification.status !== "Dismissed" &&
        (!notification.recipientUserId ||
          !currentUserId ||
          notification.recipientUserId === currentUserId),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 8);
  const unreadCount = visibleNotifications.filter(
    (notification) => notification.status === "Unread",
  ).length;

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="outline"
        aria-label={unreadCount ? `${unreadCount} unread notifications` : "Notifications"}
        onClick={() => onOpenChange(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-semibold text-white">
            {unreadCount}
          </span>
        ) : null}
      </Button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-30 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-[#dfd2b0] bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Notifications</p>
              <p className="text-xs text-slate-500">Automation and action queue updates</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              disabled={!unreadCount}
              onClick={() => void onMarkAllRead()}
            >
              <CheckCheck className="h-4 w-4" />
              Read
            </Button>
          </div>
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {visibleNotifications.length ? (
              visibleNotifications.map((notification) => {
                return (
                  <div
                    key={notification.id}
                    className="rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">
                            {notification.title}
                          </p>
                          <StatusBadge value={notification.severity} />
                          {notification.status === "Unread" ? <StatusBadge value="Unread" /> : null}
                        </div>
                        {notification.body ? (
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {notification.body}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-slate-400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2">
                        {notification.href ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onOpenChange(false);
                              window.location.href = notification.href ?? "/ease-events";
                            }}
                          >
                            Open
                          </Button>
                        ) : null}
                        {notification.status === "Unread" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              void onMarkRead(notification.id);
                            }}
                          >
                            Read
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Nothing needs attention right now.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950 md:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
