import {
    useState,
    type ChangeEvent,
} from "react";
import {
    AlertCircle,
    Download,
    FileArchive,
    FileText,
    Upload,
} from "lucide-react";

import { Button } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { Input } from "../../components/common/Input";
import { PageContainer } from "../../components/common/PageContainer";
import { PageHeader } from "../../components/common/PageHeader";
import { Section } from "../../components/common/Section";
import { Surface } from "../../components/common/Surface";

import { useImportExportStore } from "../../stores/importExportStore";

function downloadText(
    filename: string,
    content: string,
    type: string
) {
    const blob = new Blob([content], {
        type,
    });

    const url =
        URL.createObjectURL(blob);

    const anchor =
        document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    anchor.click();

    URL.revokeObjectURL(url);
}

async function readFile(
    file: File
) {
    return file.text();
}

export function ImportExport() {
    const [selectedFileName, setSelectedFileName] =
        useState<string | null>(null);

    const loading = useImportExportStore(
        (state) => state.loading
    );

    const error = useImportExportStore(
        (state) => state.error
    );

    const result = useImportExportStore(
        (state) => state.result
    );

    const importCsv = useImportExportStore(
        (state) => state.importCsv
    );

    const restoreBackup =
        useImportExportStore(
            (state) => state.restoreBackup
        );

    const exportTransactionsCsv =
        useImportExportStore(
            (state) =>
                state.exportTransactionsCsv
        );

    const exportBackupJson =
        useImportExportStore(
            (state) =>
                state.exportBackupJson
        );

    const clearError =
        useImportExportStore(
            (state) => state.clearError
        );

    async function handleCsvImport(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        setSelectedFileName(file.name);

        const text = await readFile(file);
        await importCsv(text);

        event.target.value = "";
    }

    async function handleBackupRestore(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        setSelectedFileName(file.name);

        const text = await readFile(file);
        await restoreBackup(text);

        event.target.value = "";
    }

    async function handleTransactionExport() {
        const output =
            await exportTransactionsCsv();

        downloadText(
            "transactions.csv",
            output,
            "text/csv"
        );
    }

    async function handleBackupExport() {
        const output =
            await exportBackupJson();

        downloadText(
            "finance-engine-backup.json",
            output,
            "application/json"
        );
    }

    return (
        <PageContainer className="space-y-6">
            <PageHeader
                title="Import / Export"
                description="Move data in and out of the finance engine without bypassing financial events."
            />

            {error && (
                <Surface className="flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <AlertCircle
                        size={18}
                        className="mt-0.5 shrink-0"
                    />

                    <div className="min-w-0 flex-1">
                        <p className="font-medium">
                            {error}
                        </p>
                    </div>

                    <Button
                        variant="ghost"
                        className="px-2 py-1 text-red-700 hover:bg-red-100"
                        onClick={clearError}
                    >
                        Dismiss
                    </Button>
                </Surface>
            )}

            {result && (
                <Surface className="p-5">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Import Result
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        {selectedFileName ??
                            "Selected file"}
                    </p>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-slate-500">
                                Imported
                            </p>

                            <p className="text-2xl font-bold text-slate-900">
                                {result.imported}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Skipped
                            </p>

                            <p className="text-2xl font-bold text-slate-900">
                                {result.skipped}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-slate-500">
                                Errors
                            </p>

                            <p className="text-2xl font-bold text-slate-900">
                                {result.errors.length}
                            </p>
                        </div>
                    </div>
                </Surface>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Section
                    title="CSV Import"
                    description="CSV imports create pending financial events and reuse rules."
                >
                    <Surface className="space-y-5 p-6">
                        <div className="flex items-center gap-3">
                            <Upload className="text-slate-400" />

                            <div>
                                <h3 className="font-semibold text-slate-900">
                                    Import Financial Events
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                    Required columns: merchant, amount, direction, occurred_at, currency, notes.
                                </p>
                            </div>
                        </div>

                        <Input
                            type="file"
                            accept=".csv,text/csv"
                            disabled={loading}
                            onChange={handleCsvImport}
                        />
                    </Surface>
                </Section>

                <Section
                    title="Export"
                    description="Export confirmed transactions or a financial event backup."
                >
                    <Surface className="space-y-4 p-6">
                        <Button
                            type="button"
                            disabled={loading}
                            onClick={
                                handleTransactionExport
                            }
                            className="w-full gap-2"
                        >
                            <Download size={16} />
                            Export Transactions CSV
                        </Button>

                        <Button
                            type="button"
                            variant="secondary"
                            disabled={loading}
                            onClick={
                                handleBackupExport
                            }
                            className="w-full gap-2"
                        >
                            <FileArchive
                                size={16}
                            />
                            Export Event Backup
                        </Button>
                    </Surface>
                </Section>
            </div>

            <Section
                title="Restore Backup"
                description="Restored records become financial events and pass through the same rule pipeline."
            >
                <Surface className="space-y-5 p-6">
                    <div className="flex items-center gap-3">
                        <FileText className="text-slate-400" />

                        <div>
                            <h3 className="font-semibold text-slate-900">
                                Restore Financial Events
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                                Duplicate event records are skipped during restore.
                            </p>
                        </div>
                    </div>

                    <Input
                        type="file"
                        accept=".json,application/json"
                        disabled={loading}
                        onChange={
                            handleBackupRestore
                        }
                    />
                </Surface>
            </Section>

            {!result && !error && (
                <EmptyState
                    title="No import activity"
                    description="Import results will appear here after a CSV or backup restore."
                />
            )}
        </PageContainer>
    );
}
