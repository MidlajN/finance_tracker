import type {
    InputHTMLAttributes,
} from "react";

import { cn } from "../../utils/helpers";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({
    className,
    ...props
}: InputProps) {
    return (
        <input
            {...props}
            className={cn(
                "w-full",
                "rounded-lg",
                "border border-slate-300",
                "bg-white",
                "px-3 py-2",
                "text-sm",
                "outline-none",
                "transition",
                "focus:border-blue-600",
                "focus:ring-2",
                "focus:ring-blue-100",
                className
            )}
        />
    );
}
