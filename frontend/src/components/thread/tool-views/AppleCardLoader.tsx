"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence, useAnimationControls } from "framer-motion"
import { cn } from "@/lib/utils"

interface AppleCardLoaderProps {
  isProcessing?: boolean
  toolName?: string
  onComplete?: () => void
  processingTime?: number
  accentColor?: string
}

export function AppleCardLoader({
  isProcessing = false,
  toolName = "Processing",
  onComplete,
  processingTime = 4000,
  accentColor = "#0071e3", // Apple blue
}: AppleCardLoaderProps) {
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState(0)
  const cardControls = useAnimationControls()

  // Handle processing animation
  useEffect(() => {
    if (!isProcessing) {
      // setProgress(0) // Keep progress at 100 when complete
      // setPhase(0) // Keep phase at final when complete
      return
    }

    // Reset progress when processing starts
    setProgress(0)
    setPhase(0)


    // Animate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 1
        if (newProgress >= 100) {
          clearInterval(interval)
          if (onComplete) onComplete()
          return 100
        }
        return newProgress
      })
    }, processingTime / 100)

    // Animate phases
    const phaseInterval = setInterval(() => {
      setPhase((prev) => (prev + 1) % 4)
    }, processingTime / 4)

    // Sequence the card animations
    const sequenceCards = async () => {
      await cardControls.start("visible")
    }
    sequenceCards()

    return () => {
      clearInterval(interval)
      clearInterval(phaseInterval)
    }
  }, [isProcessing, processingTime, onComplete, cardControls])

  // Card variants
  const cardVariants = {
    hidden: (i: number) => ({
      y: 20,
      opacity: 0,
      scale: 0.95,
      rotateX: 10,
    }),
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      scale: 1,
      rotateX: 0,
      transition: {
        y: { duration: 0.5, delay: i * 0.1 },
        opacity: { duration: 0.5, delay: i * 0.1 },
        scale: { duration: 0.5, delay: i * 0.1 },
        rotateX: { duration: 0.5, delay: i * 0.1 },
      },
    }),
    processing: (i: number) => ({
      y: [0, -5, 0],
      scale: [1, 1.02, 1],
      rotateZ: [0, i % 2 === 0 ? 0.5 : -0.5, 0],
      transition: {
        y: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 2,
          delay: i * 0.2,
          ease: "easeInOut",
        },
        scale: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 2,
          delay: i * 0.2,
          ease: "easeInOut",
        },
        rotateZ: {
          repeat: Number.POSITIVE_INFINITY,
          duration: 2,
          delay: i * 0.2,
          ease: "easeInOut",
        },
      },
    }),
    exit: (i: number) => ({
      y: -20,
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.3,
        delay: i * 0.05,
      },
    }),
    complete: (i: number) => ({
      y: [20, 0],
      opacity: [0, 1],
      scale: [0.95, 1],
      transition: {
        duration: 0.5,
        delay: i * 0.1,
        ease: [0.16, 1, 0.3, 1], // Apple-like spring curve
      },
    }),
  }

  // Card data
  const cards = [
    {
      id: 1,
      title: "Analyzing Data",
      description: "Processing information patterns",
      width: "100%",
      height: 80,
    },
    {
      id: 2,
      title: "Generating Results",
      description: "Creating meaningful insights",
      width: "100%",
      height: 80,
    },
    {
      id: 3,
      title: "Optimizing Output",
      description: "Refining for best performance",
      width: "100%",
      height: 80,
    },
  ]

  // Progress line variants
  const progressLineVariants = {
    initial: { width: "0%" },
    animate: { width: `${progress}%` },
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#f5f5f7] dark:bg-[#1d1d1f] py-6">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.02] dark:from-transparent dark:to-white/[0.02]" />

      <div className="relative z-10 w-full max-w-md px-6">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Tool name with Apple-like typography */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1 tracking-tight"
              >
                {toolName}
              </motion.h2>

              {/* Subtle description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                className="text-sm text-[#86868b] dark:text-[#86868b] mb-8"
              >
                {phase === 0 && "Initializing process"}
                {phase === 1 && "Analyzing data"}
                {phase === 2 && "Processing results"}
                {phase === 3 && "Finalizing"}
              </motion.p>

              {/* Apple-style progress bar */}
              <motion.div className="w-16 h-[2px] bg-[#e6e6e6] dark:bg-[#333336] rounded-full mb-10 overflow-hidden">
                <motion.div
                  className="h-full bg-[#0071e3] dark:bg-[#0071e3]"
                  style={{ backgroundColor: accentColor }}
                  variants={progressLineVariants}
                  initial="initial"
                  animate="animate"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              </motion.div>

              {/* Card stack */}
              <div className="relative w-full perspective-[1000px]">
                {cards.map((card, index) => (
                  <motion.div
                    key={card.id}
                    custom={index}
                    variants={cardVariants}
                    initial="hidden"
                    animate={["visible", "processing"]}
                    exit="exit"
                    style={{
                      width: card.width,
                      height: card.height,
                      zIndex: cards.length - index,
                      position: "relative",
                      marginTop: index === 0 ? 0 : -60,
                      transformOrigin: "center bottom",
                    }}
                    className={cn(
                      "rounded-xl p-5",
                      "bg-white dark:bg-[#2c2c2e]",
                      "border border-black/[0.04] dark:border-white/[0.04]",
                      "shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]",
                      "backdrop-blur-sm",
                    )}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1">{card.title}</h3>
                        <p className="text-xs text-[#86868b] dark:text-[#86868b]">{card.description}</p>
                      </div>

                      {/* Subtle progress indicator */}
                      <div className="w-full h-[1px] bg-[#e6e6e6] dark:bg-[#333336] mt-4 overflow-hidden">
                        <motion.div
                          className="h-full"
                          style={{ backgroundColor: accentColor }}
                          animate={{
                            x: ["-100%", "100%"],
                          }}
                          transition={{
                            duration: 2,
                            delay: index * 0.2,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              {/* Completion state */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="w-12 h-12 rounded-full flex items-center justify-center mb-6"
                style={{ backgroundColor: accentColor }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-white"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-lg font-medium text-[#1d1d1f] dark:text-[#f5f5f7] mb-1 tracking-tight"
              >
                {toolName} Complete
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                className="text-sm text-[#86868b] dark:text-[#86868b] mb-8"
              >
                Process completed successfully
              </motion.p>

              {/* Completed card */}
              <motion.div
                variants={cardVariants}
                custom={0}
                initial="hidden"
                animate="complete"
                className={cn(
                  "w-full rounded-xl p-5",
                  "bg-white dark:bg-[#2c2c2e]",
                  "border border-black/[0.04] dark:border-white/[0.04]",
                  "shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]",
                )}
              >
                <div className="flex items-center">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mr-4"
                    style={{ backgroundColor: `${accentColor}1A` }} // Ensure alpha is hex
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ color: accentColor }}
                    >
                      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">Process Complete</h3>
                    <p className="text-xs text-[#86868b] dark:text-[#86868b]">Results ready for review</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 