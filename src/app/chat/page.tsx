'use client';

import SalesBot from '@/components/SalesBot';
import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    router.push('/');
  };

  return (
    <Suspense fallback={null}>
      <SalesBot open={open} onClose={handleClose} />
    </Suspense>
  );
}
