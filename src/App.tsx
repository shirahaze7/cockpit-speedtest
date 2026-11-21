import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    AlertVariant,
    Page,
    PageSection,
    Tab,
    Tabs,
    TabTitleText,
    Title
} from "@patternfly/react-core";
import type { CockpitError, SpawnPromise } from "cockpit";

import { AlertArea, type AlertState } from "./components/AlertArea";
import { NotInstalledCard } from "./components/NotInstalledCard";
import { ConsentCard } from "./components/ConsentCard";
import { MeasurementCard } from "./components/MeasurementCard";
import { ResultCard } from "./components/ResultCard";
import { LogDetails } from "./components/LogDetails";
import { HistoryCard } from "./components/HistoryCard";
import { SettingsCard } from "./components/SettingsCard";

import type { FormattedResult, SpeedtestServer } from "./types/speedtest";
import {
    classifyError,
    formatMbps,
    formatMs,
    isCockpitError,
    isOoklaCli,
    isValidServerId,
    parseJsonlLine,
    parseServerList,
    summarizeResult
} from "./lib/speedtestCore";
import {
    addHistoryEntry,
    clampHistoryLimit,
    loadConfig,
    loadHistory,
    saveConfig,
    saveHistory,
    type AppConfig,
    type HistoryEntry
} from "./lib/historyStorage";

// Cockpit の API と利用条件同意の保存キー
const cockpit = window.cockpit;
const CONSENT_KEY = "cockpit-speedtest.consent-v1";

// 速度測定拡張のメイン画面コンポーネント
export const App: React.FC = () => {
    // CLI の利用可否・確認中状態・検出バージョン
    const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);
    const [checkingCli, setCheckingCli] = useState(false);
    const [cliVersion, setCliVersion] = useState("");
    // Ookla 利用条件への同意状態（localStorage から初期化）
    const [hasConsent, setHasConsent] = useState(() => {
        try {
            return window.localStorage.getItem(CONSENT_KEY) === "yes";
        } catch {
            return false;
        }
    });

    // 測定サーバー一覧と選択状態
    const [servers, setServers] = useState<readonly SpeedtestServer[]>([]);
    const [selectedServerId, setSelectedServerId] = useState("");
    const [serversStatus, setServersStatus] = useState("");
    const [loadingServers, setLoadingServers] = useState(false);

    // 測定実行中の進捗表示用状態
    const [running, setRunning] = useState(false);
    const [progressPhase, setProgressPhase] = useState("");
    const [progressPercent, setProgressPercent] = useState<number | null>(null);
    const [progressDetail, setProgressDetail] = useState("");

    // 最新結果・通知・詳細ログ
    const [result, setResult] = useState<FormattedResult | null>(null);
    const [alert, setAlert] = useState<AlertState | null>(null);
    const [logs, setLogs] = useState("");

    // タブおよび履歴・設定の状態
    const [activeTabKey, setActiveTabKey] = useState<string | number>("measure");
    const [config, setConfig] = useState<AppConfig>(() => loadConfig());
    const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

    // 実行中プロセスやキャンセル判定、最新設定への参照（非同期コールバック用）
    const currentProcRef = useRef<SpawnPromise | null>(null);
    const cancelledRef = useRef(false);
    const runSeqRef = useRef(0);
    const configRef = useRef(config);
    configRef.current = config;

    // 履歴追加ハンドラ
    const handleAddHistory = useCallback((newResult: FormattedResult) => {
        setHistory((prev) => {
            const updated = addHistoryEntry(prev, newResult, configRef.current.maxHistoryEntries);
            saveHistory(updated);
            return updated;
        });
    }, []);

    // 設定保存ハンドラ
    const handleSaveConfig = useCallback((newConfig: AppConfig) => {
        const clampedLimit = clampHistoryLimit(newConfig.maxHistoryEntries);
        const updatedConfig = { maxHistoryEntries: clampedLimit };
        saveConfig(updatedConfig);
        setConfig(updatedConfig);
        setHistory((prev) => {
            const trimmed = prev.slice(0, clampedLimit);
            if (trimmed.length !== prev.length) {
                saveHistory(trimmed);
            }
            return trimmed;
        });
    }, []);

    // 履歴の個別削除ハンドラ
    const handleDeleteHistoryEntry = useCallback((id: string) => {
        setHistory((prev) => {
            const updated = prev.filter((entry) => entry.id !== id);
            saveHistory(updated);
            return updated;
        });
    }, []);

    // 履歴の全件削除ハンドラ
    const handleClearHistory = useCallback(() => {
        saveHistory([]);
        setHistory([]);
        setAlert({
            variant: AlertVariant.info,
            title: "測定履歴をすべて削除しました"
        });
    }, []);

    const handleNotify = useCallback((variant: AlertVariant, title: string) => {
        setAlert({ variant, title });
    }, []);

    const appendLog = useCallback((text: string) => {
        setLogs((prev) => (prev !== "" ? `${prev}\n${text}` : text));
    }, []);

    const consentArgs = useCallback((): readonly string[] => {
        return hasConsent ? ["--accept-license", "--accept-gdpr"] : [];
    }, [hasConsent]);

    // CLI の有無とバージョンを確認する
    const checkCli = useCallback(async () => {
        setAlert(null);
        setCheckingCli(true);
        setCliVersion("");
        try {
            const output = await cockpit.spawn(["speedtest", "--version"], { err: "out" });
            const firstLine = String(output).split(/\r?\n/)[0] ?? "";
            setCliVersion(firstLine);
            const isOokla = isOoklaCli(output);
            setCliAvailable(isOokla);
            if (!isOokla) {
                appendLog(
                    `speedtest --version: Ookla Speedtest CLI ではありません (${firstLine || "バージョンを判定できません"})`
                );
            }
        } catch (err: unknown) {
            setCliAvailable(false);
            const cErr: CockpitError | null = isCockpitError(err) ? err : null;
            if (classifyError(cErr?.problem, cErr?.message) !== "not-installed") {
                appendLog(`speedtest --version: ${cErr?.message ?? String(err)}`);
            }
        } finally {
            setCheckingCli(false);
        }
    }, [appendLog]);

    // 測定先一覧を取得する
    const loadServers = useCallback(async () => {
        if (running) return;
        setServersStatus("測定先一覧を取得中…");
        setLoadingServers(true);
        const args = ["speedtest", "--servers", "--format=json", ...consentArgs()];
        try {
            const output = await cockpit.spawn(args, { superuser: "try", err: "out" });
            const list = parseServerList(output);
            setServers(list);
            setServersStatus(
                list.length > 0
                    ? `${list.length} 件の測定先を取得しました`
                    : "測定先一覧が空でした。自動選択でも測定できます。"
            );
        } catch (err: unknown) {
            const cErr: CockpitError | null = isCockpitError(err) ? err : null;
            setServersStatus("測定先一覧を取得できませんでした。自動選択でも測定できます。");
            const kind = classifyError(cErr?.problem, cErr?.message);
            if (kind === "license") {
                setHasConsent(false);
                try {
                    window.localStorage.removeItem(CONSENT_KEY);
                } catch {
                    /* ignore */
                }
                setAlert({
                    variant: AlertVariant.warning,
                    title: "Ookla の利用条件への同意が必要です",
                    body: "同意が確認できませんでした。利用条件を確認し、同意してから再実行してください。"
                });
            } else {
                appendLog(`測定先一覧の取得エラー: ${cErr?.message ?? String(err)}`);
            }
        } finally {
            setLoadingServers(false);
        }
    }, [running, consentArgs, appendLog]);

    // 初期化時に CLI のチェック
    useEffect(() => {
        void checkCli();
    }, [checkCli]);

    // CLI が利用可能で同意済みならサーバー一覧を取得
    useEffect(() => {
        if (cliAvailable && hasConsent) {
            void loadServers();
        }
    }, [cliAvailable, hasConsent, loadServers]);

    // 同意ボタン押下
    const handleConsent = useCallback(() => {
        try {
            window.localStorage.setItem(CONSENT_KEY, "yes");
        } catch {
            /* ignore */
        }
        setHasConsent(true);
        setAlert(null);
    }, []);

    // 速度測定を開始（CLI を JSONL 出力モードで起動し、進捗と結果を逐次処理する）
    const handleRunTest = useCallback(() => {
        if (running || !cliAvailable) return;
        if (!hasConsent) return;

        if (selectedServerId !== "" && !isValidServerId(selectedServerId)) {
            setAlert({
                variant: AlertVariant.danger,
                title: "測定先の指定が不正です",
                body: "測定先サーバーを一覧から選び直してください。"
            });
            return;
        }

        const runId = ++runSeqRef.current;
        cancelledRef.current = false;
        setAlert(null);
        setResult(null);
        setLogs("");
        setRunning(true);
        setProgressPhase("測定先へ接続中…");
        setProgressPercent(null);
        setProgressDetail("");

        const args = ["speedtest", "--format=jsonl", "--progress=yes", ...consentArgs()];
        if (selectedServerId !== "") {
            args.push(`--server-id=${selectedServerId}`);
        }

        // ストリーム受信のバッファと結果受信フラグ
        let buffer = "";
        let sawResult = false;
        const rawLines: string[] = [];
        // 古い実行のコールバックが最新状態を更新しないようにするガード
        const isActiveRun = () => runSeqRef.current === runId && !cancelledRef.current;

        // 受信した JSONL 1行をイベント種別ごとに処理する
        const handleLine = (line: string) => {
            if (!line || !isActiveRun()) return;
            rawLines.push(line);
            const event = parseJsonlLine(line);
            if (!event) return;

            if (event.kind === "ping") {
                // 遅延計測フェーズの進捗を反映
                const latency = event.data.ping?.latency;
                setProgressPhase("遅延を測定中…");
                setProgressPercent(
                    typeof event.progress === "number" ? Math.round(event.progress * 100) : null
                );
                setProgressDetail(latency !== undefined ? `遅延: ${formatMs(latency)} ms` : "");
            } else if (event.kind === "download") {
                // ダウンロード計測フェーズの進捗と現在速度を反映
                setProgressPhase("ダウンロード速度を測定中…");
                setProgressPercent(
                    typeof event.progress === "number" ? Math.round(event.progress * 100) : null
                );
                setProgressDetail(
                    event.bandwidth !== null ? `現在: ${formatMbps(event.bandwidth)} Mbps` : ""
                );
            } else if (event.kind === "upload") {
                // アップロード計測フェーズの進捗と現在速度を反映
                setProgressPhase("アップロード速度を測定中…");
                setProgressPercent(
                    typeof event.progress === "number" ? Math.round(event.progress * 100) : null
                );
                setProgressDetail(
                    event.bandwidth !== null ? `現在: ${formatMbps(event.bandwidth)} Mbps` : ""
                );
            } else if (event.kind === "result") {
                // 最終結果を整形して表示・履歴へ保存
                sawResult = true;
                const summary = summarizeResult(event.data);
                if (summary) {
                    setResult(summary);
                    handleAddHistory(summary);
                }
            } else if (event.kind === "log") {
                appendLog(`[log] ${event.data.message || JSON.stringify(event.data)}`);
            } else if (event.kind === "error") {
                appendLog(`[error] ${event.data.message || JSON.stringify(event.data)}`);
            }
        };

        const proc = cockpit.spawn(args, { superuser: "try", err: "out" });
        currentProcRef.current = proc;

        proc.stream((chunk: string) => {
            if (runSeqRef.current !== runId || cancelledRef.current) return;
            buffer += chunk;
            let idx: number;
            while ((idx = buffer.indexOf("\n")) >= 0) {
                handleLine(buffer.slice(0, idx).trim());
                buffer = buffer.slice(idx + 1);
            }
        });

        proc.then(() => {
            if (runSeqRef.current !== runId || cancelledRef.current) return;
            if (buffer.trim()) handleLine(buffer.trim());
            if (!sawResult) {
                setAlert({
                    variant: AlertVariant.danger,
                    title: "測定に失敗しました",
                    body: "結果を取得できませんでした。詳細は下のログを確認してください。"
                });
                appendLog(`CLI の出力:\n${rawLines.join("\n")}`);
            } else {
                setAlert({
                    variant: AlertVariant.success,
                    title: "測定が完了しました"
                });
            }
        })
            .catch((err: unknown) => {
                if (runSeqRef.current !== runId || cancelledRef.current) return;
                if (buffer.trim()) handleLine(buffer.trim());
                if (!sawResult) {
                    const cErr: CockpitError | null = isCockpitError(err) ? err : null;
                    const kind = classifyError(cErr?.problem, `${rawLines.join("\n")} ${cErr?.message ?? ""}`);
                    if (kind === "license") {
                        setHasConsent(false);
                        try {
                            window.localStorage.removeItem(CONSENT_KEY);
                        } catch {
                            /* ignore */
                        }
                        setAlert({
                            variant: AlertVariant.warning,
                            title: "Ookla の利用条件への同意が必要です",
                            body: "同意が確認できませんでした。利用条件を確認し、同意してから再実行してください。"
                        });
                    } else if (kind === "network") {
                        setAlert({
                            variant: AlertVariant.danger,
                            title: "測定に失敗しました（接続エラー）",
                            body: "測定先へ接続できなかった可能性があります。別の測定先／自動選択で再試行してください。"
                        });
                    } else {
                        setAlert({
                            variant: AlertVariant.danger,
                            title: "測定に失敗しました",
                            body: "測定が失敗したか、中断されました。詳細は下のログを確認してください。"
                        });
                    }
                    appendLog(rawLines.join("\n"));
                }
            })
            .finally(() => {
                if (runSeqRef.current !== runId) return;
                currentProcRef.current = null;
                setRunning(false);
            });
    }, [running, cliAvailable, hasConsent, selectedServerId, consentArgs, appendLog, handleAddHistory]);

    // 測定を中断
    const handleCancelTest = useCallback(() => {
        if (currentProcRef.current && typeof currentProcRef.current.close === "function") {
            cancelledRef.current = true;
            try {
                currentProcRef.current.close(true);
            } catch {
                /* ignore */
            }
            setAlert({
                variant: AlertVariant.warning,
                title: "測定を中断しました"
            });
            currentProcRef.current = null;
            setRunning(false);
        }
    }, []);

    const handleCloseAlert = useCallback(() => {
        setAlert(null);
    }, []);

    return (
        <Page>
            <PageSection>
                <div style={{ maxWidth: "960px", margin: "0 auto" }}>
                    <header style={{ marginBottom: "1.5rem" }}>
                        <Title headingLevel="h1" size="2xl" style={{ marginBottom: "0.5rem" }}>
                            インターネット速度テスト
                        </Title>
                        <p style={{ lineHeight: 1.6, color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                            この測定は、<strong>Cockpitを動かしているサーバー自身</strong>から
                            インターネット上の測定先（Ookla Speedtest）までの通信速度を測るものです。
                            この画面を開いているPC自身の速度は測りません。
                        </p>
                    </header>

                    <AlertArea alert={alert} onClose={handleCloseAlert} />

                    {cliAvailable === false && (
                        <NotInstalledCard
                            detectedVersion={cliVersion}
                            onRecheck={checkCli}
                            checking={checkingCli}
                        />
                    )}

                    {cliAvailable === true && !hasConsent && (
                        <ConsentCard onConsent={handleConsent} />
                    )}

                    {cliAvailable === true && hasConsent && (
                        <Tabs
                            activeKey={activeTabKey}
                            onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}
                            style={{ marginBottom: "1.5rem" }}
                        >
                            <Tab eventKey="measure" title={<TabTitleText>測定</TabTitleText>}>
                                <div style={{ paddingTop: "1.5rem" }}>
                                    <MeasurementCard
                                        cliVersion={cliVersion}
                                        servers={servers}
                                        selectedServerId={selectedServerId}
                                        onSelectServerId={setSelectedServerId}
                                        serversStatus={serversStatus}
                                        loadingServers={loadingServers}
                                        onRefreshServers={loadServers}
                                        running={running}
                                        onRunTest={handleRunTest}
                                        onCancelTest={handleCancelTest}
                                        progressPhase={progressPhase}
                                        progressPercent={progressPercent}
                                        progressDetail={progressDetail}
                                    />
                                    <ResultCard result={result} />
                                    <LogDetails logs={logs} />
                                </div>
                            </Tab>
                            <Tab
                                eventKey="history"
                                title={<TabTitleText>{`測定履歴 (${history.length})`}</TabTitleText>}
                            >
                                <div style={{ paddingTop: "1.5rem" }}>
                                    <HistoryCard
                                        history={history}
                                        onClearHistory={handleClearHistory}
                                        onDeleteEntry={handleDeleteHistoryEntry}
                                    />
                                </div>
                            </Tab>
                            <Tab eventKey="settings" title={<TabTitleText>設定</TabTitleText>}>
                                <div style={{ paddingTop: "1.5rem" }}>
                                    <SettingsCard
                                        config={config}
                                        onSaveConfig={handleSaveConfig}
                                        onNotify={handleNotify}
                                    />
                                </div>
                            </Tab>
                        </Tabs>
                    )}

                    {(!cliAvailable || !hasConsent) && <LogDetails logs={logs} />}
                </div>
            </PageSection>
        </Page>
    );
};
export default App;
