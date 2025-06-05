export interface User {
  id: string;
  username: string;
  streak: number;
  dramaScore: number;
  anonymousCredits: number;
  isPremium: boolean;
  lastPostDate?: string;
  anonymous_uses_remaining?: number;
  delete_uses_remaining?: number;
  boost_uses_remaining?: number;
  history_unlocked?: boolean;
  extra_takes_remaining?: number;
  is_admin?: boolean;
  hasPostedToday?: boolean;
  theme_id?: string;
}

export interface Take {
  id: string;
  userId: string;
  username?: string;
  content: string;
  isAnonymous: boolean;
  timestamp: string;
  reactions: Reactions;
  commentCount: number;
  isBoosted?: boolean;
}

export interface Reactions {
  wildTake: number;
  fairPoint: number;
  mid: number;
  thatYou: number;
}

export interface DailyPrompt {
  id: string;
  text: string;
  date: string;
  category?: PromptCategory;
  engagement_score?: number;
  created_by?: string;
}

export interface Comment {
  id: string;
  takeId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: string;
}

export interface FeaturePack {
  id: string;
  user_id: string;
  type: 'delete' | 'anonymous' | 'boost' | 'history' | 'extra_take';
  uses_granted: number;
  uses_remaining: number;
  granted_at: string;
  expires_at?: string;
  created_at: string;
}

export interface PackUsage {
  anonymous_uses_remaining: number;
  delete_uses_remaining: number;
  boost_uses_remaining: number;
  history_unlocked: boolean;
  extra_takes_remaining: number;
}

export type PromptCategory = 
  | 'deep' 
  | 'controversial' 
  | 'lighthearted' 
  | 'personal' 
  | 'hypothetical' 
  | 'current_events' 
  | 'philosophical' 
  | 'creative';

export interface BulkPromptRequest {
  count: number;
  categories?: PromptCategory[];
  themes?: string[];
}