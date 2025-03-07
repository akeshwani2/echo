"use client"

import type React from "react"

import { Box, Lock, Search, Settings, Sparkles } from "lucide-react"
import { GlowingEffect } from "../components/glowing-effect"
import { motion } from "framer-motion"

export default function Features() {
  return (
    <ul className="grid grid-cols-1 grid-rows-none gap-4 md:grid-cols-12 md:grid-rows-3 lg:gap-4 xl:max-h-[34rem] xl:grid-rows-2 px-10 md:px-60">
      <GridItem
        area="md:[grid-area:1/1/2/7] xl:[grid-area:1/1/2/5]"
        icon={<Box className="h-4 w-4 text-black dark:text-neutral-400 hover:scale-110 transition-all duration-300" />}
        title="Long-term Memory"
        description="Takes real time notes from your conversations and uses them to provide more personalized responses"
      />

      <GridItem
        area="md:[grid-area:1/7/2/13] xl:[grid-area:2/1/3/5]"
        icon={<Settings className="h-4 w-4 text-black dark:text-neutral-400 hover:scale-110 transition-all duration-300" />}
        title="Natural Conversations"
        description="Experience a more personalized and natural conversation"
      />

      <GridItem
        area="md:[grid-area:2/7/3/13] xl:[grid-area:1/8/2/13]"
        icon={<Sparkles className="h-4 w-4 text-black dark:text-neutral-400 hover:scale-110 transition-all duration-300" />}
        title="Customizable AI"
        description="Set a custom prompt for the AI to use, making it more personalized and tailored to your needs"
      />

      <GridItem
        area="md:[grid-area:3/1/4/13] xl:[grid-area:2/8/3/13]"
        icon={<Search className="h-4 w-4 text-black dark:text-neutral-400 hover:scale-110 transition-all duration-300" />}
        title="Conversation History"
        description="Access and manage your conversation history with built-in memory system"
      />

      <GridItem
        area="md:[grid-area:2/1/3/7] xl:[grid-area:1/5/3/8]"
        icon={<Lock className="h-4 w-4 text-black dark:text-neutral-400 hover:scale-110 transition-all duration-300" />}
        title="Security and Privacy"
        description="Your data is encrypted and never shared with anyone"
      />
    </ul>
  )
}

interface GridItemProps {
  area: string
  icon: React.ReactNode
  title: string
  description: React.ReactNode
}

const GridItem = ({ area, icon, title, description }: GridItemProps) => {
  return (
    <motion.li 
      className={`min-h-[14rem] list-none backdrop-blur-sm ${area}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="relative h-full rounded-2.5xl border border-white/10 p-2 md:rounded-3xl md:p-3 bg-black/40">
        <GlowingEffect
          blur={0}
          borderWidth={3}
          spread={80}
          glow={true}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />
        <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl p-6 md:p-6 bg-gradient-to-br from-black/80 to-black/40">
          <div className="relative flex flex-1 flex-col justify-between gap-3">
            <motion.div 
              className="w-fit rounded-lg border border-gray-600 p-2"
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              {icon}
            </motion.div>
            <motion.div 
              className="space-y-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="pt-0.5 text-xl/[1.375rem] tracking-tighter md:text-2xl/[1.875rem] text-balance text-black dark:text-white">
                {title}
              </h3>
              <h2 className="[&_b]:md:font-semibold [&_strong]:md:font-semibold font-sans text-xs/[1.125rem] md:text-sm text-black dark:text-neutral-400">
                {description}
              </h2>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.li>
  )
}

