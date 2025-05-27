"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ExternalLink,
  Calendar,
  Hash,
  Globe,
  FileText,
  Loader2,
  ChevronDown,
  Settings,
  Eye,
  AlertCircle,
  Wand2, // Added for Gemini AI
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
  gemini_category?: string | null;
  gemini_contact_message?: string | null;
  gemini_email_html?: string | null;
  gemini_payload_processed_at?: string | null;
}

export default function SearchResultDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadResultDetails(params.id as string);
    }
  }, [params.id]);

  const loadResultDetails = async (id: string) => {
    try {
      setLoading(true);
      setResult(null); // Reset previous result
      setError(null);
      setGeminiError(null); // Reset gemini error
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

  const handleGenerateEmail = async () => {
    if (!result || typeof result.id === "undefined") {
      setGeminiError(
        "Brak ID wyniku wyszukiwania (history_scrapped.id). Nie można zapisać emaila."
      );
      return;
    }

    if (!result.link) {
      setGeminiError("Brak URL strony do analizy.");
      return;
    }

    setGeneratingEmail(true);
    setGeminiError(null);

    // Updated prompt to work without scan data - AI will analyze the website URL
    const prompt = `Zwróć JSON z poprawną strukturą z następującymi kluczami: "category" (string - kategoria strony na podstawie jej treści, np. "Sklep internetowy - odzież", "Blog technologiczny", "Hotel/Turystyka"), "contact" (object z kluczem "message": string - informacja o znalezionych danych kontaktowych lub informacja o ich braku), oraz "email_content" (object z kluczem "html": string - treść emaila w formacie HTML).

Przeanalizuj stronę internetową: ${result.link}

Email powinien być skierowany do właściciela witryny i mieć na celu nawiązanie współpracy w zakresie bezpieczeństwa. To pierwszy kontakt z klientem. Email powinien:
- Przedstawić potencjalne zagrożenia bezpieczeństwa typowe dla danej branży
- Podkreślić znaczenie bezpieczeństwa witryny w branży klienta (określonej przez Ciebie w polu "category")
- Wskazać ogólne problemy bezpieczeństwa stron internetowych
- Zasugerować kontakt w celu omówienia szczegółów lub zaoferowania pomocy
- Wzbudzić świadomość ryzyka włamania lub wycieku danych
- Zaznacz, że na życzenie klienta możesz przygotować darmowy, szczegółowy raport podatności
- Email ma być gotowy do wysłania

Tytuł strony: ${result.title || "Brak tytułu"}
Opis strony: ${result.snippet || "Brak opisu"}`;

    try {
      console.log(prompt);
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, historyId: result.id }), // Use result.id as historyId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nie udało się wygenerować emaila.");
      }

      await response.json(); // Expects { analysis: { category: ..., contact: ..., email_content: ... } }

      // Backend now handles saving. We just need to refresh the data to see the updates.
      if (params.id) {
        loadResultDetails(params.id as string);
      }
      // If you want to show an immediate success message or the raw analysis, you can use `data.analysis` here.
      // For now, we rely on loadResultDetails to update the `result` state.
    } catch (error: any) {
      console.error("Error processing Gemini analysis:", error);
      setGeminiError(
        error.message ||
          "Wystąpił nieoczekiwany błąd podczas generowania emaila."
      );
    } finally {
      setGeneratingEmail(false);
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
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Akcje
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleGenerateEmail}
                disabled={generatingEmail}
              >
                {generatingEmail ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                Pobierz Analizę AI
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

          {/* Gemini AI Analysis Section */}
          {(generatingEmail ||
            geminiError ||
            result?.gemini_category ||
            result?.gemini_contact_message ||
            result?.gemini_email_html) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Analiza AI (Gemini)
                </CardTitle>
                {result?.gemini_payload_processed_at && (
                  <CardDescription>
                    Ostatnia analiza:{" "}
                    {new Date(
                      result.gemini_payload_processed_at
                    ).toLocaleString("pl-PL")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {generatingEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Przetwarzanie danych z AI...
                  </div>
                )}
                {geminiError && (
                  <div className="text-red-500">
                    <AlertCircle className="h-4 w-4 inline mr-1" />
                    Błąd analizy AI: {geminiError}
                  </div>
                )}
                {!generatingEmail && !geminiError && (
                  <>
                    {result?.gemini_category && (
                      <div>
                        <h4 className="font-semibold text-md mb-1">
                          Sugerowana Kategoria Strony:
                        </h4>
                        <p className="text-sm bg-muted p-2 rounded-md">
                          {result.gemini_category}
                        </p>
                      </div>
                    )}
                    {result?.gemini_contact_message && (
                      <div>
                        <h4 className="font-semibold text-md mb-1">
                          Informacje Kontaktowe (wg AI):
                        </h4>
                        <p className="text-sm bg-muted p-2 rounded-md">
                          {result.gemini_contact_message}
                        </p>
                      </div>
                    )}
                    {result?.gemini_email_html && (
                      <div>
                        <h4 className="font-semibold text-md mb-1">
                          Sugerowana Treść Email (HTML):
                        </h4>
                        <Dialog
                          open={emailPreviewOpen}
                          onOpenChange={setEmailPreviewOpen}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Podgląd Emaila
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>
                                Podgląd Wygenerowanego Emaila
                              </DialogTitle>
                              <DialogDescription>
                                Tak może wyglądać email wygenerowany przez AI.
                              </DialogDescription>
                            </DialogHeader>
                            <div
                              className="mt-4 prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{
                                __html: result.gemini_email_html,
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                        {/* Optionally, show a snippet or a textarea for the HTML if needed, but preview is better */}
                        {/* <Textarea value={result.gemini_email_html} readOnly rows={10} className="mt-2 w-full text-xs bg-muted rounded-md" /> */}
                      </div>
                    )}
                    {!result?.gemini_category &&
                      !result?.gemini_contact_message &&
                      !result?.gemini_email_html && (
                        <p className="text-muted-foreground">
                          Brak danych z analizy AI do wyświetlenia.
                        </p>
                      )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
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
