import { User } from "lucide-react";
import { cn } from "../../utils/helpers";

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    size?: number;
}

export function Avatar({
    src,
    name,
    size = 40,
}: AvatarProps) {
    if (src) {
        return (
            <img
                src={src}
                alt={name ?? "Avatar"}
                className="rounded-full object-cover"
                style={{
                    width: size,
                    height: size,
                }}
            />
        );
    }

    return (
        <div
            className={cn(
                "flex items-center justify-center rounded-full bg-slate-100 text-slate-500"
            )}
            style={{
                width: size,
                height: size,
            }}
        >
            <User size={size * 0.5} />
        </div>
    );
}