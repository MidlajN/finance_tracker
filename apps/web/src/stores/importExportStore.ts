import { create } from "zustand";

import {
    ImportExportService,
    type ImportResult,
} from "../services/ImportExportService";

interface ImportExportState {
    loading: boolean;

    error: string | null;

    result: ImportResult | null;

    importCsv: (
        text: string
    ) => Promise<void>;

    restoreBackup: (
        text: string
    ) => Promise<void>;

    exportTransactionsCsv: () => Promise<string>;

    exportBackupJson: () => Promise<string>;

    clearError: () => void;

    clearResult: () => void;
}

export const useImportExportStore =
    create<ImportExportState>((set) => ({
        loading: false,

        error: null,

        result: null,

        async importCsv(text) {
            set({
                loading: true,
                error: null,
                result: null,
            });

            try {
                const result =
                    await ImportExportService.importCsv(
                        text
                    );

                set({
                    result,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to import CSV.",
                });
            }
        },

        async restoreBackup(text) {
            set({
                loading: true,
                error: null,
                result: null,
            });

            try {
                const result =
                    await ImportExportService.restoreBackupJson(
                        text
                    );

                set({
                    result,
                    loading: false,
                });
            } catch (error) {
                set({
                    loading: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Failed to restore backup.",
                });
            }
        },

        async exportTransactionsCsv() {
            set({
                loading: true,
                error: null,
            });

            try {
                const output =
                    await ImportExportService.exportTransactionsCsv();

                set({
                    loading: false,
                });

                return output;
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to export transactions.";

                set({
                    loading: false,
                    error: message,
                });

                throw new Error(message, {
                    cause: error,
                });
            }
        },

        async exportBackupJson() {
            set({
                loading: true,
                error: null,
            });

            try {
                const output =
                    await ImportExportService.exportBackupJson();

                set({
                    loading: false,
                });

                return output;
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Failed to export backup.";

                set({
                    loading: false,
                    error: message,
                });

                throw new Error(message, {
                    cause: error,
                });
            }
        },

        clearError() {
            set({
                error: null,
            });
        },

        clearResult() {
            set({
                result: null,
            });
        },
    }));
