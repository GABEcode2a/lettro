"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PaymentSuccessRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/generate");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return null;
}
