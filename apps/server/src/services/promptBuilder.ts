/**
 * server/src/services/promptBuilder.ts
 *
 */
import logger from "../logger";
import { PromptService } from "./promptService";


export async function buildSystemPrompt(profile: any): Promise<string> {

  const dbPrompt = await PromptService.getPromptByCode("SYSTEM_PROMPT");

  logger.info(`Building system prompt for profile: ${profile?.name || "N/A"} PROMPT: ${dbPrompt}`);


  return [
    dbPrompt.content,
    ...(profile?.contentPrompts || []),
    ...(profile?.behaviorPrompts || []),
    ...(profile?.knowledgePrompts || []),
  ]
    .filter(Boolean)
    .join("\n\n");
}



export async function buildFilterPrompt(
  profileName: string,
  profileDesc: string,
): Promise<string> {
  const dbPrompt = await PromptService.getPromptByCode("FILTER_PROMPT");


  logger.info(`Building filter prompt for profile: ${profileName}\n ${profileDesc}\n PROMPT: ${dbPrompt}`);

  return `
${dbPrompt.content}

Profile name: ${profileName}
Profile description: ${profileDesc}

Respond only with "allowed" or "blocked".
`.trim();
}
