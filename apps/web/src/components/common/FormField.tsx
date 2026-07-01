import type { PropsWithChildren, ReactNode } from "react";

interface FormFieldProps extends PropsWithChildren {
    label: string;

    htmlFor?: string;

    helperText?: string;

    error?: string;

    required?: boolean;

    action?: ReactNode;
}

export function FormField({
    label,
    htmlFor,
    helperText,
    error,
    required = false,
    action,
    children,
}: FormFieldProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label
                    htmlFor={htmlFor}
                    className="text-sm font-medium text-slate-700"
                >
                    {label}

                    {required && (
                        <span className="ml-1 text-red-500">
                            *
                        </span>
                    )}
                </label>

                {action}
            </div>

            {children}

            {error ? (
                <p className="text-sm text-red-600">
                    {error}
                </p>
            ) : helperText ? (
                <p className="text-sm text-slate-500">
                    {helperText}
                </p>
            ) : null}
        </div>
    );
}