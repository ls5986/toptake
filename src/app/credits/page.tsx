import { CreditHistory } from '@/components/CreditHistory';
import { useCredits } from '@/lib/credits';

export default function CreditsPage() {
  return (
    <div className="container mx-auto px-0 py-0">
      <h1 className="text-2xl font-bold mb-6">Credit History</h1>
      <CreditHistory />
    </div>
  );
} 