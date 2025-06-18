import { useAppContext } from '@/contexts/AppContext';
import { spendCredits } from '@/lib/credits';

const { userCredits, setUserCredits } = useAppContext();

const handleDelete = async () => {
  if (userCredits.delete > 0) {
    await spendCredits('delete', 1);
    setUserCredits((prev) => ({ ...prev, delete: prev.delete - 1 }));
    // ... existing delete logic ...
  } else {
    alert('You do not have enough delete credits.');
  }
}; 