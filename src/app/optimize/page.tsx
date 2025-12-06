"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSystemPrompt, saveSystemPrompt, triggerOptimization, getOptimizationHistory } from "./actions";

function OptimizeContent() {
    const searchParams = useSearchParams();
    const initialAccountId = searchParams.get("accountId") || "default_account";

    const [prompt, setPrompt] = useState("");
    const [accountId, setAccountId] = useState(initialAccountId);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [status, setStatus] = useState("");

    useEffect(() => {
        if (accountId && accountId !== "default_account") {
            loadData();
        }
    }, [accountId]);

    async function loadData() {
        const p = await getSystemPrompt(accountId !== "default_account" ? accountId : undefined);
        setPrompt(p || "");
        const h = await getOptimizationHistory(accountId);
        setHistory(h);
    }

    async function handleSave() {
        setLoading(true);
        await saveSystemPrompt(prompt, accountId !== "default_account" ? accountId : undefined);
        setLoading(false);
        setStatus("Saved!");
        setTimeout(() => setStatus(""), 2000);
    }

    async function handleOptimize() {
        setLoading(true);
        setStatus("Optimizing... This may take a few seconds.");
        try {
            const result = await triggerOptimization(accountId);
            setPrompt(result.newPrompt);
            setStatus("Optimization Complete!");
            loadData(); // Reload history
        } catch (e) {
            setStatus(`Error: ${(e as Error).message}`);
        }
        setLoading(false);
    }

    return (
        <div className="p-8 max-w-4xl mx-auto font-sans">
            <h1 className="text-3xl font-bold mb-6">Threads Optimization Dashboard</h1>

            {accountId === "default_account" && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm">
                    ⚠️ No account selected. Please select an account from the dashboard first.
                </div>
            )}

            <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Current System Prompt</h2>
                <textarea
                    className="w-full h-64 p-4 border border-gray-300 rounded-md font-mono text-sm mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
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
                        disabled={loading || accountId === "default_account"}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 disabled:opacity-50 transition-colors font-medium"
                    >
                        ✨ Auto-Optimize with Gemini
                    </button>
                </div>
                {status && <p className="mt-4 text-sm font-medium text-blue-600">{status}</p>}
            </div>

            <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200">
                <h2 className="text-xl font-semibold mb-4">Optimization History</h2>
                <div className="space-y-4">
                    {history.map((item) => (
                        <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-sm text-gray-500">{new Date(item.created_at).toLocaleString()}</span>
                            </div>
                            <div className="bg-gray-50 p-3 rounded text-sm mb-2">
                                <p className="font-semibold text-gray-700 mb-1">Analysis:</p>
                                <p className="text-gray-600">{item.analysis}</p>
                            </div>
                            <details className="text-sm">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View Prompt Change</summary>
                                <div className="mt-2 grid grid-cols-2 gap-4">
                                    <div className="p-2 bg-red-50 rounded border border-red-100">
                                        <p className="font-xs font-bold text-red-800 mb-1">Old</p>
                                        <pre className="whitespace-pre-wrap text-xs text-red-900">{item.old_prompt}</pre>
                                    </div>
                                    <div className="p-2 bg-green-50 rounded border border-green-100">
                                        <p className="font-xs font-bold text-green-800 mb-1">New</p>
                                        <pre className="whitespace-pre-wrap text-xs text-green-900">{item.new_prompt}</pre>
                                    </div>
                                </div>
                            </details>
                        </div>
                    ))}
                    {history.length === 0 && <p className="text-gray-500 italic">No optimization history yet.</p>}
                </div>
            </div>
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
