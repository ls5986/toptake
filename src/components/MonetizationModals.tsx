import React, { useEffect, useState } from 'react';
import { StripePayment } from './StripePayment';

export const PRICES = {
  ANONYMOUS_CREDITS: 2.99,
  STREAK_RESTORE: 1.99,
  PREMIUM_MONTHLY: 9.99,
  BOOST_24H: 4.99,
  LATE_SUBMISSION: 2.99,
};

interface MonetizationModalsProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const MonetizationModals: React.FC<MonetizationModalsProps> = ({
  onClose,
  onSuccess,
}) => {
  const [error, setError] = React.useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);

  const handleError = (error: string) => {
    setError(error);
    setTimeout(() => setError(null), 5000);
  };

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handlePaymentSelect = (paymentType: string) => {
    setSelectedPayment(paymentType);
  };

  const handleBack = () => {
    setSelectedPayment(null);
  };

  const getPaymentConfig = (type: string) => {
    switch (type) {
      case 'anonymous':
        return {
          amount: PRICES.ANONYMOUS_CREDITS,
          description: "5 Anonymous Credits"
        };
      case 'streak':
        return {
          amount: PRICES.STREAK_RESTORE,
          description: "Streak Restore"
        };
      case 'premium':
        return {
          amount: PRICES.PREMIUM_MONTHLY,
          description: "Premium Monthly Subscription"
        };
      case 'boost':
        return {
          amount: PRICES.BOOST_24H,
          description: "24-Hour Boost"
        };
      default:
        return null;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {selectedPayment ? 'Complete Purchase' : 'Purchase Options'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!selectedPayment ? (
          <div className="space-y-4">
            <div 
              className="border rounded p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => handlePaymentSelect('anonymous')}
            >
              <h3 className="font-bold">Anonymous Credits</h3>
              <p className="text-gray-600">Submit 5 anonymous takes</p>
              <p className="text-green-600 font-bold">${PRICES.ANONYMOUS_CREDITS}</p>
            </div>

            <div 
              className="border rounded p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => handlePaymentSelect('streak')}
            >
              <h3 className="font-bold">Restore Streak</h3>
              <p className="text-gray-600">Get your streak back</p>
              <p className="text-green-600 font-bold">${PRICES.STREAK_RESTORE}</p>
            </div>

            <div 
              className="border rounded p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => handlePaymentSelect('premium')}
            >
              <h3 className="font-bold">Premium Monthly</h3>
              <p className="text-gray-600">Unlimited anonymous takes</p>
              <p className="text-green-600 font-bold">${PRICES.PREMIUM_MONTHLY}</p>
            </div>

            <div 
              className="border rounded p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => handlePaymentSelect('boost')}
            >
              <h3 className="font-bold">24-Hour Boost</h3>
              <p className="text-gray-600">Unlimited takes for 24 hours</p>
              <p className="text-green-600 font-bold">${PRICES.BOOST_24H}</p>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={handleBack}
              className="mb-4 text-blue-600 hover:text-blue-800"
            >
              ← Back to options
            </button>
            {getPaymentConfig(selectedPayment) && (
              <StripePayment
                amount={getPaymentConfig(selectedPayment)!.amount}
                description={getPaymentConfig(selectedPayment)!.description}
                onSuccess={onSuccess}
                onError={handleError}
              />
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  );
};