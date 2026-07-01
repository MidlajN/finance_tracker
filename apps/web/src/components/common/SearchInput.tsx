import { Search } from "lucide-react";

import { Input } from "./Input";

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function SearchInput({
    value,
    onChange,
    placeholder = "Search...",
}: SearchInputProps) {
    return (
        <div className="relative">
            <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <Input
                value={value}
                placeholder={placeholder}
                className="pl-10"
                onChange={(e) =>
                    onChange(e.target.value)
                }
            />
        </div>
    );
}