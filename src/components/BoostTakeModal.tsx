import { useAppContext } from '@/contexts/AppContext';
import { spendCredits } from '@/lib/credits';

const { userCredits, setUserCredits } = useAppContext();

const handleBoost = async () => {
  if (userCredits.boost > 0) {
    await spendCredits('boost', 1);
    setUserCredits((prev) => ({ ...prev, boost: prev.boost - 1 }));
    // ... existing boost logic ...
  } else {
    alert('You do not have enough boost credits.');
  }
}; 