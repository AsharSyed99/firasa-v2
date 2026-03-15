'use client';

import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { GuruDto } from '@firasa/shared';
import { GuruCard } from '@/components/gurus/guru-card';

export default function GurusPage() {
  const { user, loading: authLoading } = useAuth();
  const [gurus, setGurus] = useState<GuruDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getGurus()
      .then((res) => setGurus(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleToggleActive = async (guru: GuruDto) => {
    await api.updateGuru(guru.id, { isActive: !guru.isActive });
    setGurus((prev) =>
      prev.map((g) => (g.id === guru.id ? { ...g, isActive: !g.isActive } : g))
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500" />
      </div>
    );
  }

  if (!user) return <div className="p-8 text-center">Please sign in</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">🎯 Gurus</h1>

      <div className="space-y-4">
        {gurus.map((guru) => (
          <GuruCard
            key={guru.id}
            guru={guru}
            isAdmin={user.tier === 'admin'}
            onToggleActive={handleToggleActive}
          />
        ))}
      </div>

      {gurus.length === 0 && (
        <p className="text-gray-500 text-center py-8">No gurus configured</p>
      )}
    </div>
  );
}
