// client/src/features/agents/types/agent.types.ts
// ← interface שמשקף את מה ש-API מחזיר (לא מחובר לשרת)

export interface AgentFilters {
  search: string;
  professional_field: string;
  task: string;
  framework: string;
  sortBy: 'downloads' | 'rating' | 'newest';
}
// שאר הטייפים (Agent, AgentManifest וכו') — מוגדרים ב-agent.ts בשרת,
// ב-client משתמשים ב-interface מקביל פשוט לפי צורת ה-response