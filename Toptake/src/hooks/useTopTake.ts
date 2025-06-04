import { useState, useEffect } from 'react';
import { User, Take, DailyPrompt, Comment } from '@/types';

const DAILY_PROMPTS = [
  "What's the most overrated thing that everyone seems to love?",
  "If you could eliminate one social media platform forever, which would it be and why?",
  "What's a popular opinion that you think is completely wrong?",
  "What's something everyone pretends to understand but actually doesn't?",
  "What's the worst advice that's commonly given?"
];

const MOCK_TAKES: Take[] = [
  {
    id: '2',
    userId: '2',
    username: 'TechGuru',
    content: 'Honestly? Social media influencers. Most of them are just selling you stuff wrapped in fake authenticity.',
    isAnonymous: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    reactions: { wildTake: 12, fairPoint: 8, mid: 3, thatYou: 1 },
    commentCount: 5
  },
  {
    id: '3',
    userId: '3',
    content: 'Coffee culture. People act like they can\'t function without their $7 latte but it\'s just caffeine addiction with extra steps.',
    isAnonymous: true,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    reactions: { wildTake: 23, fairPoint: 15, mid: 7, thatYou: 4 },
    commentCount: 12
  }
];

export const useTopTake = () => {
  const [user, setUser] = useState<User>({
    id: '1',
    username: 'user123',
    streak: 5,
    dramaScore: 42,
    anonymousCredits: 3,
    isPremium: false
  });
  
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [takes, setTakes] = useState<Take[]>(MOCK_TAKES);
  const [todayPrompt, setTodayPrompt] = useState<DailyPrompt>({ 
    id: '1', 
    text: DAILY_PROMPTS[0], 
    date: new Date().toDateString() 
  });

  const submitTake = (content: string, isAnonymous: boolean = false) => {
    const newTake: Take = {
      id: Date.now().toString(),
      userId: user.id,
      username: isAnonymous ? undefined : user.username,
      content,
      isAnonymous,
      timestamp: new Date().toISOString(),
      reactions: { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
      commentCount: 0
    };
    
    setTakes(prev => [newTake, ...prev]);
    setHasPostedToday(true);
    
    if (isAnonymous && user.anonymousCredits > 0) {
      setUser(prev => ({ ...prev, anonymousCredits: prev.anonymousCredits - 1 }));
    }
  };

  return {
    user,
    hasPostedToday,
    takes,
    todayPrompt,
    submitTake
  };
};