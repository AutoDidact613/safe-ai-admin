// /**
//  * server/src/services/llmRouter.ts
//  *
//  * Helper that interacts with OpenAI to obtain an "allowed"/"blocked" decision
//  * based on a prompt constructed from a specific profile.
//  */

import OpenAI from "openai";
import logger from "../logger";
import { buildFilterPrompt } from "./promptBuilder";

import { openai } from "../config/openai";

export async function getLLMDecision(
  text: string,
  profileName: string,
  profileDesc: string,
): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: await buildFilterPrompt(profileName, profileDesc),
        },
        { role: "user", content: text },
      ],
      max_tokens: 5,
      temperature: 0,
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return false;

    const decision = content.toLowerCase().trim();

    logger.info(`LLM Decision: ${decision} for profile ${profileName}`);
    return decision === "allowed";
  } catch (error) {
    logger.error("LLM Decision failed", error);
    return false;
  }
}


