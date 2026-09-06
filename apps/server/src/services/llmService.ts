  // /**
  //  * server/src/services/llmService.ts
  //  *
  //  * Helper that interacts with OpenAI to obtain an "allowed"/"blocked" decision
  //  * based on a prompt constructed from a specific profile.
  //  */

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
        model: process.env.LLM_AS_A_JUDGE_MODEL || "gpt-5.4-nano",
        messages: [
          {
            role: "system",
            content: await buildFilterPrompt(profileName, profileDesc),
          },
          { role: "user", content: text },
        ],
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


