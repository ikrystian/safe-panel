"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Database, Search, Users, AlertCircle, Activity } from "lucide-react";

interface AnalyticsData {
  overview: {
    totalResults: number;
    totalWpUsers: number;
    totalQueries: number;
    totalRequests: number;
  };
  processedStats: { processed: number; count: number }[];
  categoryStats: { category: number; count: number }[];
  searchActivity: { date: string; count: number }[];
  topQueries: { search_query: string; count: number; last_search: string }[];
  wpFetchStats: { wp_fetch_status: string; count: number }[];
  errorStats: { total_with_errors: number; wp_user_errors: number };
  paginationStats: {
    total_queries: number;
    total_requests: number;
    avg_requests_per_query: number;
  };
  recentActivity: any[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Przegląd statystyk i aktywności wyszukiwania
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[120px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">
            Nie udało się załadować danych
          </h3>
          <p className="text-muted-foreground">Spróbuj odświeżyć stronę</p>
        </div>
      </div>
    );
  }

  const processedData = data.processedStats.map((stat) => ({
    name: stat.processed === 1 ? "Przetworzone" : "Nieprzetworzone",
    value: stat.count,
    color: stat.processed === 1 ? "#00C49F" : "#FF8042",
  }));

  const wpStatusData = data.wpFetchStats.map((stat) => ({
    name:
      stat.wp_fetch_status === "success"
        ? "Sukces"
        : stat.wp_fetch_status === "error"
        ? "Błąd"
        : stat.wp_fetch_status === "no_users"
        ? "Brak użytkowników"
        : stat.wp_fetch_status === "not_wordpress"
        ? "Nie WordPress"
        : stat.wp_fetch_status,
    value: stat.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Przegląd statystyk i aktywności wyszukiwania
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Łączne wyniki</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.totalResults}
            </div>
            <p className="text-xs text-muted-foreground">
              Wszystkie znalezione strony
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Użytkownicy WordPress
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.totalWpUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              Znalezieni użytkownicy WP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zapytania</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.totalQueries}
            </div>
            <p className="text-xs text-muted-foreground">
              Unikalne frazy wyszukiwania
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Żądania API</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.totalRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Łączne zapytania do SerpAPI
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Processed vs Unprocessed */}
        <Card>
          <CardHeader>
            <CardTitle>Status przetwarzania</CardTitle>
            <CardDescription>
              Podział wyników na przetworzone i nieprzetworzone
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={processedData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* WordPress Fetch Status */}
        {wpStatusData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Status pobierania WordPress</CardTitle>
              <CardDescription>
                Wyniki prób pobierania użytkowników WordPress
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={wpStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {wpStatusData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search Activity Chart */}
      {data.searchActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aktywność wyszukiwania</CardTitle>
            <CardDescription>
              Liczba wyszukiwań w ciągu ostatnich 30 dni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.searchActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(value).toLocaleDateString("pl-PL", {
                      month: "short",
                      day: "numeric",
                    })
                  }
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("pl-PL")
                  }
                  formatter={(value) => [value, "Wyszukiwania"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Queries */}
      {data.topQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Najpopularniejsze zapytania</CardTitle>
            <CardDescription>
              Top 10 najczęściej wyszukiwanych fraz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topQueries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="search_query"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ostatnia aktywność</CardTitle>
            <CardDescription>
              Najnowsze wyszukiwania z ostatnich 7 dni
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.slice(0, 10).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {activity.search_query}
                      </span>
                      <Badge
                        variant={
                          activity.processed === 1 ? "default" : "secondary"
                        }
                      >
                        {activity.processed === 1
                          ? "Przetworzone"
                          : "Nieprzetworzone"}
                      </Badge>
                      {activity.wp_fetch_status && (
                        <Badge
                          variant={
                            activity.wp_fetch_status === "success"
                              ? "default"
                              : activity.wp_fetch_status === "error"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {activity.wp_fetch_status === "success"
                            ? "WP OK"
                            : activity.wp_fetch_status === "error"
                            ? "WP Błąd"
                            : activity.wp_fetch_status === "no_users"
                            ? "WP Brak"
                            : activity.wp_fetch_status === "not_wordpress"
                            ? "Nie WP"
                            : activity.wp_fetch_status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {activity.title || activity.link}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(activity.created_at).toLocaleDateString("pl-PL")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
