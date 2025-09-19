import React from 'react';

interface Props {
  children: React.ReactNode;
  className?: string;
}

// Standardized scrollable area that works with BottomNav shell
// Layout: flex-1 min-h-0 + inner div for padding
const ScrollContainer: React.FC<Props> = ({ children, className = '' }) => {
  return (
    <div className={`flex-1 min-h-0 overflow-hidden ${className}`}>
      <div className="h-full overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default ScrollContainer;


