"use client";

import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.user?.name || "User"}! 👋
        </h1>
        <p className="text-muted-foreground">Dashboard główny aplikacji.</p>
      </div>
    </div>
  );
}
