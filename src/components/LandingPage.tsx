import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, Trophy, MessageSquare, Calendar, Sparkles, ShieldCheck, Flame, Star, Heart } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  useEffect(() => {
    console.log('🏠 LandingPage mounted, onGetStarted function:', onGetStarted);
  }, [onGetStarted]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-background via-brand-surface to-brand-background">
      {/* Background Orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-brand-primary/10 blur-3xl" />

      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-12">
        <div className="text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-brand-surface/60 border border-brand-border">
            <Sparkles className="w-4 h-4 text-brand-accent" />
            <span className="text-sm text-brand-text/90">Unfiltered opinions. Thoughtful conversations.</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary bg-clip-text text-transparent mb-4">
            Your Daily Hot Take
          </h1>
          <p className="text-lg md:text-xl text-brand-muted mb-8 leading-relaxed">
            Post one powerful take a day. React, reply, and climb the leaderboard. It’s social—without the doom scroll.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={onGetStarted} size="lg" className="btn-primary px-8 py-3 text-lg">
              Start Posting
            </Button>
            <div className="flex items-center gap-2 text-brand-muted text-sm">
              <ShieldCheck className="w-4 h-4" /> No spam. One take per day.
            </div>
          </div>

          {/* Social proof */}
          <div className="mt-8 grid grid-cols-3 max-w-md mx-auto text-center">
            <div>
              <div className="text-2xl font-bold text-brand-text">10k+</div>
              <div className="text-sm text-brand-muted">takes shared</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-text">95%</div>
              <div className="text-sm text-brand-muted">post completion</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-text">24/7</div>
              <div className="text-sm text-brand-muted">global topics</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-brand-text">Why TopTake?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          <Card className="border-brand-border/60 bg-brand-surface/80 backdrop-blur-sm hover:border-brand-accent transition-colors">
            <CardHeader>
              <Calendar className="w-10 h-10 text-brand-primary mb-2" />
              <CardTitle>Daily Topics</CardTitle>
              <CardDescription>
                Fresh conversation starters every day to spark meaningful discussions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-brand-border/60 bg-brand-surface/80 backdrop-blur-sm hover:border-brand-accent transition-colors">
            <CardHeader>
              <Zap className="w-10 h-10 text-brand-accent mb-2" />
              <CardTitle>Build Streaks</CardTitle>
              <CardDescription>
                Maintain daily engagement and watch your streak grow
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-brand-border/60 bg-brand-surface/80 backdrop-blur-sm hover:border-brand-accent transition-colors">
            <CardHeader>
              <Users className="w-10 h-10 text-brand-primary mb-2" />
              <CardTitle>Community</CardTitle>
              <CardDescription>
                Connect with like-minded people and discover diverse perspectives
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-brand-border/60 bg-brand-surface/80 backdrop-blur-sm hover:border-brand-accent transition-colors">
            <CardHeader>
              <MessageSquare className="w-10 h-10 text-brand-accent mb-2" />
              <CardTitle>Engage & React</CardTitle>
              <CardDescription>
                Like, comment, and interact with takes from the community
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-brand-border/60 bg-brand-surface/80 backdrop-blur-sm hover:border-brand-accent transition-colors">
            <CardHeader>
              <Trophy className="w-10 h-10 text-brand-primary mb-2" />
              <CardTitle>Leaderboards</CardTitle>
              <CardDescription>
                Compete for the top spot and showcase your best takes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-brand-border/60 bg-brand-surface/80 backdrop-blur-sm hover:border-brand-accent transition-colors">
            <CardHeader>
              <Sparkles className="w-10 h-10 text-brand-accent mb-2" />
              <CardTitle>Anonymous Mode</CardTitle>
              <CardDescription>
                Share controversial takes anonymously with limited credits
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* How it works */}
      <div className="container mx-auto px-4 py-14">
        <h3 className="text-2xl font-bold text-center mb-8 text-brand-text">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-brand-surface/70 border-brand-border">
            <CardHeader>
              <Flame className="w-8 h-8 text-brand-accent mb-2" />
              <CardTitle>1. Get the Prompt</CardTitle>
              <CardDescription>We drop a fresh topic daily. You get one chance to make it count.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-brand-surface/70 border-brand-border">
            <CardHeader>
              <MessageSquare className="w-8 h-8 text-brand-primary mb-2" />
              <CardTitle>2. Share Your Take</CardTitle>
              <CardDescription>Post instantly or use anonymous mode when things get spicy.</CardDescription>
            </CardHeader>
          </Card>
          <Card className="bg-brand-surface/70 border-brand-border">
            <CardHeader>
              <Star className="w-8 h-8 text-brand-accent mb-2" />
              <CardTitle>3. React & Rise</CardTitle>
              <CardDescription>Earn reactions, spark threads, and rise up the leaderboard.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-brand-primary to-brand-accent py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-brand-text mb-4">
            Ready to Share Your Take?
          </h2>
          <p className="text-brand-muted text-lg mb-8">
            Join thousands of users sharing their daily perspectives
          </p>
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="btn-secondary px-8 py-3 text-lg"
          >
            Join TopTake
          </Button>
          <div className="mt-4 text-sm text-brand-text/80 flex items-center gap-2 justify-center">
            <Heart className="w-4 h-4" /> No ads, ever.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;