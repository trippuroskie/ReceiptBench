
import { ModelId } from "../types";

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterService {
  private apiKey: string;
  private baseUrl = "https://openrouter.ai/api/v1";

  constructor() {
    this.apiKey = process.env.API_KEY || "";
    if (!this.apiKey) {
      console.warn("OpenRouter API Key is missing!");
    }
  }

  async runOCR(
    modelId: ModelId,
    prompt: string,
    imageBase64: string,
    mimeType: string // OpenRouter/OpenAI expects data:image/jpeg;base64,...
  ): Promise<{ text: string; rawResponse: any; duration: number }> {
    const startTime = Date.now();

    const payload = {
      model: modelId,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" } // Force JSON output
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "ReceiptBench",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();
      const duration = Date.now() - startTime;
      const text = data.choices[0]?.message?.content || "{}";

      return {
        text,
        rawResponse: data,
        duration
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('OCR Request Timed Out (60s)');
      }
      console.error("OCR Request Failed:", error);
      throw error;
    }
  }

  async refinePrompt(currentPrompt: string, groundTruth: string, actualOutput: string): Promise<string> {
    const refinementSystemPrompt = `You are a World-Class Prompt Engineer specializing in Vision LLM OCR pipelines. 
Your goal is to improve the accuracy of a prompt by analyzing a failure case.

You will be given:
1. The Current Prompt.
2. The Expected JSON (Ground Truth).
3. The Actual JSON (What the model produced).

Tasks:
- Identify why the actual output differed from the ground truth.
- Provide a brief diagnosis.
- Propose a refined prompt that is more explicit, handles edge cases better, or clarifies the JSON structure.

Return your response in Markdown with two sections:
### 🛠 Diagnosis
[Bullet points on what went wrong]

### 📝 Proposed Refinement
[The full text of the improved prompt]`;

    const payload = {
      model: "google/gemini-2.0-flash-001", // Fast and capable for this task
      messages: [
        {
          role: "system",
          content: refinementSystemPrompt
        },
        {
          role: "user",
          content: `
CURRENT PROMPT:
${currentPrompt}

EXPECTED OUTPUT (GROUND TRUTH):
${groundTruth}

ACTUAL OUTPUT:
${actualOutput}
          `
        }
      ]
    };

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "ReceiptBench",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Refinement Request Failed: ${response.status}`);
      }

      const data: OpenRouterResponse = await response.json();
      return data.choices[0]?.message?.content || "Could not generate refinement suggestions.";

    } catch (error) {
      console.error("Refinement failed:", error);
      return "Error generating refinement.";
    }
  }
}
