'use client';

import { SectionHeader } from '@/components/home/section-header';
import type { PricingTier } from '@/lib/home';
import { siteConfig } from '@/lib/home';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  getSubscription,
  createCheckoutSession,
  SubscriptionStatus,
  CreateCheckoutSessionResponse,
} from '@/lib/api';
import { toast } from 'sonner';
import { isLocalMode } from '@/lib/config';
import { AlertTriangle } from 'lucide-react';

// Constants
const DEFAULT_SELECTED_PLAN = '6 hours';
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  PRO: 'base',
  ENTERPRISE: 'extra',
};

// Types
type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'ghost'
  | 'outline'
  | 'link'
  | null;

interface PricingTabsProps {
  activeTab: 'cloud' | 'self-hosted';
  setActiveTab: (tab: 'cloud' | 'self-hosted') => void;
  className?: string;
}

interface PriceDisplayProps {
  price: string;
  isCompact?: boolean;
}

interface CustomPriceDisplayProps {
  price: string;
}

interface UpgradePlan {
  hours: string;
  price: string;
  stripePriceId: string;
}

interface PricingTierProps {
  tier: PricingTier;
  isCompact?: boolean;
  currentSubscription: SubscriptionStatus | null;
  isLoading: Record<string, boolean>;
  isFetchingPlan: boolean;
  selectedPlan?: string;
  onPlanSelect?: (planId: string) => void;
  onSubscriptionUpdate?: () => void;
  isAuthenticated?: boolean;
  returnUrl: string;
}

// Components
function PricingTabs({ activeTab, setActiveTab, className }: PricingTabsProps) {
  return (
    <div
      className={cn(
        'relative flex w-fit items-center rounded-full border p-0.5 backdrop-blur-sm cursor-pointer h-9 flex-row bg-muted',
        className,
      )}
    >
      {['cloud', 'self-hosted'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab as 'cloud' | 'self-hosted')}
          className={cn(
            'relative z-[1] px-3 h-8 flex items-center justify-center cursor-pointer',
            {
              'z-0': activeTab === tab,
            },
          )}
        >
          {activeTab === tab && (
            <motion.div
              layoutId="active-tab"
              className="absolute inset-0 rounded-full bg-white dark:bg-[#3F3F46] shadow-md border border-border"
              transition={{
                duration: 0.2,
                type: 'spring',
                stiffness: 300,
                damping: 25,
                velocity: 2,
              }}
            />
          )}
          <span
            className={cn(
              'relative block text-sm font-medium duration-200 shrink-0',
              activeTab === tab ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {tab === 'cloud' ? 'Cloud' : 'Self-hosted'}
          </span>
        </button>
      ))}
    </div>
  );
}

function PriceDisplay({ price, isCompact }: PriceDisplayProps) {
  return (
    <motion.span
      key={price}
      className={isCompact ? 'text-xl font-semibold' : 'text-4xl font-semibold'}
      initial={{
        opacity: 0,
        x: 10,
        filter: 'blur(5px)',
      }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {price}
    </motion.span>
  );
}

function CustomPriceDisplay({ price }: CustomPriceDisplayProps) {
  return (
    <motion.span
      key={price}
      className="text-4xl font-semibold"
      initial={{
        opacity: 0,
        x: 10,
        filter: 'blur(5px)',
      }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {price}
    </motion.span>
  );
}

function PricingTier({
  tier,
  isCompact = false,
  currentSubscription,
  isLoading,
  isFetchingPlan,
  selectedPlan,
  onPlanSelect,
  onSubscriptionUpdate,
  isAuthenticated = false,
  returnUrl,
}: PricingTierProps) {
  const [localSelectedPlan, setLocalSelectedPlan] = useState(
    selectedPlan || DEFAULT_SELECTED_PLAN,
  );
  const hasInitialized = useRef(false);

  // Auto-select the correct plan only on initial load
  useEffect(() => {
    if (
      !hasInitialized.current &&
      tier.name === 'Custom' &&
      tier.upgradePlans &&
      currentSubscription?.price_id
    ) {
      const matchingPlan = tier.upgradePlans.find(
        (plan) => plan.stripePriceId === currentSubscription.price_id,
      );
      if (matchingPlan) {
        setLocalSelectedPlan(matchingPlan.hours);
      }
      hasInitialized.current = true;
    }
  }, [currentSubscription, tier.name, tier.upgradePlans]);

  // Only refetch when plan is selected
  const handlePlanSelect = (value: string) => {
    setLocalSelectedPlan(value);
    if (tier.name === 'Custom' && onSubscriptionUpdate) {
      onSubscriptionUpdate();
    }
  };

  const handleSubscribe = async (planStripePriceId: string) => {
    if (!isAuthenticated) {
      window.location.href = '/auth';
      return;
    }

    if (isLoading[planStripePriceId]) {
      return;
    }

    try {
      // For custom tier, get the selected plan's stripePriceId
      let finalPriceId = planStripePriceId;
      if (tier.name === 'Custom' && tier.upgradePlans) {
        const selectedPlan = tier.upgradePlans.find(
          (plan) => plan.hours === localSelectedPlan,
        );
        if (selectedPlan?.stripePriceId) {
          finalPriceId = selectedPlan.stripePriceId;
        }
      }

      onPlanSelect?.(finalPriceId);

      const response: CreateCheckoutSessionResponse =
        await createCheckoutSession({
          price_id: finalPriceId,
          success_url: returnUrl,
          cancel_url: returnUrl,
        });

      console.log('Subscription action response:', response);

      switch (response.status) {
        case 'new':
        case 'checkout_created':
          if (response.url) {
            window.location.href = response.url;
          } else {
            console.error(
              "Error: Received status 'checkout_created' but no checkout URL.",
            );
            toast.error('Failed to initiate subscription. Please try again.');
          }
          break;
        case 'upgraded':
        case 'updated':
          const upgradeMessage = response.details?.is_upgrade
            ? `Subscription upgraded from $${response.details.current_price} to $${response.details.new_price}`
            : 'Subscription updated successfully';
          toast.success(upgradeMessage);
          if (onSubscriptionUpdate) onSubscriptionUpdate();
          break;
        case 'downgrade_scheduled':
        case 'scheduled':
          const effectiveDate = response.effective_date
            ? new Date(response.effective_date).toLocaleDateString()
            : 'the end of your billing period';

          const statusChangeMessage = 'Subscription change scheduled';

          toast.success(
            <div>
              <p>{statusChangeMessage}</p>
              <p className="text-sm mt-1">
                Your plan will change on {effectiveDate}.
              </p>
            </div>,
          );
          if (onSubscriptionUpdate) onSubscriptionUpdate();
          break;
        case 'no_change':
          toast.info(response.message || 'You are already on this plan.');
          break;
        default:
          console.warn(
            'Received unexpected status from createCheckoutSession:',
            response.status,
          );
          toast.error('An unexpected error occurred. Please try again.');
      }
    } catch (error: any) {
      console.error('Error processing subscription:', error);
      const errorMessage =
        error?.response?.data?.detail ||
        error?.message ||
        'Failed to process subscription. Please try again.';
      toast.error(errorMessage);
    }
  };

  const getPriceValue = (
    tier: (typeof siteConfig.cloudPricingItems)[0],
    selectedHours?: string,
  ): string => {
    if (tier.upgradePlans && selectedHours) {
      const plan = tier.upgradePlans.find(
        (plan) => plan.hours === selectedHours,
      );
      if (plan) {
        return plan.price;
      }
    }
    return tier.price;
  };

  const getDisplayedHours = (
    tier: (typeof siteConfig.cloudPricingItems)[0],
  ) => {
    if (tier.name === 'Custom' && localSelectedPlan) {
      return localSelectedPlan;
    }
    return tier.hours;
  };

  const getSelectedPlanPriceId = (
    tier: (typeof siteConfig.cloudPricingItems)[0],
  ): string => {
    if (tier.name === 'Custom' && tier.upgradePlans) {
      const selectedPlan = tier.upgradePlans.find(
        (plan) => plan.hours === localSelectedPlan,
      );
      return selectedPlan?.stripePriceId || tier.stripePriceId;
    }
    return tier.stripePriceId;
  };

  const getSelectedPlanPrice = (
    tier: (typeof siteConfig.cloudPricingItems)[0],
  ): string => {
    if (tier.name === 'Custom' && tier.upgradePlans) {
      const selectedPlan = tier.upgradePlans.find(
        (plan) => plan.hours === localSelectedPlan,
      );
      return selectedPlan?.price || tier.price;
    }
    return tier.price;
  };

  const tierPriceId = getSelectedPlanPriceId(tier);
  const isCurrentActivePlan =
    isAuthenticated &&
    // For custom tier, check if the selected plan matches the current subscription
    (tier.name === 'Custom'
      ? tier.upgradePlans?.some(
          (plan) =>
            plan.hours === localSelectedPlan &&
            plan.stripePriceId === currentSubscription?.price_id,
        )
      : currentSubscription?.price_id === tierPriceId);
  const isScheduled = isAuthenticated && currentSubscription?.has_schedule;
  const isScheduledTargetPlan =
    isScheduled &&
    // For custom tier, check if the selected plan matches the scheduled subscription
    (tier.name === 'Custom'
      ? tier.upgradePlans?.some(
          (plan) =>
            plan.hours === localSelectedPlan &&
            plan.stripePriceId === currentSubscription?.scheduled_price_id,
        )
      : currentSubscription?.scheduled_price_id === tierPriceId);
  const isPlanLoading = isLoading[tierPriceId];

  let buttonText = isAuthenticated ? 'Select Plan' : 'Try Free';
  let buttonDisabled = isPlanLoading;
  let buttonVariant: ButtonVariant = null;
  let ringClass = '';
  let statusBadge = null;
  let buttonClassName = '';

  if (isAuthenticated) {
    if (isCurrentActivePlan) {
      buttonText = 'Current Plan';
      buttonDisabled = true;
      buttonVariant = 'secondary';
      ringClass = isCompact ? 'ring-1 ring-primary' : 'ring-2 ring-primary';
      buttonClassName = 'bg-primary/5 hover:bg-primary/10 text-primary';
      statusBadge = (
        <span className="bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded-full">
          Current
        </span>
      );
    } else if (isScheduledTargetPlan) {
      buttonText = 'Scheduled';
      buttonDisabled = true;
      buttonVariant = 'outline';
      ringClass = isCompact
        ? 'ring-1 ring-yellow-500'
        : 'ring-2 ring-yellow-500';
      buttonClassName =
        'bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      statusBadge = (
        <span className="bg-yellow-500/10 text-yellow-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
          Scheduled
        </span>
      );
    } else if (isScheduled && currentSubscription?.price_id === tierPriceId) {
      buttonText = 'Change Scheduled';
      buttonVariant = 'secondary';
      ringClass = isCompact ? 'ring-1 ring-primary' : 'ring-2 ring-primary';
      buttonClassName = 'bg-primary/5 hover:bg-primary/10 text-primary';
      statusBadge = (
        <span className="bg-yellow-500/10 text-yellow-600 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
          Downgrade Pending
        </span>
      );
    } else {
      // For custom tier, find the current plan in upgradePlans
      const currentTier =
        tier.name === 'Custom' && tier.upgradePlans
          ? tier.upgradePlans.find(
              (p) => p.stripePriceId === currentSubscription?.price_id,
            )
          : siteConfig.cloudPricingItems.find(
              (p) => p.stripePriceId === currentSubscription?.price_id,
            );

      // Find the highest active plan from upgradePlans
      const highestActivePlan = siteConfig.cloudPricingItems.reduce(
        (highest, item) => {
          if (item.upgradePlans) {
            const activePlan = item.upgradePlans.find(
              (p) => p.stripePriceId === currentSubscription?.price_id,
            );
            if (activePlan) {
              const activeAmount =
                parseFloat(activePlan.price.replace(/[^\d.]/g, '') || '0') *
                100;
              const highestAmount =
                parseFloat(highest?.price?.replace(/[^\d.]/g, '') || '0') * 100;
              return activeAmount > highestAmount ? activePlan : highest;
            }
          }
          return highest;
        },
        null as { price: string; hours: string; stripePriceId: string } | null,
      );

      const currentPriceString = currentSubscription
        ? highestActivePlan?.price || currentTier?.price || '$0'
        : '$0';
      const selectedPriceString = getSelectedPlanPrice(tier);
      const currentAmount =
        currentPriceString === '$0'
          ? 0
          : parseFloat(currentPriceString.replace(/[^\d.]/g, '') || '0') * 100;
      const targetAmount =
        selectedPriceString === '$0'
          ? 0
          : parseFloat(selectedPriceString.replace(/[^\d.]/g, '') || '0') * 100;

      if (
        currentAmount === 0 &&
        targetAmount === 0 &&
        currentSubscription?.status !== 'no_subscription'
      ) {
        buttonText = 'Select Plan';
        buttonDisabled = true;
        buttonVariant = 'secondary';
        buttonClassName = 'bg-primary/5 hover:bg-primary/10 text-primary';
      } else {
        if (targetAmount > currentAmount) {
          buttonText = 'Upgrade';
          buttonVariant = tier.buttonColor as ButtonVariant;
          buttonClassName =
            'bg-primary hover:bg-primary/90 text-primary-foreground';
        } else if (targetAmount < currentAmount) {
          buttonText = '-';
          buttonDisabled = true;
          buttonVariant = 'secondary';
          buttonClassName =
            'opacity-50 cursor-not-allowed bg-muted text-muted-foreground';
        } else {
          buttonText = 'Select Plan';
          buttonVariant = tier.buttonColor as ButtonVariant;
          buttonClassName =
            'bg-primary hover:bg-primary/90 text-primary-foreground';
        }
      }
    }

    if (isPlanLoading) {
      buttonText = 'Loading...';
      buttonClassName = 'opacity-70 cursor-not-allowed';
    }
  } else {
    // Non-authenticated state styling
    buttonVariant = tier.buttonColor as ButtonVariant;
    buttonClassName =
      tier.buttonColor === 'default'
        ? 'bg-primary hover:bg-primary/90 text-white'
        : 'bg-secondary hover:bg-secondary/90 text-white';
  }

  return (
    <div
      className={cn(
        'rounded-xl flex flex-col relative h-fit min-h-[400px] min-[650px]:h-full min-[900px]:h-fit',
        tier.isPopular
          ? 'md:shadow-[0px_61px_24px_-10px_rgba(0,0,0,0.01),0px_34px_20px_-8px_rgba(0,0,0,0.05),0px_15px_15px_-6px_rgba(0,0,0,0.09),0px_4px_8px_-2px_rgba(0,0,0,0.10),0px_0px_0px_1px_rgba(0,0,0,0.08)] bg-accent'
          : 'bg-[#F3F4F6] dark:bg-[#F9FAFB]/[0.02] border border-border',
        ringClass,
      )}
    >
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm flex items-center gap-2">
          {tier.name}
          {tier.isPopular && (
            <span className="bg-gradient-to-b from-secondary/50 from-[1.92%] to-secondary to-[100%] text-white h-6 inline-flex w-fit items-center justify-center px-2 rounded-full text-sm shadow-[0px_6px_6px_-3px_rgba(0,0,0,0.08),0px_3px_3px_-1.5px_rgba(0,0,0,0.08),0px_1px_1px_-0.5px_rgba(0,0,0,0.08),0px_0px_0px_1px_rgba(255,255,255,0.12)_inset,0px_1px_0px_0px_rgba(255,255,255,0.12)_inset]">
              Popular
            </span>
          )}
          {isAuthenticated && statusBadge}
        </p>
        <div className="flex items-baseline mt-2">
          {tier.name === 'Custom' ? (
            <CustomPriceDisplay
              price={getPriceValue(tier, localSelectedPlan)}
            />
          ) : (
            <PriceDisplay price={tier.price} />
          )}
          <span className="ml-2">{tier.price !== '$0' ? '/month' : ''}</span>
        </div>
        <p className="text-sm mt-2">{tier.description}</p>

        {tier.name === 'Custom' && tier.upgradePlans ? (
          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Customize your monthly usage
            </p>
            <Select value={localSelectedPlan} onValueChange={handlePlanSelect}>
              <SelectTrigger className="w-full bg-white dark:bg-background">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {tier.upgradePlans.map((plan) => (
                  <SelectItem
                    key={plan.hours}
                    value={plan.hours}
                    className={
                      localSelectedPlan === plan.hours
                        ? 'font-medium bg-primary/5'
                        : ''
                    }
                  >
                    {plan.hours} - {plan.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 border-primary/20 text-primary w-fit">
              {localSelectedPlan}/month
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 border-primary/20 text-primary w-fit">
            {getDisplayedHours(tier)}/month
          </div>
        )}
      </div>

      <div className="p-4 flex-grow">
        {tier.features && tier.features.length > 0 && (
          <ul className="space-y-3">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2">
                <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                  <CheckIcon className="size-3 text-primary" />
                </div>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto p-4">
        <Button
          onClick={() => handleSubscribe(tierPriceId)}
          disabled={buttonDisabled}
          variant={buttonVariant || 'default'}
          className={cn(
            'w-full font-medium transition-all duration-200',
            isCompact ? 'h-7 rounded-md text-xs' : 'h-10 rounded-full text-sm',
            buttonClassName,
            isPlanLoading && 'animate-pulse',
          )}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

interface PricingSectionProps {
  returnUrl?: string;
  showTitleAndTabs?: boolean;
}

export function PricingSection({
  returnUrl = typeof window !== 'undefined' ? window.location.href : '/',
  showTitleAndTabs = true,
}: PricingSectionProps) {
  const [deploymentType, setDeploymentType] = useState<'cloud' | 'self-hosted'>(
    'cloud',
  );
  const [currentSubscription, setCurrentSubscription] =
    useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [isFetchingPlan, setIsFetchingPlan] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchCurrentPlan = async () => {
    setIsFetchingPlan(true);
    try {
      const subscriptionData = await getSubscription();
      console.log('Fetched Subscription Status:', subscriptionData);
      setCurrentSubscription(subscriptionData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      setCurrentSubscription(null);
      setIsAuthenticated(false);
    } finally {
      setIsFetchingPlan(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setIsLoading((prev) => ({ ...prev, [planId]: true }));
  };

  const handleSubscriptionUpdate = () => {
    fetchCurrentPlan();
    setTimeout(() => {
      setIsLoading({});
    }, 1000);
  };

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  const handleTabChange = (tab: 'cloud' | 'self-hosted') => {
    if (tab === 'self-hosted') {
      const openSourceSection = document.getElementById('open-source');
      if (openSourceSection) {
        const rect = openSourceSection.getBoundingClientRect();
        const scrollTop =
          window.pageYOffset || document.documentElement.scrollTop;
        const offsetPosition = scrollTop + rect.top - 100;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth',
        });
      }
    } else {
      setDeploymentType(tab);
    }
  };

  // Показываем секцию в любом режиме
  const isHidden = false;
  
  if (isHidden) {
    return (
      <div className="flex justify-center py-8">
        <div className="border border-primary/20 bg-primary/5 dark:bg-primary/10 rounded-lg p-3 text-sm text-primary dark:text-primary max-w-md flex items-center shadow-sm">
          <AlertTriangle className="mr-2 h-4 w-4" />
          <span>
            ✨ Повысьте свою продуктивность с OpenAgent - ИИ-ассистентом, который работает для вас! ✨
          </span>
        </div>
      </div>
    );
  }

  return (
    <section
      id="pricing"
      className="flex flex-col items-center justify-center gap-10 pb-20 w-full relative"
    >
      {showTitleAndTabs && (
        <>
          <SectionHeader>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tighter text-center text-balance">
              Технологические Преимущества
            </h2>
            <p className="text-muted-foreground text-center text-balance font-medium">
              OpenAgent - это передовые технологии искусственного интеллекта для корпоративного использования
            </p>
          </SectionHeader>
        </>
      )}

      <div className="grid min-[650px]:grid-cols-2 min-[900px]:grid-cols-3 gap-6 w-full max-w-6xl mx-auto px-6">
        <div className="rounded-xl overflow-hidden relative flex flex-col md:shadow-[0px_61px_24px_-10px_rgba(0,0,0,0.01),0px_34px_20px_-8px_rgba(0,0,0,0.05),0px_15px_15px_-6px_rgba(0,0,0,0.09),0px_4px_8px_-2px_rgba(0,0,0,0.10),0px_0px_0px_1px_rgba(0,0,0,0.08)] bg-accent p-6">
          <div className="rounded-full p-2 bg-secondary/10 w-fit mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary">
              <path d="M10.5 1.5H8.25C7.09987 1.5 6.52481 1.5 6.08156 1.72246C5.69817 1.91045 5.41045 2.19817 5.22246 2.58156C5 3.02481 5 3.59987 5 4.75V19.25C5 20.4001 5 20.9752 5.22246 21.4184C5.41045 21.8018 5.69817 22.0896 6.08156 22.2775C6.52481 22.5 7.09987 22.5 8.25 22.5H15.75C16.9001 22.5 17.4752 22.5 17.9184 22.2775C18.3018 22.0896 18.5896 21.8018 18.7775 21.4184C19 20.9752 19 20.4001 19 19.25V10.5M10.5 1.5C11.4479 1.5 12.4323 1.5 13.2509 1.54442C14.0678 1.58875 14.8844 1.67729 15.552 2.0032C16.3886 2.41993 17.0801 3.11142 17.4968 3.94801C17.8227 4.61564 17.9112 5.43223 17.9556 6.24908C18 7.06767 18 8.05212 18 9.00002V10.5M10.5 1.5C9.55193 1.5 8.56735 1.5 7.74875 1.54442C6.93191 1.58875 6.11532 1.67729 5.44769 2.0032C4.61111 2.41993 3.91962 3.11142 3.50289 3.94801C3.17698 4.61564 3.08844 5.43223 3.04411 6.24908C3 7.06767 3 8.05212 3 9.00002V12M19 10.5H12.75C11.5999 10.5 11.0248 10.5 10.5816 10.7225C10.1982 10.9105 9.91045 11.1982 9.72246 11.5816C9.5 12.0248 9.5 12.5999 9.5 13.75V19.25C9.5 20.4001 9.5 20.9752 9.72246 21.4184C9.91045 21.8018 10.1982 22.0896 10.5816 22.2775C11.0248 22.5 11.5999 22.5 12.75 22.5H15.75C16.9001 22.5 17.4752 22.5 17.9184 22.2775C18.3018 22.0896 18.5896 21.8018 18.7775 21.4184C19 20.9752 19 20.4001 19 19.25V10.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-2">Мультимодальность</h3>
          <p className="text-muted-foreground mb-4">OpenAgent работает с разными типами данных: текстом, изображениями, кодом и документами</p>
          <ul className="space-y-2 mt-auto">
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Анализ изображений и документов</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Генерация и редактирование кода</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Работа с разными форматами файлов</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl overflow-hidden relative flex flex-col md:shadow-[0px_61px_24px_-10px_rgba(0,0,0,0.01),0px_34px_20px_-8px_rgba(0,0,0,0.05),0px_15px_15px_-6px_rgba(0,0,0,0.09),0px_4px_8px_-2px_rgba(0,0,0,0.10),0px_0px_0px_1px_rgba(0,0,0,0.08)] bg-accent p-6">
          <div className="rounded-full p-2 bg-secondary/10 w-fit mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary">
              <path d="M5 8C5 5.17157 5 3.75736 5.87868 2.87868C6.75736 2 8.17157 2 11 2H13C15.8284 2 17.2426 2 18.1213 2.87868C19 3.75736 19 5.17157 19 8V16C19 18.8284 19 20.2426 18.1213 21.1213C17.2426 22 15.8284 22 13 22H11C8.17157 22 6.75736 22 5.87868 21.1213C5 20.2426 5 18.8284 5 16V8Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 22V19C9 17.8954 9.89543 17 11 17H13C14.1046 17 15 17.8954 15 19V22" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 15C11.1046 15 12 14.1046 12 13C12 11.8954 11.1046 11 10 11C8.89543 11 8 11.8954 8 13C8 14.1046 8.89543 15 10 15Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 15C15.1046 15 16 14.1046 16 13C16 11.8954 15.1046 11 14 11C12.8954 11 12 11.8954 12 13C12 14.1046 12.8954 15 14 15Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 6H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-2">Автономность</h3>
          <p className="text-muted-foreground mb-4">OpenAgent самостоятельно выполняет сложные задачи, используя различные инструменты и сервисы</p>
          <ul className="space-y-2 mt-auto">
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Доступ к интернету и APIs</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Исполнение кода и скриптов</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Сложные многоэтапные задачи</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl overflow-hidden relative flex flex-col md:shadow-[0px_61px_24px_-10px_rgba(0,0,0,0.01),0px_34px_20px_-8px_rgba(0,0,0,0.05),0px_15px_15px_-6px_rgba(0,0,0,0.09),0px_4px_8px_-2px_rgba(0,0,0,0.10),0px_0px_0px_1px_rgba(0,0,0,0.08)] bg-accent p-6">
          <div className="rounded-full p-2 bg-secondary/10 w-fit mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-secondary">
              <path d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12.2422 7.75732C12.5469 7.62637 12.8725 7.55971 13.2031 7.55971C14.5945 7.55971 15.7266 8.69177 15.7266 10.0832C15.7266 11.4746 14.5945 12.6066 13.2031 12.6066C13.0812 12.6066 12.9616 12.595 12.8447 12.5725M12.2422 7.75732C12.0899 7.8244 11.9475 7.90654 11.8175 8.00154C11.1218 8.52542 10.6797 9.3541 10.6797 10.2927C10.6797 10.8295 10.5332 11.3282 10.2775 11.7516M12.2422 7.75732C12.0663 7.84032 11.9035 7.94337 11.7578 8.06399M10.2775 11.7516C9.90263 12.3986 9.2461 12.8442 8.48828 12.8442C7.41413 12.8442 6.54297 11.973 6.54297 10.8989C6.54297 9.82473 7.41413 8.95357 8.48828 8.95357C8.82603 8.95357 9.14108 9.04371 9.41133 9.2019M10.2775 11.7516C10.2171 11.8429 10.1506 11.9293 10.0785 12.0101M9.41133 9.2019C9.13521 9.36451 8.90521 9.59088 8.73828 9.86452M9.41133 9.2019C9.64831 9.05553 9.92456 8.95357 10.2188 8.95357C10.6255 8.95357 10.9933 9.12254 11.2578 9.3934C11.395 9.53472 11.5061 9.70259 11.5836 9.88897M8.85055 14.3028C8.62159 14.1943 8.3648 14.1348 8.09375 14.1348C6.93602 14.1348 6 15.0708 6 16.2285C6 17.3863 6.93602 18.3223 8.09375 18.3223C8.79665 18.3223 9.41797 17.9777 9.76562 17.4435M12.5664 15.8505C12.7758 15.3348 13.2817 14.9691 13.875 14.9691C14.6934 14.9691 15.3555 15.6312 15.3555 16.4496C15.3555 17.268 14.6934 17.9301 13.875 17.9301C13.1838 17.9301 12.6106 17.4371 12.4746 16.7985M16.4766 16.1598C16.828 16.3568 17.0781 16.7289 17.0781 17.1582C17.0781 17.768 16.5859 18.2598 15.9766 18.2598C15.3672 18.2598 14.875 17.768 14.875 17.1582C14.875 16.5485 15.3672 16.0566 15.9766 16.0566C16.1427 16.0566 16.3005 16.0941 16.4395 16.1598" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-2">Персонализация</h3>
          <p className="text-muted-foreground mb-4">OpenAgent адаптируется к вашему стилю работы и накапливает знания о ваших предпочтениях</p>
          <ul className="space-y-2 mt-auto">
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Сохранение контекста бесед</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Обучение на ваших задачах</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="size-5 rounded-full border border-primary/20 flex items-center justify-center">
                <CheckIcon className="size-3 text-primary" />
              </div>
              <span className="text-sm">Настраиваемые рабочие процессы</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
