import { create } from "zustand";

import {
    ReportService,
    type FinancialReport,
    type ReportPeriod,
} from "../services/ReportService";

const defaultPeriod =
    ReportService.getDefaultPeriod();

interface ReportState {
    loading: boolean;

    error: string | null;

    period: ReportPeriod;

    value: string;

    report: FinancialReport | null;

    refresh: (
        period?: ReportPeriod,
        value?: string
    ) => Promise<void>;

    clearError: () => void;
}

export const useReportStore =
    create<ReportState>((set, get) => ({
        loading: false,

        error: null,

        period: defaultPeriod.period,

        value: defaultPeriod.value,

        report: null,

        async refresh(period, value) {
            if (get().loading) {
                return;
            }

            const targetPeriod =
                period ?? get().period;

            const targetValue =
                value ?? get().value;

            set({
                loading: true,
                error: null,
                period: targetPeriod,
                value: targetValue,
            });

            try {
                const report =
                    await ReportService.getReport(
                        targetPeriod,
                        targetValue
                    );

                set({
                    report,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to load report.",
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },
    }));
