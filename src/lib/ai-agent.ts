// AI Agent for opening web pages and extracting information based on prompts

export interface WebPageContent {
  url: string;
  title: string;
  content: string;
  error?: string;
}

export interface AIAgentResult {
  success: boolean;
  pages: WebPageContent[];
  analysis: string;
  usage?: any; // Add usage information
  error?: string;
}

/**
 * Extracts URLs from a prompt using various patterns
 */
export function extractUrlsFromPrompt(prompt: string): string[] {
  const urlPatterns = [
    // Standard HTTP/HTTPS URLs
    /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi,
    // URLs without protocol
    /(?:^|\s)((?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi
  ];

  const urls: string[] = [];

  urlPatterns.forEach(pattern => {
    const matches = prompt.match(pattern);
    if (matches) {
      matches.forEach(match => {
        let url = match.trim();
        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        // Validate URL format
        try {
          new URL(url);
          if (!urls.includes(url)) {
            urls.push(url);
          }
        } catch {
          // Invalid URL, skip
        }
      });
    }
  });

  return urls;
}

/**
 * Fetches content from a web page
 */
export async function fetchWebPageContent(url: string): Promise<WebPageContent> {
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        url,
        title: '',
        content: '',
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Brak tytułu';

    // Extract text content (simple approach - remove HTML tags)
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // Limit content length to avoid token limits
    if (content.length > 5000) {
      content = content.substring(0, 5000) + '...';
    }

    return {
      url,
      title,
      content
    };

  } catch (error: unknown) {
    let errorMessage = 'Błąd podczas pobierania strony';

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout - strona nie odpowiada';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      url,
      title: '',
      content: '',
      error: errorMessage
    };
  }
}

/**
 * Analyzes web page content using AI based on user prompt
 */
export async function analyzeWithAI(
  prompt: string,
  pages: WebPageContent[],
  analysisDepth: string,
  model: string = "deepseek/deepseek-chat-v3-0324:free"
): Promise<{ analysis: string; usage: any; }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OpenRouter API key not configured');
  }

  // Prepare context based on analysis depth
  let contextInstructions = '';
  switch (analysisDepth) {
    case 'low':
      contextInstructions = 'Przeprowadź podstawową analizę treści stron. Skup się na głównych informacjach.';
      break;
    case 'medium':
      contextInstructions = 'Przeprowadź średnią analizę treści stron. Uwzględnij szczegóły i kontekst.';
      break;
    case 'high':
      contextInstructions = 'Przeprowadź szczegółową analizę treści stron. Uwzględnij wszystkie istotne informacje, szczegóły i powiązania.';
      break;
  }

  // Prepare pages content for AI
  const pagesContent = pages.map(page => {
    if (page.error) {
      return `URL: ${page.url}\nBłąd: ${page.error}`;
    }
    return `URL: ${page.url}\nTytuł: ${page.title}\nTreść: ${page.content}`;
  }).join('\n\n---\n\n');

  const aiPrompt = `${contextInstructions}

Oryginalny prompt użytkownika: "${prompt}"

Treść pobranych stron:
${pagesContent}

Na podstawie powyższych informacji odpowiedz na prompt użytkownika. Jeśli któraś ze stron nie została pobrana z powodu błędu, wspomnij o tym w odpowiedzi.`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: aiPrompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const responseText = data.choices?.[0]?.message?.content;

  if (!responseText) {
    throw new Error('Brak zawartości w odpowiedzi od AI');
  }

  return {
    analysis: responseText,
    usage: data.usage
  };
}

/**
 * Main AI Agent function that processes prompt, fetches pages, and analyzes content
 */
export async function processWithAIAgent(
  prompt: string,
  analysisDepth: string = 'medium',
  maxPages: number = 3,
  model: string = "deepseek/deepseek-chat-v3-0324:free"
): Promise<AIAgentResult> {
  try {
    // Extract URLs from prompt
    const urls = extractUrlsFromPrompt(prompt);

    if (urls.length === 0) {
      return {
        success: false,
        pages: [],
        analysis: '',
        error: 'Nie znaleziono żadnych URL-i w prompcie. Dodaj adresy stron, które chcesz przeanalizować.'
      };
    }

    // Limit number of pages to process
    const urlsToProcess = urls.slice(0, maxPages);

    // Fetch content from all pages
    const pages = await Promise.all(
      urlsToProcess.map(url => fetchWebPageContent(url))
    );

    // Check if any pages were successfully fetched
    const successfulPages = pages.filter(page => !page.error);
    if (successfulPages.length === 0) {
      return {
        success: false,
        pages,
        analysis: '',
        error: 'Nie udało się pobrać treści z żadnej ze stron. Sprawdź czy adresy URL są poprawne i dostępne.'
      };
    }

    // Analyze content with AI
    const aiResult = await analyzeWithAI(prompt, pages, analysisDepth, model);

    return {
      success: true,
      pages,
      analysis: aiResult.analysis,
      usage: aiResult.usage
    };

  } catch (error: unknown) {
    return {
      success: false,
      pages: [],
      analysis: '',
      error: error instanceof Error ? error.message : 'Wystąpił błąd podczas przetwarzania'
    };
  }
}
