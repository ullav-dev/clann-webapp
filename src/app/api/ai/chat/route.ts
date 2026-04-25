import { NextRequest } from "next/server";
import { streamText, convertToModelMessages } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { decryptKey, usernameFromBearer, type AiProvider, type AiSettings } from "@/lib/ai-settings";
import type { UIMessage } from "@ai-sdk/react";

const API_BASE = process.env.API_URL ?? "http://localhost:3000";

const GENEALOGY_SYSTEM_PROMPT = `You are a genealogy research assistant helping users research their family history.

You are knowledgeable about:
- Historical records: census records, birth/death/marriage certificates, parish registers, military records, land valuation records, probate records, and passenger lists
- Genealogy research techniques, strategies, and best practices
- Irish genealogy specifically: the 1901 and 1926 census, Griffith's Valuation, tithe applotment books, civil registration, church records, and the impact of the 1922 Four Courts fire on record availability
- Historical context: Famine emigration, Land War, Irish diaspora patterns, plantation history
- Name variants, anglicisation of Irish names, surname spelling variations, and patronymic naming conventions
- DNA analysis, genetic genealogy, and interpreting ethnicity estimates
- Major genealogy databases and repositories: Ancestry, FamilySearch, FindMyPast, IrishGenealogy.ie, PRONI, NLI

When helping users:
- Suggest specific record types and repositories for the time period and location they are researching
- Help interpret abbreviations and terminology in historical documents
- Explain historical context that may explain family movements or naming patterns
- Acknowledge when you are uncertain and suggest how to verify information
- Be concise but thorough; prioritise actionable research steps`;

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getRemoteSettings(authHeader: string): Promise<AiSettings | null> {
  const res = await fetch(`${API_BASE}/api/ai-settings`, {
    headers: { Authorization: authHeader },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return {
    provider: data.provider as AiProvider,
    model: data.model,
    ollamaUrl: data.ollama_url ?? undefined,
    encryptedKey: data.encrypted_key ?? undefined,
    iv: data.iv ?? undefined,
    authTag: data.auth_tag ?? undefined,
  };
}

function getDecryptedApiKey(settings: AiSettings): string | null {
  if (!settings.encryptedKey || !settings.iv || !settings.authTag) return null;
  try {
    return decryptKey(settings.encryptedKey, settings.iv, settings.authTag);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!usernameFromBearer(authHeader)) return errorResponse("Unauthorized", 401);

  const settings = await getRemoteSettings(authHeader!);
  if (!settings) {
    return errorResponse(
      "No AI provider configured. Go to Settings to add your API key.",
      400,
    );
  }

  const { messages, personContext, treeContext } = (await req.json()) as {
    messages: UIMessage[];
    personContext?: string;
    treeContext?: string;
  };

  let systemPrompt = GENEALOGY_SYSTEM_PROMPT;
  if (personContext) {
    systemPrompt += `\n\n---\nCURRENT RESEARCH SUBJECT:\n${personContext}\n---`;
  }
  if (treeContext) {
    systemPrompt += `\n\n---\nFAMILY TREE DATA:\n${treeContext}\n---`;
  }

  try {
    let model;

    if (settings.provider === "anthropic") {
      const apiKey = getDecryptedApiKey(settings);
      if (!apiKey) return errorResponse("No Anthropic API key configured.", 400);
      model = createAnthropic({ apiKey })(settings.model);
    } else if (settings.provider === "openai") {
      const apiKey = getDecryptedApiKey(settings);
      if (!apiKey) return errorResponse("No OpenAI API key configured.", 400);
      model = createOpenAI({ apiKey })(settings.model);
    } else if (settings.provider === "ollama") {
      const baseURL = (settings.ollamaUrl ?? "http://localhost:11434") + "/v1";
      model = createOpenAICompatible({ name: "ollama", baseURL })(settings.model);
    } else {
      return errorResponse("Unknown provider.", 400);
    }

    const result = streamText({
      model,
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed";
    return errorResponse(message, 502);
  }
}
