export interface Post {
  _id: string;
  title: string;
  content: string;
  category: string;
  attachments: string[];
  viewsCount: number;
  commentCount?: number;
  rating?: number;
  author: { _id?: string; name: string };
  createdAt: string;
  tags: (string | { _id: string; name: string })[];
  lastComment?: { authorName: string; content: string } | null;
  isBlocked?: boolean;
  isLocked?: boolean;
  ratingCount: number;
  averageRating: number;
  ratedBy?: string[];
}

export interface Comment {
  _id: string;
  content: string;
  author: { name: string };
  createdAt: string;
  attachments?: string[];
}

export interface SimilarPost {
  _id: string;
  title: string;
}

export interface TagOption {
  value: string;
  label: string;
}
