"use client";

import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-muted-foreground">Dashboard główny aplikacji.</p>
      </div>
    </div>
  );
}
