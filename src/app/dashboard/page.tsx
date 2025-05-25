"use client";

import { useUser } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, TrendingUp, Clock } from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();

  const stats = [
    {
      title: "Total Sessions",
      value: "24",
      description: "This month",
      icon: Calendar,
      trend: "+12%",
    },
    {
      title: "Active Athletes",
      value: "156",
      description: "Currently enrolled",
      icon: Users,
      trend: "+8%",
    },
    {
      title: "Attendance Rate",
      value: "87%",
      description: "Average this month",
      icon: TrendingUp,
      trend: "+3%",
    },
    {
      title: "Hours Trained",
      value: "342",
      description: "Total this month",
      icon: Clock,
      trend: "+15%",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your training programs today.
          </p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Session
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              <div className="text-xs text-green-600 font-medium mt-1">
                {stat.trend} from last month
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Training Sessions</CardTitle>
            <CardDescription>
              Your latest training sessions and attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  name: "Morning Basketball",
                  time: "8:00 AM",
                  attendance: "12/15",
                  status: "Completed",
                },
                {
                  name: "Evening Soccer",
                  time: "6:00 PM",
                  attendance: "18/20",
                  status: "In Progress",
                },
                {
                  name: "Swimming Practice",
                  time: "7:00 AM",
                  attendance: "8/10",
                  status: "Scheduled",
                },
              ].map((session, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{session.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{session.attendance}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Create New Session
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Add New Athlete
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
