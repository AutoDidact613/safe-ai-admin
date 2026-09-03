// כל קריאות ה-API של פיצ'ר הפורום, במקום אחד.
//
// כל פונקציה כאן מחזירה את ה-Response הגולמי (בדיוק כמו fetch() עצמו) ולא
// מפרשת/מטפלת בתגובה - זה נשאר באחריות הקומפוננטה הקוראת, בדיוק כמו קודם.
// המטרה היחידה של הקובץ הזה היא לרכז את בניית ה-URL/method/body במקום אחד,
// לא לשנות איך מטפלים בתוצאה או בשגיאות.

import { API_BASE_URL } from '../../config/api';
import { authFetch } from '../../utils/apiClient';

// --- פוסטים ---

export function fetchPosts(search: string, page: number, userRole: string): Promise<Response> {
  const baseUrl = search.trim()
    ? `${API_BASE_URL}/api/posts/search?query=${search}`
    : `${API_BASE_URL}/api/posts?page=${page}`;

  const url = baseUrl.includes('?')
    ? `${baseUrl}&userRole=${userRole}${!search.trim() ? '' : `&page=${page}`}`
    : `${baseUrl}?userRole=${userRole}&page=${page}`;

  return fetch(url);
}

export function fetchPostById(id: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/posts/${id}`);
}

export function fetchSimilarPosts(queryParam: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/posts/search-similar?${queryParam}`);
}

export function fetchStrictSimilarPosts(title: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/posts/search-strict-similar?title=${title}`);
}

export function createPost(payload: unknown): Promise<Response> {
  return authFetch(`${API_BASE_URL}/api/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function generateAiAssistance(mode: string, content: string): Promise<Response> {
  return authFetch(`${API_BASE_URL}/api/posts/ai-assist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, content }),
  });
}

export function moderatePost(postId: string, userId: string, actionType: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/posts/${postId}/moderation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, actionType }),
  });
}

export function ratePost(postId: string, userId: string | undefined, rating: number): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/posts/${postId}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ userId, rating }),
  });
}

export function incrementPostView(postId: string, userId: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/posts/${postId}/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

// --- תגובות ---

export function createComment(postId: string | undefined, payload: unknown): Promise<Response> {
  return authFetch(`${API_BASE_URL}/api/posts/${postId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function deleteComment(commentId: string, userId: string | undefined): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/posts/comment/${commentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

// --- תגיות ---

export function fetchTags(): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/tags`);
}

// --- העלאת קבצים ---

export function getUploadUrl(fileName: string, fileType: string): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/upload/get-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileType }),
  });
}

// שימי לב: זו העלאה ישירה ל-S3 (לא לשרת שלנו) - בכוונה נשארת fetch רגיל,
// בלי authFetch, כי אין צורך בטוקן ההתחברות שלנו מול S3 (ה-URL כבר חתום).
export function uploadFileToS3(uploadUrl: string, file: File): Promise<Response> {
  return fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
}
