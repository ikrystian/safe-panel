"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Hash,
  Globe,
  FileText,
  Check,
  X,
  Edit,
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
}

export default function SearchResultDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const updateProcessedStatus = async (processed: number) => {
    if (!result?.id) return;

    try {
      const response = await fetch("/api/search", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: result.id, processed }),
      });

      if (response.ok) {
        setResult(prev => prev ? { ...prev, processed } : null);
      }
    } catch (error) {
      console.error("Error updating processed status:", error);
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
            <div className="text-red-600">{error || "Nie znaleziono wyniku"}</div>
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
            <h1 className="text-3xl font-bold tracking-tight">Szczegóły wyniku</h1>
            <p className="text-muted-foreground">
              Wynik wyszukiwania dla zapytania: "{result.search_query}"
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={result.processed === 1 ? "default" : "outline"}
            onClick={() => updateProcessedStatus(result.processed === 1 ? 0 : 1)}
          >
            {result.processed === 1 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Przetworzony
              </>
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                Nieprzetworzony
              </>
            )}
          </Button>
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
                <label className="text-sm font-medium text-muted-foreground">Tytuł</label>
                <p className="text-lg font-medium">{result.title || "Brak tytułu"}</p>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Link</label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={result.link?.startsWith('http') ? result.link : `https://${result.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {result.link}
                  </a>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={result.link?.startsWith('http') ? result.link : `https://${result.link}`}
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
                <label className="text-sm font-medium text-muted-foreground">Opis</label>
                <p className="mt-1 text-sm leading-relaxed">
                  {result.snippet || "Brak opisu"}
                </p>
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
                <span className="text-sm text-muted-foreground">Pozycja SerpAPI:</span>
                <Badge variant="outline">{result.serpapi_position}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Kategoria:</span>
                <Badge variant="outline">{result.category}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={result.processed === 1 ? "default" : "secondary"}>
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
                <span className="text-sm text-muted-foreground">Data utworzenia:</span>
                <p className="text-sm">
                  {result.created_at 
                    ? new Date(result.created_at).toLocaleString("pl-PL")
                    : "Brak danych"
                  }
                </p>
              </div>
              
              <div>
                <span className="text-sm text-muted-foreground">Data wyszukiwania:</span>
                <p className="text-sm">
                  {result.search_date 
                    ? new Date(result.search_date).toLocaleString("pl-PL")
                    : "Brak danych"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
