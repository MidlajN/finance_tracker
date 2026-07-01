import type { PropsWithChildren } from "react";
import { X } from "lucide-react";

import { cn } from "../../utils/helpers";
import { Button } from "./Button";

interface DialogProps extends PropsWithChildren {
    open: boolean;

    title: string;

    onClose: () => void;

    className?: string;
}

export function Dialog({
    open,
    title,
    onClose,
    className,
    children,
}: DialogProps) {
    if (!open) {
        return null;
    }

    return (
        <div
            className="
                fixed
                inset-0
                z-50
                flex
                items-center
                justify-center
                bg-slate-900/50
                p-4
            "
            onClick={onClose}
        >
            <div
                className={cn(
                    "w-full",
                    "max-w-xl",
                    "overflow-hidden",
                    "rounded-2xl",
                    "bg-white",
                    "shadow-2xl",
                    className
                )}
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <div
                    className="
                        flex
                        items-center
                        justify-between
                        border-b
                        border-slate-200
                        px-6
                        py-4
                    "
                >
                    <h2 className="text-lg font-semibold text-slate-900">
                        {title}
                    </h2>

                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="p-2"
                    >
                        <X size={18} />
                    </Button>
                </div>

                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}