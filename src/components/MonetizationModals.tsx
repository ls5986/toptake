import React from 'react';
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

  const handleError = (error: string) => {
    setError(error);
    setTimeout(() => setError(null), 5000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Purchase Options</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="border rounded p-4">
            <h3 className="font-bold">Anonymous Credits</h3>
            <p className="text-gray-600">Submit 5 anonymous takes</p>
            <StripePayment
              amount={PRICES.ANONYMOUS_CREDITS}
              description="5 Anonymous Credits"
              onSuccess={onSuccess}
              onError={handleError}
            />
          </div>

          <div className="border rounded p-4">
            <h3 className="font-bold">Restore Streak</h3>
            <p className="text-gray-600">Get your streak back</p>
            <StripePayment
              amount={PRICES.STREAK_RESTORE}
              description="Streak Restore"
              onSuccess={onSuccess}
              onError={handleError}
            />
          </div>

          <div className="border rounded p-4">
            <h3 className="font-bold">Premium Monthly</h3>
            <p className="text-gray-600">Unlimited anonymous takes</p>
            <StripePayment
              amount={PRICES.PREMIUM_MONTHLY}
              description="Premium Monthly Subscription"
              onSuccess={onSuccess}
              onError={handleError}
            />
          </div>

          <div className="border rounded p-4">
            <h3 className="font-bold">24-Hour Boost</h3>
            <p className="text-gray-600">Unlimited takes for 24 hours</p>
            <StripePayment
              amount={PRICES.BOOST_24H}
              description="24-Hour Boost"
              onSuccess={onSuccess}
              onError={handleError}
            />
          </div>
        </div>

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