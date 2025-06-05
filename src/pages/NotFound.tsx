import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 rounded-lg border border-border bg-brand-surface shadow-md animate-slide-in">
        <h1 className="text-5xl font-bold mb-6 text-brand-primary font-sans">404</h1>
        <p className="text-xl text-brand-muted mb-6 font-sans">Page not found</p>
        <a href="/" className="text-brand-primary hover:text-brand-accent underline transition-colors font-sans">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
