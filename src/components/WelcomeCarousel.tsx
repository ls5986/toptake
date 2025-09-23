import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { Flame, Eye, Ghost } from 'lucide-react';

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
      icon: <Flame className="w-12 h-12 text-brand-accent mx-auto mb-6" />,
      title: 'One Topic. One Take. All Perspectives.',
      subtitle: 'Every day brings a new topic that sparks global conversation'
    },
    2: {
      icon: <Eye className="w-12 h-12 text-brand-primary mx-auto mb-6" />,
      title: "Share first, then see what others think.",
      subtitle: 'Post your take first, then unlock everyone else\'s responses'
    },
    3: {
      icon: <Ghost className="w-12 h-12 text-brand-muted mx-auto mb-6" />,
      title: 'Post anonymously (3 free shots). Keep your streak or lose it forever.',
      subtitle: 'Choose your moments wisely and maintain your daily streak'
    }
  };

  const current = slides[slide as keyof typeof slides];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      {current.icon}
      <h1 className="text-3xl font-bold mb-4 text-brand-text max-w-md">{current.title}</h1>
      <p className="text-lg text-brand-muted mb-12 max-w-md">{current.subtitle}</p>
      <Button 
        onClick={() => {
          try { console.log('[WelcomeCarousel] next clicked', { slide }); } catch {}
          onNext();
        }}
        size="lg"
        className="btn-primary px-8 py-3 text-lg pointer-events-auto relative z-50"
      >
        {slide === 3 ? "Let's Go!" : 'Next'}
      </Button>
    </div>
  );
};

const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({ onComplete }) => {
  const { setShouldShowCarousel, setCurrentScreen } = useAppContext();
  const [currentSlide, setCurrentSlide] = useState(1);

  // Safety: allow Enter key to advance, and auto-complete if stuck
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (currentSlide === 3) {
      // If user taps anywhere on screen on the final slide, advance
      const onClickAnywhere = () => handleNext();
      // Use capture to run before other handlers
      document.addEventListener('click', onClickAnywhere, true);
      const timeout = setTimeout(() => {
        try { console.log('[WelcomeCarousel] auto-advance safety on final slide'); } catch {}
      }, 0);
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('click', onClickAnywhere, true);
      };
    }
  }, [currentSlide]);

  const handleNext = () => {
    if (currentSlide < 3) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Carousel complete → delegate next step to parent
      try { setShouldShowCarousel(false); } catch {}
      if (onComplete) { onComplete(); }
    }
  };

  return (
    <div className="bg-gradient-to-br from-brand-background via-brand-surface to-brand-background min-h-screen relative pointer-events-auto z-50">
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <h2 className="text-2xl font-bold text-brand-text">Welcome to TopTake</h2>
      </div>
      {/* Skip control to bypass if any overlay blocks clicks */}
      <button
        className="absolute top-6 right-6 text-sm text-brand-accent hover:underline z-[60]"
        onClick={() => {
          try { setShouldShowCarousel(false); } catch {}
          if (onComplete) { onComplete(); }
        }}
        aria-label="Skip onboarding"
      >
        Skip
      </button>
      <Slide slide={currentSlide} onNext={handleNext} />
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {[1, 2, 3].map((slide) => (
          <div
            key={slide}
            className={`w-3 h-3 rounded-full transition-colors duration-200 ${
              slide === currentSlide ? 'bg-brand-primary' : 'bg-brand-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default WelcomeCarousel;