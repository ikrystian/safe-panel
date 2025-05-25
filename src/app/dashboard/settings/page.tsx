"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUser } from "@clerk/nextjs";
import { User, Bell, Shield, Palette, Database } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();

  const settingsCategories = [
    {
      title: "Profile Settings",
      description: "Manage your personal information and preferences",
      icon: User,
      items: [
        { label: "Personal Information", description: "Update your name, email, and contact details" },
        { label: "Profile Picture", description: "Change your profile photo" },
        { label: "Password", description: "Update your account password" },
      ]
    },
    {
      title: "Notifications",
      description: "Configure how you receive updates and alerts",
      icon: Bell,
      items: [
        { label: "Email Notifications", description: "Session reminders and updates" },
        { label: "Push Notifications", description: "Real-time alerts on your device" },
        { label: "SMS Notifications", description: "Text message alerts for important events" },
      ]
    },
    {
      title: "Privacy & Security",
      description: "Control your privacy settings and security options",
      icon: Shield,
      items: [
        { label: "Two-Factor Authentication", description: "Add an extra layer of security" },
        { label: "Data Privacy", description: "Manage how your data is used" },
        { label: "Session Management", description: "View and manage active sessions" },
      ]
    },
    {
      title: "Appearance",
      description: "Customize the look and feel of your dashboard",
      icon: Palette,
      items: [
        { label: "Theme", description: "Choose between light and dark mode" },
        { label: "Language", description: "Select your preferred language" },
        { label: "Timezone", description: "Set your local timezone" },
      ]
    },
    {
      title: "Data Management",
      description: "Import, export, and manage your training data",
      icon: Database,
      items: [
        { label: "Export Data", description: "Download your training data" },
        { label: "Import Data", description: "Import data from other platforms" },
        { label: "Data Retention", description: "Configure how long data is stored" },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your current account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium">Name: </span>
              <span className="text-sm text-muted-foreground">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Email: </span>
              <span className="text-sm text-muted-foreground">
                {user?.primaryEmailAddress?.emailAddress}
              </span>
            </div>
            <div>
              <span className="text-sm font-medium">Member since: </span>
              <span className="text-sm text-muted-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Categories */}
      <div className="space-y-6">
        {settingsCategories.map((category, index) => (
          <Card key={category.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5" />
                {category.title}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.items.map((item, itemIndex) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                    {itemIndex < category.items.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
