import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Smartphone, Code, Lightbulb, Zap } from 'lucide-react';
import RorkIntegration from './RorkIntegration';
import RorkPromptGenerator from './RorkPromptGenerator';

const RorkScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('prompts');

  return (
    <div className="min-h-screen bg-brand-gradient">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-brand-primary rounded-full">
              <Smartphone className="h-8 w-8 text-brand-text" />
            </div>
            <h1 className="text-4xl font-bold text-brand-primary">
              Rork AI Creator
            </h1>
            <div className="p-3 bg-brand-accent rounded-full">
              <Code className="h-8 w-8 text-brand-text" />
            </div>
          </div>
          <p className="text-xl text-brand-muted max-w-3xl mx-auto">
            Generate creative iOS app prompts powered by AI for the Rork development platform. 
            Perfect for TopTake community challenges and rapid app prototyping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center bg-card-gradient">
            <CardContent className="p-6">
              <div className="p-3 bg-brand-surface rounded-full w-fit mx-auto mb-4">
                <Lightbulb className="h-6 w-6 text-brand-primary" />
              </div>
              <h3 className="font-semibold mb-2 text-brand-text">AI-Powered Ideas</h3>
              <p className="text-sm text-brand-muted">
                Generate unique iOS app concepts using advanced AI algorithms
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-card-gradient">
            <CardContent className="p-6">
              <div className="p-3 bg-brand-surface rounded-full w-fit mx-auto mb-4">
                <Zap className="h-6 w-6 text-brand-accent" />
              </div>
              <h3 className="font-semibold mb-2 text-brand-text">Rapid Prototyping</h3>
              <p className="text-sm text-brand-muted">
                From concept to working prototype in minutes with Rork
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center bg-card-gradient">
            <CardContent className="p-6">
              <div className="p-3 bg-brand-surface rounded-full w-fit mx-auto mb-4">
                <Code className="h-6 w-6 text-brand-muted" />
              </div>
              <h3 className="font-semibold mb-2 text-brand-text">iOS Optimized</h3>
              <p className="text-sm text-brand-muted">
                Prompts designed specifically for iOS development patterns
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-brand-primary" />
              Featured Prompts
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-brand-accent" />
              AI Generator
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="prompts">
            <RorkIntegration />
          </TabsContent>
          
          <TabsContent value="generator">
            <RorkPromptGenerator />
          </TabsContent>
        </Tabs>

        <div className="mt-12 text-center">
          <Card className="bg-card-gradient text-brand-text">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Ready to Build?</h2>
              <p className="text-brand-muted mb-6">
                Take your generated prompts to Rork and start building your iOS app today!
              </p>
              <Button className="btn-secondary" size="lg">
                Launch Rork App
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RorkScreen;