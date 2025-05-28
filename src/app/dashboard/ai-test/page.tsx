"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bot, Send, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const AI_MODELS = [
  {
    value: "deepseek/deepseek-chat-v3-0324:free",
    label: "DeepSeek Chat V3 (Free)",
  },
  { value: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
  { value: "deepseek/deepseek-r1:free", label: "DeepSeek: R1 (free)" },
  { value: "google/gemma-3-27b-it:free", label: "Google: Gemma 3 27B (free)" },
  {
    value: "tngtech/deepseek-r1t-chimera:free",
    label: "TNG: DeepSeek R1T Chimera (free)",
  },
  {
    value: "meta-llama/llama-3.1-8b-instruct:free",
    label: "Llama 3.1 8B (Free)",
  },
  {
    value: "google/gemini-2.0-flash-exp:free",
    label: "Google: Gemini 2.0 Flash Experimental (free)",
  },

  { value: "qwen/qwen3-235b-a22b:free", label: "qwen/qwen3-235b-a22b:free" },

  { value: "microsoft/mai-ds-r1:free", label: "microsoft/mai-ds-r1:free" },

  {
    value: "mistralai/devstral-small:free",
    label: "mistralai/devstral-small:free",
  },

  {
    value: "deepseek/deepseek-prover-v2:free",
    label: "deepseek/deepseek-prover-v2:free",
  },

  { value: "qwen/qwq-32b:free", label: "qwen/qwq-32b:free" },

  {
    value: "mistralai/mistral-nemo:free",
    label: "mistralai/mistral-nemo:free",
  },
];

export default function AITestPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(
    "deepseek/deepseek-chat-v3-0324:free"
  );
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) {
      setError("Proszę wprowadzić prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setResponse("");
    setUsage(null);

    try {
      const res = await fetch("/api/ai-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Wystąpił błąd podczas komunikacji z API"
        );
      }

      setResponse(data.response);
      setUsage(data.usage);
    } catch (err: any) {
      setError(err.message || "Wystąpił nieoczekiwany błąd");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const clearForm = () => {
    setPrompt("");
    setResponse("");
    setError(null);
    setUsage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="h-8 w-8" />
          AI Test
        </h1>
        <p className="text-muted-foreground">
          Testuj różne modele AI z OpenRouter API
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model">Model AI</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz model AI" />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                otworz strone https://dev.gal-bud.pl/ i znajdz informacje
                kontaktowe
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt">Twój prompt</Label>
                <Textarea
                  id="prompt"
                  placeholder="Wprowadź swój prompt tutaj..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={8}
                  className="resize-none max-h-4"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={loading || !prompt.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {loading ? "Przetwarzanie..." : "Wyślij"}
                </Button>
                <Button type="button" variant="outline" onClick={clearForm}>
                  Wyczyść
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Response */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Odpowiedź AI</CardTitle>
              {response && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Skopiowano!" : "Kopiuj"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">
                  Generowanie odpowiedzi...
                </span>
              </div>
            )}

            {response && !loading && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {response}
                  </ReactMarkdown>
                </div>

                {usage && (
                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary">
                      Tokens: {usage.prompt_tokens || 0} +{" "}
                      {usage.completion_tokens || 0} = {usage.total_tokens || 0}
                    </Badge>
                    {usage.total_cost && (
                      <Badge variant="outline">
                        Koszt: ${usage.total_cost}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}

            {!response && !loading && (
              <div className="text-center py-8 text-muted-foreground">
                Wprowadź prompt i kliknij "Wyślij" aby otrzymać odpowiedź od AI
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
