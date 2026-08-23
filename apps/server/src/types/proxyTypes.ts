/**
 * server/src/types/proxyTypes.ts
 *
 * Shared request/response types used between controllers and services.
 */

export interface EmbeddingRequest {
  category: string;
  originText: string;
}

export interface EvaluateRequest {
  profileId: string;
  text: string;
  auditDisabled?: boolean;
}

export interface EvaluateResponse {
  allowed: boolean;
  reason: string;
}

export interface AIProfileInput {
  name: string;
  allowedCategories?: string[];
  blockedCategories?: string[];
  thresholdAllowed?: number;
  thresholdBlocked?: number;
  similarityMargin?: number;
  createdBy: string;
  creatorEmail: string;
  contentPrompts?: string[];
  behaviorPrompts?: string[];
  knowledgePrompts?: string[];
}
