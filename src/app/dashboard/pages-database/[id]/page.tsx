"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Hash,
  Globe,
  FileText,
  Check,
  X,
  Loader2,
  ChevronDown,
  Settings,
  RefreshCw,
  Eye,
} from "lucide-react";

interface SearchResult {
  id?: number;
  search_query: string;
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
  search_date?: string;
  user_id?: string;
  serpapi_position?: number;
  processed?: number;
  category?: number;
  created_at?: string;
  wp_fetch_status?: string | null;
  wp_fetch_error?: string | null;
  wp_fetch_attempted_at?: string | null;
}

interface WordPressUser {
  id?: number;
  search_result_id: number;
  wp_user_id: number;
  name: string;
  slug?: string;
  created_at?: string;
}

export default function SearchResultDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wpUsers, setWpUsers] = useState<WordPressUser[]>([]);
  const [processingWebsite, setProcessingWebsite] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadResultDetails(params.id as string);
    }
  }, [params.id]);

  const loadResultDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/search/result/${id}`);

      if (response.ok) {
        const data = await response.json();
        setResult(data.result);
        setWpUsers(data.wpUsers || []);
      } else {
        setError("Nie udało się załadować szczegółów wyniku");
      }
    } catch (error) {
      setError("Wystąpił błąd podczas ładowania danych");
      console.error("Error loading result details:", error);
    } finally {
      setLoading(false);
    }
  };

  const processWebsite = async (processed: number) => {
    if (!result?.id) return;

    try {
      setProcessingWebsite(true);
      const response = await fetch("/api/search", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: result.id, processed }),
      });

      if (response.ok) {
        setResult((prev) => (prev ? { ...prev, processed } : null));

        // If setting to processed (1), reload data to get WordPress users
        if (processed === 1) {
          await loadResultDetails(params.id as string);
        }
      }
    } catch (error) {
      console.error("Error processing website:", error);
    } finally {
      setProcessingWebsite(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-muted-foreground">Ładowanie szczegółów...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-red-600">
              {error || "Nie znaleziono wyniku"}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Szczegóły wyniku
            </h1>
            <p className="text-muted-foreground">
              Wynik wyszukiwania dla zapytania: "{result.search_query}"
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={result.processed === 1 ? "default" : "outline"}
                disabled={processingWebsite}
              >
                {processingWebsite ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Przetwarzanie...
                  </>
                ) : result.processed === 1 ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Akcje
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Akcje
                  </>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {result.processed === 0 ? (
                <DropdownMenuItem onClick={() => processWebsite(1)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Przetwórz stronę
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => processWebsite(0)}>
                  <X className="h-4 w-4 mr-2" />
                  Oznacz jako nieprzetworzony
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a
                  href={result.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Otwórz stronę
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`${result.link}/wp-json/wp/v2/users`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center show-users-api-link"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  WP USERS API
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informacje podstawowe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Tytuł
                </label>
                <p className="text-lg font-medium">
                  {result.title || "Brak tytułu"}
                </p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Link
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {result.link}
                  </a>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <a
                  href={`${result.link}/wp-json/wp/v2/users`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {`${result.link}/wp-json/wp/v2/users`}
                </a>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Opis
                </label>
                <p className="mt-1 text-sm leading-relaxed">
                  {result.snippet || "Brak opisu"}
                </p>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Użytkownicy WordPress
                </label>
                {result?.processed === 0 ? (
                  <div className="mt-2 text-sm text-muted-foreground bg-blue-50 p-2 rounded">
                    Użyj menu "Akcje" → "Przetwórz stronę" aby pobrać
                    użytkowników WordPress
                  </div>
                ) : processingWebsite ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Przetwarzanie strony...
                    </span>
                  </div>
                ) : wpUsers.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {wpUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 border rounded-lg bg-muted/30"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-medium">{user.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>ID: {user.wp_user_id}</span>
                            {user.slug && (
                              <>
                                <span>•</span>
                                <span>Login: {user.slug}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : result?.wp_fetch_status === "success" ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pobieranie zakończone sukcesem, ale nie znaleziono
                    użytkowników
                  </p>
                ) : result?.wp_fetch_status === "no_users" ? (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      Brak użytkowników WordPress
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      {result.wp_fetch_error ||
                        "Endpoint WordPress dostępny, ale nie znaleziono użytkowników"}
                    </p>
                    {result.wp_fetch_attempted_at && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Sprawdzono:{" "}
                        {new Date(result.wp_fetch_attempted_at).toLocaleString(
                          "pl-PL"
                        )}
                      </p>
                    )}
                  </div>
                ) : result?.wp_fetch_status === "not_wordpress" ? (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">
                      Nie jest stroną WordPress
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {result.wp_fetch_error ||
                        "Endpoint /wp-json/wp/v2/users nie istnieje"}
                    </p>
                    {result.wp_fetch_attempted_at && (
                      <p className="text-xs text-blue-600 mt-1">
                        Sprawdzono:{" "}
                        {new Date(result.wp_fetch_attempted_at).toLocaleString(
                          "pl-PL"
                        )}
                      </p>
                    )}
                  </div>
                ) : result?.wp_fetch_status === "error" ? (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      Błąd podczas pobierania
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {result.wp_fetch_error ||
                        "Wystąpił nieznany błąd podczas pobierania użytkowników"}
                    </p>
                    {result.wp_fetch_attempted_at && (
                      <p className="text-xs text-red-600 mt-1">
                        Ostatnia próba:{" "}
                        {new Date(result.wp_fetch_attempted_at).toLocaleString(
                          "pl-PL"
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Brak dostępnych użytkowników WordPress
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Metadane
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">ID:</span>
                <span className="text-sm font-mono">{result.id}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pozycja:</span>
                <Badge variant="secondary">{result.position}</Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Pozycja SerpAPI:
                </span>
                <Badge variant="outline">{result.serpapi_position}</Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Kategoria:
                </span>
                <Badge variant="outline">{result.category}</Badge>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge
                  variant={result.processed === 1 ? "default" : "secondary"}
                >
                  {result.processed === 1 ? "Przetworzony" : "Nieprzetworzony"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">
                  Data utworzenia:
                </span>
                <p className="text-sm">
                  {result.created_at
                    ? new Date(result.created_at).toLocaleString("pl-PL")
                    : "Brak danych"}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">
                  Data wyszukiwania:
                </span>
                <p className="text-sm">
                  {result.search_date
                    ? new Date(result.search_date).toLocaleString("pl-PL")
                    : "Brak danych"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
