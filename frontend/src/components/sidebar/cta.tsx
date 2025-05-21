import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function CTACard() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-200 dark:from-blue-950/40 dark:to-blue-900/40 shadow-sm border border-blue-200/50 dark:border-blue-800/50 p-4 transition-all">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center">
          <Sparkles className="h-6 w-6 mr-2 text-blue-600 dark:text-blue-400" />
          <span className="text-lg font-medium text-foreground">
            Усильте свои возможности!
          </span>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">
            OpenAgent превратит ваши идеи в реальность за считанные минуты. Решайте задачи быстрее и эффективнее, чем когда-либо прежде.
          </p>
        </div>

        <div>
          {/* <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40">
            Начать создавать
          </Button> */}
        </div>
      </div>
    </div>
  );
}
