import { Suspense } from 'react';
import { SupportClient } from './SupportClient';
import { Loader2 } from 'lucide-react';

export const metadata = {
  title: 'Support & Tickets | Tenvi',
  description: 'Report bugs, ask accounting questions, and track support tickets with our engineering team.',
};

export default function SupportPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs">Loading support center...</p>
        </div>
      }
    >
      <SupportClient />
    </Suspense>
  );
}
