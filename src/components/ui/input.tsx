import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("glass-input px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary", className)} {...props} />;
}
