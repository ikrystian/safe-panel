import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { prompt, model } = await request.json();

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

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: selectedModel,
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
    const responseText = openRouterData.choices?.[0]?.message?.content;

    if (!responseText) {
      console.error("No content in OpenRouter response:", openRouterData);
      return NextResponse.json(
        { error: "Brak zawartości w odpowiedzi od OpenRouter." },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      response: responseText,
      model: selectedModel,
      usage: openRouterData.usage || null
    });

  } catch (error: any) {
    console.error("Error in /api/ai-test:", error);
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
