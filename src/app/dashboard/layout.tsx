"use client";

const navigation = [{ name: "Dashboard", href: "/dashboard" }];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
