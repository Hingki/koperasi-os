'use client';

// UI Components
import { Switch } from '@/components/ui/switch';
import { updateDiscountStatusAction } from '@/lib/actions/retail';
import { useState } from 'react';

export default function DiscountStatusToggle({ id, isActive }: { id: string, isActive: boolean }) {
  const [active, setActive] = useState(isActive);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setActive(checked);
    setLoading(true);
    try {
      await updateDiscountStatusAction(id, checked);
    } catch (error) {
      console.error(error);
      setActive(!checked); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Switch 
      checked={active} 
      onCheckedChange={handleToggle} 
      disabled={loading}
    />
  );
}
