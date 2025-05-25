"use client";

import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user } = useUser();

  return <div>Welcome back {user?.firstName} 👋</div>;
}
