'use client';

import { useEffect, useState } from 'react';
import { CTASection } from '@/components/home/sections/cta-section';
// import { FAQSection } from "@/components/sections/faq-section";
import { FooterSection } from '@/components/home/sections/footer-section';
import { HeroSection } from '@/components/home/sections/hero-section';
import { PricingSection } from '@/components/home/sections/pricing-section';
import { UseCasesSection } from '@/components/home/sections/use-cases-section';
import { FAQSection } from '@/components/home/sections/faq-section';
import { GrowthSection } from '@/components/home/sections/growth-section';
import { QuoteSection } from '@/components/home/sections/quote-section';
import { BentoSection } from '@/components/home/sections/bento-section';
import { FeatureSection } from '@/components/home/sections/feature-section';
import { TestimonialSection } from '@/components/home/sections/testimonial-section';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen w-full">
      <div className="w-full divide-y divide-border">
        <HeroSection />
        {/* <UseCasesSection /> */}
        {/* <CompanyShowcase /> */}
        <BentoSection />
        {/* <QuoteSection /> */}
        <FeatureSection />
        {/* <GrowthSection /> */}
        {/* <OpenSourceSection /> */}
        <PricingSection />
        {/* <TestimonialSection />/ */}
        {/* <FAQSection /> */}
        <CTASection />
        {/* <FooterSection /> */}
      </div>
    </main>
  );
}
