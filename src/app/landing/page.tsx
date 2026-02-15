"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-4">
          <BrandLogo variant="large" className="justify-center" />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-center font-headline text-muted-foreground">
          Welcome to Your Spiritual Journey
        </h1>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground mt-4 text-center max-w-md text-lg"
      >
        Watch videos, explore temples, discover stories — all in a beautifully designed spiritual feed.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-10 flex gap-4"
      >
        <Button asChild size="lg" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-shadow">
          <Link href="/login">Login</Link>
        </Button>

        <Button asChild size="lg" variant="outline" className="px-6 py-3 rounded-xl border font-semibold">
          <Link href="/login">Sign Up</Link>
        </Button>
      </motion.div>
    </div>
  );
}
