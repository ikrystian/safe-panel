"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddPageDialog } from "@/components/add-page-dialog";
import {
  Search,
  Database,
  ExternalLink,
  Trash2,
  History,
  Loader2,
  Check,
  X,
  Eye,
  User,
  Clock,
  AlertCircle,
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

interface SearchHistory {
  search_query: string;
  count: number;
  last_search: string;
}

interface SearchPagination {
  id?: number;
  search_query: string;
  user_id: string;
  last_start_position: number;
  total_requests_made: number;
  last_updated?: string;
}

export default function PagesDatabasePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [paginationState, setPaginationState] =
    useState<SearchPagination | null>(null);
  const [allPaginationStates, setAllPaginationStates] = useState<
    SearchPagination[]
  >([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [queryToDelete, setQueryToDelete] = useState<string | null>(null);
  const [activeHistoryItem, setActiveHistoryItem] = useState<string | null>(
    null
  );

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory();
    loadAllPaginationStates();
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

  const loadAllPaginationStates = async () => {
    try {
      const response = await fetch("/api/search?pagination=true");
      if (response.ok) {
        const data = await response.json();
        setAllPaginationStates(data.paginationStates || []);
      }
    } catch (error) {
      console.error("Error loading pagination states:", error);
    }
  };

  const handleSearch = async (e: React.FormEvent, resetPagination = false) => {
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
        body: JSON.stringify({
          query: searchQuery.trim(),
          resetPagination,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.results || []);
        setSelectedQuery(searchQuery.trim());
        setPaginationState({
          search_query: searchQuery.trim(),
          user_id: "",
          last_start_position: data.nextStartPosition || 0,
          total_requests_made: data.totalRequestsMadeOverall || 0,
        });
        await loadSearchHistory(); // Refresh history
        await loadAllPaginationStates(); // Refresh pagination states
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

  const continueSearch = async () => {
    if (!selectedQuery) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: selectedQuery,
          resetPagination: false,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Append new results to existing ones
        setSearchResults((prev) => [...prev, ...(data.results || [])]);
        setPaginationState({
          search_query: selectedQuery,
          user_id: "",
          last_start_position: data.nextStartPosition || 0,
          total_requests_made: data.totalRequestsMadeOverall || 0,
        });
        await loadSearchHistory(); // Refresh history
        await loadAllPaginationStates(); // Refresh pagination states
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

  const resultsTableRef = useRef<HTMLDivElement>(null);

  const loadHistoryResults = async (query: string) => {
    try {
      const response = await fetch(
        `/api/search?query=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setSelectedQuery(query);
        setPaginationState(data.pagination || null);
        setActiveHistoryItem(query); // Set as active item

        // Scroll to the results table after setting the state
        // Use a timeout to ensure the DOM has updated and the table is visible
        setTimeout(() => {
          resultsTableRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 100);
      }
    } catch (error) {
      console.error("Error loading history results:", error);
    }
  };

  const handleDeleteClick = (query: string) => {
    setQueryToDelete(query);
    setDeleteDialogOpen(true);
  };

  const deleteSearchHistory = async () => {
    if (!queryToDelete) return;

    try {
      const response = await fetch("/api/search", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryToDelete }),
      });

      if (response.ok) {
        await loadSearchHistory();
        await loadAllPaginationStates();
        if (selectedQuery === queryToDelete) {
          setSearchResults([]);
          setSelectedQuery(null);
          setPaginationState(null);
          setActiveHistoryItem(null);
        }
      }
    } catch (error) {
      console.error("Error deleting search history:", error);
    } finally {
      setDeleteDialogOpen(false);
      setQueryToDelete(null);
    }
  };

  const processWebsite = async (id: number, processed: number) => {
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

  // Parse errors from JSON string
  const parseErrors = (errorsString: string | null): any[] => {
    if (!errorsString) return [];
    try {
      return JSON.parse(errorsString);
    } catch (e) {
      return [];
    }
  };

  // Get WordPress user errors
  const getWordPressUserErrors = (errorsString: string | null): any[] => {
    const errors = parseErrors(errorsString);
    return errors.filter((error) => error.type === "wordpress_users");
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
            Wprowadź frazę do wyszukania. System wykona zapytania do API i
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

          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">Dodaj stronę ręcznie</h3>
                <p className="text-xs text-muted-foreground">
                  Dodaj stronę bez używania wyszukiwarki
                </p>
              </div>
              <AddPageDialog onPageAdded={loadSearchHistory} />
            </div>
          </div>
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

      {/* Combined Search History and Pagination Status */}
      {searchHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historia wyszukiwań i status paginacji
            </CardTitle>
            <CardDescription>
              Kliknij na frazę, aby wyświetlić zapisane wyniki. Możesz
              kontynuować wyszukiwanie od miejsca gdzie skończyłeś.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {searchHistory.map((item) => {
                // Find corresponding pagination state
                const paginationState = allPaginationStates.find(
                  (state) => state.search_query === item.search_query
                );

                return (
                  <div
                    key={item.search_query}
                    className={`flex items-center justify-between p-3 border rounded-lg history-group-item transition-colors cursor-pointer ${
                      activeHistoryItem === item.search_query
                        ? "bg-primary/10 border-primary/30 shadow-sm"
                        : "bg-muted/50 hover:bg-muted/70"
                    }`}
                    onClick={() => loadHistoryResults(item.search_query)}
                  >
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-left font-medium ${
                            activeHistoryItem === item.search_query
                              ? "text-primary"
                              : ""
                          }`}
                        >
                          {item.search_query}
                        </span>
                        <Badge variant="secondary">{item.count} wyników</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Ostatnie wyszukiwanie:{" "}
                          {new Date(item.last_search).toLocaleDateString(
                            "pl-PL"
                          )}
                        </span>
                        {paginationState && (
                          <>
                            <span>
                              Zapytań wykonanych:{" "}
                              {paginationState.total_requests_made}
                            </span>
                            <span>
                              Następna pozycja:{" "}
                              {paginationState.last_start_position}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadHistoryResults(item.search_query);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Pokaż wyniki
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(item.search_query);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {selectedQuery && searchResults.length > 0 && (
        <Card ref={resultsTableRef}>
          <CardHeader>
            <CardTitle>Wyniki wyszukiwania dla: "{selectedQuery}"</CardTitle>
            <CardDescription>
              Znaleziono {searchResults.length} wyników (automatycznie
              przetworzonych)
              {paginationState && (
                <div className="mt-2 text-sm">
                  Wykonano {paginationState.total_requests_made} zapytań do API.
                  Następna pozycja startowa:{" "}
                  {paginationState.last_start_position}
                </div>
              )}
            </CardDescription>
            {paginationState && (
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={continueSearch}
                  disabled={isSearching}
                  variant="outline"
                  size="sm"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Pobieranie...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Kontynuuj wyszukiwanie
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32"></TableHead>
                  <TableHead className="w-32">Data</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Tytuł</TableHead>
                  <TableHead className="w-32">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((result, index) => (
                  <TableRow
                    key={`${result.link}-${index}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() =>
                      result.id &&
                      router.push(`/dashboard/pages-database/${result.id}`)
                    }
                  >
                    <TableCell>
                      <div className="flex items-center justify-center">
                        {result.processed === 0 ? (
                          <X className="h-4 w-4 text-gray-400" />
                        ) : result.processed === 1 ? (
                          <Clock className="h-4 w-4 text-blue-500" />
                        ) : result.processed === 2 ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : result.processed === 3 ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {result.created_at
                        ? new Date(result.created_at).toLocaleDateString(
                            "pl-PL"
                          )
                        : ""}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate">{result.link}</div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={result.title}>
                        {result.title || "Brak tytułu"}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            result.id &&
                              router.push(
                                `/dashboard/pages-database/${result.id}`
                              );
                          }}
                          disabled={!result.id}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdź usunięcie</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć historię wyszukiwania dla frazy "
              {queryToDelete}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground mt-2">
            <p>Ta akcja spowoduje usunięcie:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Wszystkich zapisanych wyników wyszukiwania</li>
              <li>Statusu paginacji dla tego zapytania</li>
              <li>Pobranych danych użytkowników WordPress</li>
            </ul>
            <p className="mt-2">
              <strong>Tej operacji nie można cofnąć.</strong>
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSearchHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Usuń
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
