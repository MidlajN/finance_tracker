import { clsx, type ClassValue } from "clsx";

export {
    assert,
    normalizeMerchantName,
} from "@finance/shared-utils";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs);
}
