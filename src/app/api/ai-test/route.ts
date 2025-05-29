import { NextResponse } from "next/server";
import { processWithAIAgent } from "@/lib/ai-agent";

export async function POST(request: Request) {
  try {
    const { prompt, model, webSearch, searchContextSize, maxResults } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Brak wymaganego parametru: prompt" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is not set in environment variables.");
      return NextResponse.json(
        { error: "Klucz API OpenRouter nie jest skonfigurowany na serwerze." },
        { status: 500 }
      );
    }

    const selectedModel = model || "deepseek/deepseek-chat-v3-0324:free";

    // Check if AI Agent is enabled
    if (webSearch) {
      // Use AI Agent to process prompt with web pages
      const agentResult = await processWithAIAgent(
        prompt,
        searchContextSize || "medium",
        maxResults || 3,
        selectedModel
      );

      if (!agentResult.success) {
        return NextResponse.json(
          { error: agentResult.error },
          { status: 400 }
        );
      }

      // Create annotations from processed pages
      const annotations = agentResult.pages.map(page => ({
        url_citation: {
          url: page.url,
          title: page.title || page.url,
          content: page.error ? `Błąd: ${page.error}` : page.content.substring(0, 200) + '...'
        }
      }));

      return NextResponse.json({
        response: agentResult.analysis,
        model: selectedModel,
        annotations,
        webSearchEnabled: true,
        aiAgentUsed: true,
        usage: agentResult.usage
      });
    }

    // Standard AI request without web search
    const newPrompt = JSON.stringify({
      "task": "Znajdź na stronie https://wedohotels.pl odnośnik do strony kontaktu i określ kategorię strony",
      "requirements": {
        "output_format": {
          "type": "JSON",
          "structure": {
            "contact_url": "string (pełny URL strony kontaktowej)",
            "category": "string (dopasowana kategoria z listy)",
            "wordpress": "boolean (czy strona używa WordPress)"
          }
        },
        "categories": [
          "Hotele i noclegi",
          "Usługi biznesowe",
          "Usługi profesjonalne",
          "Usługi osobiste"
        ],
        "wordpress_check": "Sprawdź obecność 'wp-content' w kodzie strony"
      },
      "instructions": "Zwróć TYLKO JSON bez żadnych dodatkowych komentarzy"
    });

    const requestBody = {
      model: selectedModel,
      messages: [{ role: "user", content: newPrompt }],
    };

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!openRouterResponse.ok) {
      const errorBody = await openRouterResponse.text();
      console.error("OpenRouter API error:", openRouterResponse.status, errorBody);
      return NextResponse.json(
        { error: `Błąd API OpenRouter: ${openRouterResponse.status} ${errorBody}` },
        { status: openRouterResponse.status }
      );
    }

    const openRouterData = await openRouterResponse.json();
    const responseText = openRouterData.choices?.[0]?.message?.content;

    if (!responseText) {
      console.error("No content in OpenRouter response:", openRouterData);
      return NextResponse.json(
        { error: "Brak zawartości w odpowiedzi od OpenRouter." },
        { status: 500 }
      );
    }

    try {
      const parsedResponse = JSON.parse(responseText);
      return NextResponse.json({
        response: parsedResponse,
        model: requestBody.model, // Return the actual model used
        usage: openRouterData.usage || null,
        annotations: openRouterData.choices?.[0]?.message?.annotations || [],
        webSearchEnabled: false,
        aiAgentUsed: false
      });
    } catch (e) {
      console.error("Error parsing JSON response:", responseText);
      return NextResponse.json({
        error: "Błąd parsowania odpowiedzi JSON od OpenRouter.",
        status: 500
      });
    }

  } catch (error: unknown) {
    console.error("Error in /api/ai-test:", error);
    let errorMessage = "Wystąpił błąd podczas przetwarzania żądania.";
    if (error instanceof Error) {
      errorMessage = `Błąd: ${error.message}`;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
