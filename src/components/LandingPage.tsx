import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, Trophy, MessageSquare, Calendar, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  useEffect(() => {
    console.log('🏠 LandingPage mounted, onGetStarted function:', onGetStarted);
  }, [onGetStarted]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-background via-brand-surface to-brand-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16 pb-12">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-4 bg-brand-surface text-brand-primary hover:bg-brand-accent">
            <Sparkles className="w-4 h-4 mr-1 text-brand-accent" />
            Share Your Perspective
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent mb-6">
            TopTake
          </h1>
          <p className="text-xl text-brand-muted mb-8 leading-relaxed">
            Share your thoughts on daily topics, build engagement streaks, and connect with a community of diverse voices.
          </p>
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="btn-primary px-8 py-3 text-lg"
          >
            Get Started Free
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-brand-text">
          Why TopTake?
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-brand-surface">
            <CardHeader>
              <Calendar className="w-10 h-10 text-brand-primary mb-2" />
              <CardTitle>Daily Topics</CardTitle>
              <CardDescription>
                Fresh conversation starters every day to spark meaningful discussions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-brand-surface">
            <CardHeader>
              <Zap className="w-10 h-10 text-brand-accent mb-2" />
              <CardTitle>Build Streaks</CardTitle>
              <CardDescription>
                Maintain daily engagement and watch your streak grow
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-brand-surface">
            <CardHeader>
              <Users className="w-10 h-10 text-brand-primary mb-2" />
              <CardTitle>Community</CardTitle>
              <CardDescription>
                Connect with like-minded people and discover diverse perspectives
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-brand-surface">
            <CardHeader>
              <MessageSquare className="w-10 h-10 text-brand-accent mb-2" />
              <CardTitle>Engage & React</CardTitle>
              <CardDescription>
                Like, comment, and interact with takes from the community
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-brand-surface">
            <CardHeader>
              <Trophy className="w-10 h-10 text-brand-primary mb-2" />
              <CardTitle>Leaderboards</CardTitle>
              <CardDescription>
                Compete for the top spot and showcase your best takes
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-brand-surface">
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
        </div>
      </div>
    </div>
  );
};

export default LandingPage;