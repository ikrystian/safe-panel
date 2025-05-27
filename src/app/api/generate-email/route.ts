import { NextResponse } from "next/server";
import { searchResultsRepo } from "@/lib/database"; // Import the SQLite repository

export async function POST(request: Request) {
  try {
    const { prompt, historyId, model: requestedModel } = await request.json(); // Renamed scanId to historyId, added model

    if (!prompt) {
      return NextResponse.json(
        { error: "Brak wymaganego parametru: prompt" },
        { status: 400 }
      );
    }
    if (!historyId) {
      return NextResponse.json(
        { error: "Brak wymaganego parametru: historyId" },
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

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: requestedModel || "deepseek/deepseek-chat-v3-0324:free", // Default model if not provided
        messages: [{ role: "user", content: prompt }],
      }),
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
    let rawText = openRouterData.choices?.[0]?.message?.content;

    if (!rawText) {
      console.error("No content in OpenRouter response:", openRouterData);
      return NextResponse.json(
        { error: "Brak zawartości w odpowiedzi od OpenRouter." },
        { status: 500 }
      );
    }

    // Clean the rawText if it's wrapped in Markdown
    if (rawText.startsWith("```json")) {
      rawText = rawText.substring(7); // Remove ```json\n
    }
    if (rawText.endsWith("```")) {
      rawText = rawText.substring(0, rawText.length - 3); // Remove ```
    }
    rawText = rawText.trim(); // Trim any leading/trailing whitespace

    let analysisData;
    try {
      analysisData = JSON.parse(rawText);
    } catch (parseError: any) {
      console.error("Error parsing OpenRouter JSON response:", parseError, "Raw text:", rawText);
      return NextResponse.json(
        { error: `Błąd parsowania odpowiedzi JSON od OpenRouter: ${parseError.message}. Otrzymano: ${rawText}` },
        { status: 500 }
      );
    }
    
    // Save the structured data to SQLite
    try {
      const timestamp = new Date().toISOString();
      // Using a more generic name for the method, assuming the table/columns can store generic analysis
      searchResultsRepo.updateGeminiAnalysisData( // Assuming a method like updateAnalysisData exists or updateGeminiAnalysisData can be used generically
        Number(historyId),
        analysisData.category || null,
        analysisData.contact?.message || null,
        analysisData.email_content?.html || null,
        timestamp
      );
      console.log(`Successfully saved analysis data for history_scrapped ID ${historyId}`);
    } catch (dbError: any) {
      console.error("Error saving analysis data to SQLite:", dbError);
      // Log the error but still return the analysis to the user.
    }

    return NextResponse.json({ analysis: analysisData });

  } catch (error: any) {
    console.error("Error in /api/generate-email:", error);
    let errorMessage = "Wystąpił błąd podczas przetwarzania żądania.";
    if (error.message) {
      errorMessage = `Błąd: ${error.message}`;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
