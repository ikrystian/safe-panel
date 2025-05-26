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
  Loader2,
  ChevronDown,
  Settings,
  RefreshCw,
  Eye,
  Clock,
  AlertCircle,
  X,
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
  errors?: string | null;
}

export default function SearchResultDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const processWebsite = async () => {
    if (!result?.id || !result?.link) return;

    try {
      setProcessingWebsite(true);

      // Set status to "w trakcie" (1) first
      const startResponse = await fetch("/api/search", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: result.id, processed: 1 }),
      });

      if (startResponse.ok) {
        setResult((prev) => (prev ? { ...prev, processed: 1 } : null));
      }

      try {
        // Send POST request to external scan service with timeout
        const controller = new AbortController();

        const scanResponse = await fetch("http://localhost:4000/scan", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: result.link,
            callbackUrl: "http://localhost:3000/save",
          }),
          signal: controller.signal,
        });

        if (scanResponse.ok) {
          console.log("Scan request sent successfully");
          // Status will be updated by callback to 2 (zakończone) or 3 (błąd)
        } else {
          console.error("Failed to send scan request:", scanResponse.status);
          throw new Error(
            `HTTP ${scanResponse.status}: ${scanResponse.statusText}`
          );
        }
      } catch (scanError) {
        console.error("Error connecting to scan service:", scanError);

        let errorMessage = "Błąd połączenia ze skanerem";
        if (scanError instanceof Error) {
          if (scanError.name === "AbortError") {
            errorMessage = "Przekroczono limit czasu połączenia (10s)";
          } else if (scanError.message.includes("fetch")) {
            errorMessage = "Skaner niedostępny (http://localhost:4000)";
          } else {
            errorMessage = scanError.message;
          }
        }

        // Set status to error (3)
        const errorResponse = await fetch("/api/search", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: result.id, processed: 3 }),
        });

        if (errorResponse.ok) {
          setResult((prev) => (prev ? { ...prev, processed: 3 } : null));
        }

        // Show user-friendly error message
        alert(`Błąd przetwarzania: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error processing website:", error);
      // Set status to error (3)
      try {
        const errorResponse = await fetch("/api/search", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: result.id, processed: 3 }),
        });

        if (errorResponse.ok) {
          setResult((prev) => (prev ? { ...prev, processed: 3 } : null));
        }
      } catch (updateError) {
        console.error("Error updating status to error:", updateError);
      }
    } finally {
      setProcessingWebsite(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
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
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
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
        <div className="flex items-start gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
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
                variant={
                  result.processed === 2
                    ? "default"
                    : result.processed === 3
                    ? "destructive"
                    : "outline"
                }
                disabled={processingWebsite}
              >
                {processingWebsite ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Przetwarzanie...
                  </>
                ) : result.processed === 0 ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Nieprzetworzone
                  </>
                ) : result.processed === 1 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />W trakcie
                  </>
                ) : result.processed === 2 ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Zakończone
                  </>
                ) : result.processed === 3 ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Błąd
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
              <DropdownMenuItem onClick={() => processWebsite()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Przetwórz stronę
              </DropdownMenuItem>

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
                  variant={
                    result.processed === 2
                      ? "default"
                      : result.processed === 3
                      ? "destructive"
                      : result.processed === 1
                      ? "secondary"
                      : "outline"
                  }
                >
                  {result.processed === 0
                    ? "Nieprzetworzone"
                    : result.processed === 1
                    ? "W trakcie"
                    : result.processed === 2
                    ? "Zakończone"
                    : result.processed === 3
                    ? "Błąd"
                    : "Nieznany"}
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
