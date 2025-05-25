"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Database,
  ExternalLink,
  Trash2,
  History,
  Loader2,
  Check,
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
}

interface SearchHistory {
  search_query: string;
  count: number;
  last_search: string;
}

export default function PagesDatabasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const response = await fetch("/api/search");
      if (response.ok) {
        const data = await response.json();
        setSearchHistory(data.history || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error("Error loading search history:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.results || []);
        setSelectedQuery(searchQuery.trim());
        await loadSearchHistory(); // Refresh history
      } else {
        setError(data.error || "Search failed");
      }
    } catch (error) {
      setError("Network error occurred");
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const loadHistoryResults = async (query: string) => {
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setSelectedQuery(query);
      }
    } catch (error) {
      console.error("Error loading history results:", error);
    }
  };

  const deleteSearchHistory = async (query: string) => {
    try {
      const response = await fetch("/api/search", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (response.ok) {
        await loadSearchHistory();
        if (selectedQuery === query) {
          setSearchResults([]);
          setSelectedQuery(null);
        }
      }
    } catch (error) {
      console.error("Error deleting search history:", error);
    }
  };

  const updateProcessedStatus = async (id: number, processed: number) => {
    try {
      const response = await fetch("/api/search", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, processed }),
      });

      if (response.ok) {
        // Update the local state
        setSearchResults((prev) =>
          prev.map((result) =>
            result.id === id ? { ...result, processed } : result
          )
        );
      }
    } catch (error) {
      console.error("Error updating processed status:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Baza stron</h1>
        <p className="text-muted-foreground">
          Wyszukaj strony internetowe i zapisz wyniki w bazie danych
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Wyszukiwanie
          </CardTitle>
          <CardDescription>
            Wprowadź frazę do wyszukania. System wykona 50 zapytań do API i
            zapisze wszystkie wyniki.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Wprowadź frazę do wyszukania..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wyszukiwanie...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Szukaj
                </>
              )}
            </Button>
          </form>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Łączna liczba wyników
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Historia wyszukiwań
            </CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searchHistory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktualne wyniki
            </CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{searchResults.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historia wyszukiwań</CardTitle>
            <CardDescription>
              Kliknij na frazę, aby wyświetlić zapisane wyniki
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {searchHistory.map((item) => (
                <div
                  key={item.search_query}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadHistoryResults(item.search_query)}
                      className="text-left"
                    >
                      {item.search_query}
                    </Button>
                    <Badge variant="secondary">{item.count} wyników</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.last_search).toLocaleDateString("pl-PL")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSearchHistory(item.search_query)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {selectedQuery && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wyniki wyszukiwania dla: "{selectedQuery}"</CardTitle>
            <CardDescription>
              Znaleziono {searchResults.length} wyników (automatycznie
              przetworzonych)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Poz.</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Tytuł</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead className="w-24">Processed</TableHead>
                  <TableHead className="w-32">Data</TableHead>
                  <TableHead className="w-16">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result, index) => (
                  <TableRow key={`${result.link}-${index}`}>
                    <TableCell className="font-medium">
                      {result.position || index + 1}
                    </TableCell>

                    <TableCell className="max-w-xs">
                      <div className="truncate">
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          title={result.link}
                        >
                          {result.link}
                        </a>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={result.title}>
                        {result.title || "Brak tytułu"}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div
                        className="text-sm text-muted-foreground line-clamp-2"
                        title={result.snippet}
                      >
                        {result.snippet || "Brak opisu"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateProcessedStatus(
                            result.id!,
                            result.processed === 1 ? 0 : 1
                          )
                        }
                        className={`${
                          result.processed === 1
                            ? "text-green-600 hover:text-green-700"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                        disabled={!result.id}
                      >
                        {result.processed === 1 ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {result.created_at
                        ? new Date(result.created_at).toLocaleDateString(
                            "pl-PL"
                          )
                        : ""}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* No Results Message */}
      {selectedQuery && searchResults.length === 0 && !isSearching && (
        <Card>
          <CardContent className="text-center py-8">
            <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Brak wyników</h3>
            <p className="text-muted-foreground">
              Nie znaleziono wyników dla frazy "{selectedQuery}"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
