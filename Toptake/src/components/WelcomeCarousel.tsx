import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';

interface WelcomeCarouselProps {
  onComplete?: () => void;
}

interface SlideProps {
  slide: number;
  onNext: () => void;
}

const Slide: React.FC<SlideProps> = ({ slide, onNext }) => {
  const slides = {
    1: {
      emoji: '🔥',
      title: 'One Topic. One Take. All Perspectives.',
      subtitle: 'Every day brings a new topic that sparks global conversation'
    },
    2: {
      emoji: '👀',
      title: "Share first, then see what others think.",
      subtitle: 'Post your take first, then unlock everyone else\'s responses'
    },
    3: {
      emoji: '👻',
      title: 'Post anonymously (3 free shots). Keep your streak or lose it forever.',
      subtitle: 'Choose your moments wisely and maintain your daily streak'
    }
  };

  const current = slides[slide as keyof typeof slides];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="text-8xl mb-8">{current.emoji}</div>
      <h1 className="text-3xl font-bold mb-4 text-white max-w-md">{current.title}</h1>
      <p className="text-lg text-gray-300 mb-12 max-w-md">{current.subtitle}</p>
      <Button 
        onClick={onNext}
        size="lg"
        className="bg-gradient-to-r from-slate-600 to-zinc-600 hover:from-slate-700 hover:to-zinc-700 text-white px-8 py-3 text-lg"
      >
        {slide === 3 ? "Let's Go!" : 'Next'}
      </Button>
    </div>
  );
};

const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ onComplete }) => {
  const { setShouldShowCarousel, setCurrentScreen } = useAppContext();
  const [currentSlide, setCurrentSlide] = useState(1);

  const handleNext = () => {
    if (currentSlide < 3) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Carousel complete
      setShouldShowCarousel(false);
      if (onComplete) {
        onComplete();
      } else {
        setCurrentScreen('main');
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-slate-800 to-zinc-900 min-h-screen relative">
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <h2 className="text-2xl font-bold text-white">Welcome to TopTake</h2>
      </div>
      <Slide slide={currentSlide} onNext={handleNext} />
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {[1, 2, 3].map((slide) => (
          <div
            key={slide}
            className={`w-3 h-3 rounded-full ${
              slide === currentSlide ? 'bg-white' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default WelcomeCarousel;