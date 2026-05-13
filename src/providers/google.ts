import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIProvider, ProviderError } from "./base";

export class GoogleProvider implements AIProvider {
  name = "google";
  private client: GoogleGenerativeAI;
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || "";
    this.client = new GoogleGenerativeAI(this.apiKey);
  }

  async listModels(): Promise<string[]> {
    if (!this.apiKey) {
      throw new ProviderError("Google API key is required to list models", "auth");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}&pageSize=100`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!res.ok) {
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new ProviderError("Invalid Google API key", "auth");
        }
        throw new ProviderError(`Google API error: ${res.statusText}`, "unknown");
      }
      const data = await res.json();
      const models: string[] = (data.models || [])
        .map((m: any) => m.name?.replace("models/", ""))
        .filter((id: string) => id && id.startsWith("gemini"));
      return models.length > 0 ? models : ["gemini-1.5-flash", "gemini-1.5-pro"];
    } catch (err: any) {
      clearTimeout(timeout);
      if (err instanceof ProviderError) throw err;
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Google request timed out after 10s", "timeout");
      }
      throw new ProviderError(err.message || "Failed to list Google models", "unknown");
    }
  }

  async send(systemPrompt: string, userPrompt: string, model: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const genModel = this.client.getGenerativeModel({
        model,
        systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
        generationConfig: { temperature: 0.3 },
      });
      const result = await genModel.generateContent(
        {
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      return result.response.text() || "";
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError" || err.code === "ETIMEDOUT") {
        throw new ProviderError("Google request timed out after 10s", "timeout");
      }
      if (err.status === 401 || err.message?.includes("API key not valid")) {
        throw new ProviderError("Invalid Google API key", "auth");
      }
      if (err.status === 404 || err.message?.includes("is not found")) {
        const suggestion = model.includes("latest") ? "" : ` Try "${model}-latest" instead.`;
        throw new ProviderError(
          `Model "${model}" is not available.${suggestion} Go to Configure AI and fetch models to see valid options.`,
          "unknown"
        );
      }
      if (err.status >= 500 || err.code === "ECONNREFUSED") {
        throw new ProviderError("Google service unavailable", "network");
      }
      throw new ProviderError(err.message || "Google request failed", "unknown");
    }
  }
}
