"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getConcept, saveConcept, triggerOptimization, getOptimizationHistory, getAccounts } from "./actions";

type AccountInfo = {
    id: string;
    handle: string;
    display_name: string;
    platform: string;
    optimizationEnabled?: boolean;
    concept?: string;
};

function OptimizeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialAccountId = searchParams.get("accountId") || "";

    const [concept, setConcept] = useState("");
    const [accountId, setAccountId] = useState(initialAccountId);
    const [accounts, setAccounts] = useState<AccountInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [status, setStatus] = useState("");
    const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
    const [lastPrompt, setLastPrompt] = useState<string | null>(null);

    const handleAccountChange = useCallback((newAccountId: string) => {
        setAccountId(newAccountId);
        // Update URL without page reload
        if (newAccountId) {
            router.push(`/optimize?accountId=${newAccountId}`, { scroll: false });
        } else {
            router.push('/optimize', { scroll: false });
        }
    }, [router]);

    useEffect(() => {
        loadAccounts();
    }, []);

    useEffect(() => {
        if (accountId) {
            loadData();
        }
    }, [accountId]);

    async function loadAccounts() {
        const accs = await getAccounts();
        setAccounts(accs);
        // If no account selected but we have accounts, select the first optimization-enabled one
        if (!accountId && accs.length > 0) {
            const enabledAccount = accs.find(a => a.optimizationEnabled) || accs[0];
            handleAccountChange(enabledAccount.id);
        }
    }

    async function loadData() {
        const c = await getConcept(accountId);
        setConcept(c || "");
        const h = await getOptimizationHistory(accountId);
        setHistory(h);
    }

    async function handleSave() {
        setLoading(true);
        await saveConcept(accountId, concept);
        setLoading(false);
        setStatus("Saved!");
        setTimeout(() => setStatus(""), 2000);
    }

    async function handleOptimize() {
        setLoading(true);
        setStatus("Optimizing... This may take a few seconds.");
        setLastAnalysis(null);
        setLastPrompt(null);
        try {
            const result = await triggerOptimization(accountId);
            setConcept(result.newConcept);
            setLastAnalysis(result.analysis);
            setLastPrompt(result.prompt);
            setStatus("Optimization Complete!");
            loadData(); // Reload history
        } catch (e) {
            setStatus(`Error: ${(e as Error).message}`);
        }
        setLoading(false);
    }

    const selectedAccount = accounts.find(a => a.id === accountId);

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Threads Optimization Dashboard</h1>
                <Link
                    href="/dashboard"
                    className="px-4 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
                >
                    ← Back to Dashboard
                </Link>
            </div>

            {/* Account Selector */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-gray-200">
                <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">Target Account:</label>
                    <select
                        value={accountId}
                        onChange={(e) => handleAccountChange(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select an account...</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                @{acc.handle} ({acc.platform}) {acc.optimizationEnabled ? "✓" : ""}
                            </option>
                        ))}
                    </select>
                    {selectedAccount && (
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${selectedAccount.optimizationEnabled
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                                }`}>
                                {selectedAccount.optimizationEnabled ? "Optimization Enabled" : "Optimization Disabled"}
                            </span>
                        </div>
                    )}
                </div>
                {selectedAccount && (
                    <p className="mt-2 text-sm text-gray-500">
                        {selectedAccount.display_name} • Concept is used for AI post generation
                    </p>
                )}
            </div>

            {!accountId && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                    ⚠️ No account selected. Please select an account to view and optimize its concept.
                </div>
            )}

            {accountId && (
                <>
                    <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Account Concept</h2>
                        <textarea
                            className="w-full h-64 p-4 border border-gray-300 rounded-md font-mono text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={concept}
                            onChange={(e) => setConcept(e.target.value)}
                            placeholder="No concept defined yet. Click 'Auto-Optimize' to generate one based on your top performing posts."
                        />
                        <div className="flex gap-4">
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                            >
                                Save Manual Changes
                            </button>
                            <button
                                onClick={handleOptimize}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 transition-colors font-medium"
                            >
                                ✨ Auto-Optimize with Gemini
                            </button>
                        </div>
                        {status && <p className="mt-4 text-sm font-medium text-blue-600">{status}</p>}

                        {/* Optimization Analysis Result */}
                        {lastAnalysis && (
                            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <h3 className="text-sm font-semibold text-green-800 mb-2">📊 最適化の分析結果</h3>
                                <pre className="text-sm text-green-900 whitespace-pre-wrap">
                                    {typeof lastAnalysis === "object" ? JSON.stringify(lastAnalysis, null, 2) : lastAnalysis}
                                </pre>
                            </div>
                        )}

                        {/* Sent Prompt */}
                        {lastPrompt && (
                            <details className="mt-4">
                                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                    📝 Geminiに送信したプロンプトを表示
                                </summary>
                                <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                    <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">{lastPrompt}</pre>
                                </div>
                            </details>
                        )}
                    </div>

                    <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4">Optimization History</h2>
                        <div className="space-y-4">
                            {history.map((item) => {
                                const formatValue = (val: unknown) => {
                                    if (val === null || val === undefined) return "(empty)";
                                    if (typeof val === "object") return JSON.stringify(val, null, 2);
                                    return String(val);
                                };
                                return (
                                    <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded text-sm mb-2">
                                            <p className="font-semibold text-gray-700 mb-1">Analysis:</p>
                                            <pre className="text-gray-600 whitespace-pre-wrap">{formatValue(item.analysis)}</pre>
                                        </div>
                                        <details className="text-sm">
                                            <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View Concept Change</summary>
                                            <div className="mt-2 grid grid-cols-2 gap-4">
                                                <div className="p-2 bg-red-50 rounded border border-red-100">
                                                    <p className="font-xs font-bold text-red-800 mb-1">Old</p>
                                                    <pre className="whitespace-pre-wrap text-xs text-red-900">{formatValue(item.old_prompt)}</pre>
                                                </div>
                                                <div className="p-2 bg-green-50 rounded border border-green-100">
                                                    <p className="font-xs font-bold text-green-800 mb-1">New</p>
                                                    <pre className="whitespace-pre-wrap text-xs text-green-900">{formatValue(item.new_prompt)}</pre>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                );
                            })}
                            {history.length === 0 && <p className="text-gray-500 italic">No optimization history yet.</p>}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default function OptimizePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <OptimizeContent />
        </Suspense>
    );
}
