import Image from 'next/image';
import { siteConfig } from '@/lib/home';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function CTASection() {
  const { ctaSection } = siteConfig;

  return (
    <section
      id="cta"
      className="flex flex-col items-center justify-center w-full pt-12 pb-20"
    >
      <div className="w-full max-w-6xl mx-auto px-6">
        <div className="h-[400px] md:h-[400px] overflow-hidden shadow-xl w-full border border-border rounded-xl bg-gradient-to-br from-secondary/90 to-secondary relative z-20">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-6 text-white/90 text-sm">
              <span className="size-2 bg-white rounded-full animate-pulse"></span>
              <span>Продуктивность Ждет Вас</span>
            </div>
            <h1 className="text-white text-4xl md:text-6xl font-medium tracking-tighter max-w-xs md:max-w-xl text-center mb-8">
              Усильте Свой Рабочий День с ИИ
            </h1>
            <div className="flex flex-col items-center justify-center gap-5">
              <Link
                href={ctaSection.button.href}
                className="group bg-white text-secondary font-medium text-base h-12 w-fit px-6 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:bg-white/90"
              >
                <span>Начать Сейчас</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <span className="text-white/80 text-sm md:text-base">Оцените возможности OpenAgent для автоматизации задач</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
