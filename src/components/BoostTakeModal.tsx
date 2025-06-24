import { useAppContext } from '@/contexts/AppContext';
import { spendCredits } from '@/lib/credits';

const { user, userCredits, setUserCredits } = useAppContext();

const handleBoost = async () => {
  if (userCredits.boost > 0) {
    await spendCredits(user.id, 'boost', 1);
    setUserCredits({ ...userCredits, boost: userCredits.boost - 1 });
    // ... existing boost logic ...
  } else {
    alert('You do not have enough boost credits.');
  }
}; 