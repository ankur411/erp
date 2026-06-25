import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatSmartNumber(num: number): string {
  if (num < 0) return "0"
  if (num < 100) return num.toString()
  
  if (num < 1000) {
    return `${Math.floor(num / 100) * 100}+`
  }
  
  let divisor = 1000
  let suffix = "K"
  
  if (num >= 1000000000) {
    divisor = 1000000000
    suffix = "B"
  } else if (num >= 1000000) {
    divisor = 1000000
    suffix = "M"
  }
  
  const val = num / divisor
  // Floor to 1 decimal place: e.g. 1.25 -> 1.2
  const formattedVal = Math.floor(val * 10) / 10
  
  return `${formattedVal}${suffix}+`
}

