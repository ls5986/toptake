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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <Smartphone className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Rork AI Creator
            </h1>
            <div className="p-3 bg-purple-600 rounded-full">
              <Code className="h-8 w-8 text-white" />
            </div>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Generate creative iOS app prompts powered by AI for the Rork development platform. 
            Perfect for TopTake community challenges and rapid app prototyping.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-blue-100 rounded-full w-fit mx-auto mb-4">
                <Lightbulb className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered Ideas</h3>
              <p className="text-sm text-gray-600">
                Generate unique iOS app concepts using advanced AI algorithms
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-purple-100 rounded-full w-fit mx-auto mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold mb-2">Rapid Prototyping</h3>
              <p className="text-sm text-gray-600">
                From concept to working prototype in minutes with Rork
              </p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="p-6">
              <div className="p-3 bg-green-100 rounded-full w-fit mx-auto mb-4">
                <Code className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold mb-2">iOS Optimized</h3>
              <p className="text-sm text-gray-600">
                Prompts designed specifically for iOS development patterns
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Featured Prompts
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
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
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">Ready to Build?</h2>
              <p className="text-blue-100 mb-6">
                Take your generated prompts to Rork and start building your iOS app today!
              </p>
              <Button variant="secondary" size="lg">
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