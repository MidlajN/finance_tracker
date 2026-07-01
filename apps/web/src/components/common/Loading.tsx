export function Loading() {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-6">
                <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-300 border-t-blue-600" />

                <p className="text-sm text-slate-500">
                    Loading your workspace...
                </p>
            </div>
        </div>
    );
}