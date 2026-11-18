import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertVariant, Page, PageSection, Title } from "@patternfly/react-core";
import cockpit, { type CockpitError, type SpawnPromise } from "cockpit";

import { AlertArea, type AlertState } from "./components/AlertArea";
import { NotInstalledCard } from "./components/NotInstalledCard";
import { ConsentCard } from "./components/ConsentCard";
import { MeasurementCard } from "./components/MeasurementCard";
import { ResultCard } from "./components/ResultCard";
import { LogDetails } from "./components/LogDetails";

import type { FormattedResult, SpeedtestServer } from "./types/speedtest";
import {
    classifyError,
    formatMbps,
    formatMs,
    isValidServerId,
    parseJsonlLine,
    parseServerList,
    summarizeResult
} from "./lib/speedtestCore";

const CONSENT_KEY = "cockpit-speedtest.consent-v1";

export const App: React.FC = () => {
    // 状態
    const [cliAvailable, setCliAvailable] = useState<boolean | null>(null);
    const [checkingCli, setCheckingCli] = useState(false);
    const [cliVersion, setCliVersion] = useState("");
    const [hasConsent, setHasConsent] = useState(() => {
        try {
            return window.localStorage.getItem(CONSENT_KEY) === "yes";
        } catch {
            return false;
        }
    });

    const [servers, setServers] = useState<SpeedtestServer[]>([]);
    const [selectedServerId, setSelectedServerId] = useState("");
    const [serversStatus, setServersStatus] = useState("");
    const [loadingServers, setLoadingServers] = useState(false);

    const [running, setRunning] = useState(false);
    const [progressPhase, setProgressPhase] = useState("");
    const [progressPercent, setProgressPercent] = useState<number | null>(null);
    const [progressDetail, setProgressDetail] = useState("");

    const [result, setResult] = useState<FormattedResult | null>(null);
    const [alert, setAlert] = useState<AlertState | null>(null);
    const [logs, setLogs] = useState("");

    const currentProcRef = useRef<SpawnPromise | null>(null);
    const cancelledRef = useRef(false);

    const appendLog = useCallback((text: string) => {
        setLogs((prev) => (prev ? `${prev}\n${text}` : text));
    }, []);

    const consentArgs = useCallback((): string[] => {
        return hasConsent ? ["--accept-license", "--accept-gdpr"] : [];
    }, [hasConsent]);

    // CLI の有無とバージョンを確認する
    const checkCli = useCallback(async () => {
        setAlert(null);
        setCheckingCli(true);
        try {
            const output = await cockpit.spawn(["speedtest", "--version"], { err: "out" });
            setCliAvailable(true);
            const firstLine = String(output).split(/\r?\n/)[0] || "";
            setCliVersion(firstLine);
        } catch (err: unknown) {
            setCliAvailable(false);
            const cErr = err as CockpitError;
            if (classifyError(cErr?.problem, cErr?.message) !== "not-installed") {
                appendLog(`speedtest --version: ${cErr?.message || String(err)}`);
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
                list.length
                    ? `${list.length} 件の測定先を取得しました`
                    : "測定先一覧が空でした。自動選択でも測定できます。"
            );
        } catch (err: unknown) {
            const cErr = err as CockpitError;
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
                appendLog(`測定先一覧の取得エラー: ${cErr?.message || String(err)}`);
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

    // 速度測定を開始
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

        let buffer = "";
        let sawResult = false;
        const rawLines: string[] = [];

        const handleLine = (line: string) => {
            if (!line) return;
            rawLines.push(line);
            const event = parseJsonlLine(line);
            if (!event) return;

            if (event.kind === "ping") {
                const latency = event.data.ping?.latency;
                setProgressPhase("遅延を測定中…");
                setProgressPercent(
                    typeof event.progress === "number" ? Math.round(event.progress * 100) : null
                );
                setProgressDetail(latency !== undefined ? `遅延: ${formatMs(latency)} ms` : "");
            } else if (event.kind === "download") {
                setProgressPhase("ダウンロード速度を測定中…");
                setProgressPercent(
                    typeof event.progress === "number" ? Math.round(event.progress * 100) : null
                );
                setProgressDetail(
                    event.bandwidth !== null ? `現在: ${formatMbps(event.bandwidth)} Mbps` : ""
                );
            } else if (event.kind === "upload") {
                setProgressPhase("アップロード速度を測定中…");
                setProgressPercent(
                    typeof event.progress === "number" ? Math.round(event.progress * 100) : null
                );
                setProgressDetail(
                    event.bandwidth !== null ? `現在: ${formatMbps(event.bandwidth)} Mbps` : ""
                );
            } else if (event.kind === "result") {
                sawResult = true;
                const summary = summarizeResult(event.data);
                if (summary) setResult(summary);
            } else if (event.kind === "log") {
                appendLog(`[log] ${event.data.message || JSON.stringify(event.data)}`);
            } else if (event.kind === "error") {
                appendLog(`[error] ${event.data.message || JSON.stringify(event.data)}`);
            }
        };

        const proc = cockpit.spawn(args, { superuser: "try", err: "out" });
        currentProcRef.current = proc;

        proc.stream((chunk: string) => {
            buffer += chunk;
            let idx: number;
            while ((idx = buffer.indexOf("\n")) >= 0) {
                handleLine(buffer.slice(0, idx).trim());
                buffer = buffer.slice(idx + 1);
            }
        });

        proc.then(() => {
            if (cancelledRef.current) return;
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
                if (cancelledRef.current) return;
                if (buffer.trim()) handleLine(buffer.trim());
                if (!sawResult) {
                    const cErr = err as CockpitError;
                    const kind = classifyError(cErr?.problem, `${rawLines.join("\n")} ${cErr?.message || ""}`);
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
                currentProcRef.current = null;
                setRunning(false);
            });
    }, [running, cliAvailable, hasConsent, selectedServerId, consentArgs, appendLog]);

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

    return (
        <Page>
            <PageSection>
                <div style={{ maxWidth: "960px", margin: "0 auto" }}>
                    <header style={{ marginBottom: "1.5rem" }}>
                        <Title headingLevel="h1" size="2xl" style={{ marginBottom: "0.5rem" }}>
                            インターネット速度テスト
                        </Title>
                        <p style={{ lineHeight: 1.6, color: "var(--pf-t--global--text--color--subtle, #6a6e73)" }}>
                            この測定は、<strong>Cockpitを動かしているサーバー自身</strong>から
                            インターネット上の測定先（Ookla Speedtest）までの通信速度を測るものです。
                            この画面を開いているPC自身の速度は測りません。
                        </p>
                    </header>

                    <AlertArea alert={alert} />

                    {cliAvailable === false && (
                        <NotInstalledCard onRecheck={checkCli} checking={checkingCli} />
                    )}

                    {cliAvailable === true && !hasConsent && (
                        <ConsentCard onConsent={handleConsent} />
                    )}

                    {cliAvailable === true && hasConsent && (
                        <>
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
                        </>
                    )}

                    <LogDetails logs={logs} />
                </div>
            </PageSection>
        </Page>
    );
};
export default App;
