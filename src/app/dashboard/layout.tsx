"use client";

import { useEffect, useState } from "react";
import { UserMenu } from "@/components/auth/user-menu";
import { Home, Settings, Bell, Database, Bot } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Sites", href: "/dashboard/pages-database", icon: Database },
  { name: "AI Test", href: "/dashboard/ai-test", icon: Bot },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">S</span>
            </div>
            <span className="text-lg font-semibold">AFE</span>
          </div>

          {/* Navigation Menu */}
          <NavigationMenu>
            <NavigationMenuList>
              {navigation.map((item) => (
                <NavigationMenuItem key={item.name}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      className={`${navigationMenuTriggerStyle()} ${
                        pathname === item.href
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.name}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right side - User actions */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
            </Button>
            <ThemeSwitcher />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6 px-4">
        <div>{children}</div>
      </main>
    </div>
  );
}
