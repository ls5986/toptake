export interface User {
  id: string;
  username: string;
  bio?: string;
  full_name?: string;
  avatar_url?: string;
  is_premium: boolean;
  is_private: boolean;
  is_banned: boolean;
  is_admin: boolean;
  is_verified: boolean;
  current_streak: number;
  longest_streak: number;
  last_post_date?: string;
  last_active_at?: string;
  theme_id?: string;
}

export interface Take {
  id: string;
  userId: string;
  username?: string;
  content: string;
  isAnonymous: boolean;
  timestamp: string;
  prompt_id: string;
  reactionsCount: number;
  commentCount: number;
  isBoosted?: boolean;
}

export interface TakeReaction {
  id: string;
  take_id: string;
  user_id: string;
  reaction_type: 'wildTake' | 'fairPoint' | 'mid' | 'thatYou';
  created_at: string;
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
  // delete_uses_remaining: number;
  // boost_uses_remaining: number;
  // history_unlocked: boolean;
  // extra_takes_remaining: number;
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