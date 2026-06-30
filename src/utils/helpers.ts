
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}

export function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

export function normalizeMerchantName(
    name: string
) {
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}