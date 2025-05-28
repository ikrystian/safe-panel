"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface AddPageDialogProps {
  onPageAdded?: () => void;
}

export function AddPageDialog({ onPageAdded }: AddPageDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    link: "",
    search_query: "",
    category: 2, // Default category for manual entries
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setFormData({
          title: "",
          link: "",
          search_query: "",
          category: 2,
        });

        // Call callback to refresh parent component
        if (onPageAdded) {
          onPageAdded();
        }

        // Close dialog after short delay to show success message
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
      } else {
        setError(data.error || "Wystąpił błąd podczas dodawania strony");
      }
    } catch (error) {
      setError("Błąd połączenia z serwerem");
      console.error("Error adding page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isFormValid = () => {
    return (
      formData.link.trim() &&
      formData.search_query.trim() &&
      isValidUrl(formData.link.trim())
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj stronę ręcznie
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Dodaj stronę ręcznie</DialogTitle>
          <DialogDescription>
            Dodaj stronę internetową do bazy danych bez używania wyszukiwarki.
            Wymagane są tylko link i fraza wyszukiwania.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="link" className="text-sm font-medium">
              Link do strony *
            </label>
            <Input
              id="link"
              type="url"
              placeholder="https://example.com"
              value={formData.link}
              onChange={(e) => handleInputChange("link", e.target.value)}
              disabled={loading}
              required
            />
            {formData.link && !isValidUrl(formData.link) && (
              <p className="text-xs text-red-500">Nieprawidłowy format URL</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="search_query" className="text-sm font-medium">
              Fraza wyszukiwania *
            </label>
            <Input
              id="search_query"
              placeholder="Fraza, dla której ta strona jest wynikiem"
              value={formData.search_query}
              onChange={(e) =>
                handleInputChange("search_query", e.target.value)
              }
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Tytuł strony
            </label>
            <Input
              id="title"
              placeholder="Tytuł strony (opcjonalnie)"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Kategoria</label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Kategoria {formData.category}</Badge>
              <span className="text-xs text-muted-foreground">
                (Ręcznie dodane strony mają domyślnie kategorię 2)
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700">
                Strona została pomyślnie dodana!
              </span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={loading || !isFormValid()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Dodawanie...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Dodaj stronę
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
