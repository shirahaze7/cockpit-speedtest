/*
 * index.js — Cockpit 画面の制御。
 * サーバー上で Ookla Speedtest CLI を cockpit.spawn() で実行する。
 * コマンドは必ず引数配列で渡し、シェルを介さない。
 */
(function () {
    "use strict";

    var Core = window.SpeedtestCore;
    var CONSENT_KEY = "cockpit-speedtest.consent-v1";

    var el = {};
    var running = false;
    var currentProc = null;
    var cliAvailable = false;

    function $(id) { return document.getElementById(id); }

    function show(node) { node.classList.remove("st-hidden"); }
    function hide(node) { node.classList.add("st-hidden"); }

    function setAlert(kind, title, body) {
        var area = el.alertArea;
        area.innerHTML = "";
        if (!kind)
            return;
        var div = document.createElement("div");
        div.className = "st-alert st-alert-" + kind;
        var strong = document.createElement("strong");
        strong.textContent = title;
        div.appendChild(strong);
        if (body) {
            var p = document.createElement("p");
            p.textContent = body;
            div.appendChild(p);
        }
        area.appendChild(div);
    }

    function log(text) {
        show(el.logDetails);
        el.logOutput.textContent += text + "\n";
    }

    function hasConsent() {
        try {
            return window.localStorage.getItem(CONSENT_KEY) === "yes";
        } catch (e) {
            return false;
        }
    }

    function saveConsent() {
        try {
            window.localStorage.setItem(CONSENT_KEY, "yes");
        } catch (e) { /* 保存できなくても、この画面の間は同意済みとして扱う */ }
    }

    function clearConsent() {
        try {
            window.localStorage.removeItem(CONSENT_KEY);
        } catch (e) { /* ignore */ }
    }

    /* 同意済みのときだけ CLI に渡す引数。同意は利用者の明示操作でのみ行う。 */
    function consentArgs() {
        return hasConsent() ? ["--accept-license", "--accept-gdpr"] : [];
    }

    function refreshGate() {
        if (!cliAvailable) {
            show(el.notInstalled);
            hide(el.consentCard);
            hide(el.controlCard);
            return;
        }
        hide(el.notInstalled);
        if (!hasConsent()) {
            show(el.consentCard);
            hide(el.controlCard);
        } else {
            hide(el.consentCard);
            show(el.controlCard);
        }
    }

    function setRunning(value) {
        running = value;
        el.runButton.disabled = value;
        el.refreshServersButton.disabled = value;
        el.serverSelect.disabled = value;
        el.cancelButton.disabled = !value;
        if (value)
            show(el.progressArea);
        else
            hide(el.progressArea);
    }

    function setProgress(phase, ratio, detail) {
        el.progressPhase.textContent = phase;
        if (typeof ratio === "number") {
            var pct = Math.max(0, Math.min(100, Math.round(ratio * 100)));
            el.progressBar.style.width = pct + "%";
            el.progressBarWrap.setAttribute("aria-valuenow", String(pct));
        }
        el.progressDetail.textContent = detail || "";
    }

    function errorMessage(err) {
        if (!err)
            return "";
        return err.message || err.problem || String(err);
    }

    function reportFailure(context, err, rawText) {
        var kind = Core.classifyError(err && err.problem, (rawText || "") + " " + errorMessage(err));
        if (kind === "not-installed") {
            cliAvailable = false;
            setAlert("danger", "Ookla Speedtest CLI が見つかりません",
                     "サーバーに speedtest コマンドがインストールされていないため、測定できません。下の案内に従って導入してください。");
        } else if (kind === "license") {
            clearConsent();
            setAlert("warning", "Ookla の利用条件への同意が必要です",
                     "同意が CLI 側で確認できませんでした。利用条件を確認し、画面の手順で同意してから再実行してください。");
        } else if (kind === "network") {
            setAlert("danger", context + "に失敗しました（接続エラー）",
                     "選択した測定先へ接続できなかった可能性があります。時間を置くか、別の測定先／自動選択で再試行してください。詳細は下のログを確認してください。");
        } else {
            setAlert("danger", context + "に失敗しました",
                     "測定が失敗したか、中断されました。詳細は下のログを確認してください。");
        }
        if (rawText)
            log(rawText);
        refreshGate();
    }

    /* CLI の有無とバージョンを確認する */
    function checkCli() {
        setAlert(null);
        cockpit.spawn(["speedtest", "--version"], { err: "out" })
                .then(function (output) {
                    cliAvailable = true;
                    var firstLine = String(output).split(/\r?\n/)[0] || "";
                    el.cliVersion.textContent = firstLine ? "検出された CLI: " + firstLine : "";
                    refreshGate();
                    if (hasConsent())
                        loadServers();
                })
                .catch(function (err) {
                    cliAvailable = false;
                    if (Core.classifyError(err && err.problem, errorMessage(err)) !== "not-installed")
                        log("speedtest --version: " + errorMessage(err));
                    refreshGate();
                });
    }

    /* 測定先一覧を取得する */
    function loadServers() {
        if (!cliAvailable || running)
            return;
        el.serversStatus.textContent = "測定先一覧を取得中…";
        el.refreshServersButton.disabled = true;

        var args = ["speedtest", "--servers", "--format=json"].concat(consentArgs());
        cockpit.spawn(args, { superuser: "try", err: "out" })
                .then(function (output) {
                    var servers = Core.parseServerList(output);
                    fillServerSelect(servers);
                    el.serversStatus.textContent = servers.length
                        ? servers.length + " 件の測定先を取得しました"
                        : "測定先一覧が空でした。自動選択でも測定できます。";
                })
                .catch(function (err, output) {
                    el.serversStatus.textContent = "測定先一覧を取得できませんでした。自動選択でも測定できます。";
                    reportFailure("測定先一覧の取得", err, output);
                })
                .always(function () {
                    el.refreshServersButton.disabled = running;
                });
    }

    function fillServerSelect(servers) {
        var previous = el.serverSelect.value;
        el.serverSelect.innerHTML = "";
        var auto = document.createElement("option");
        auto.value = "";
        auto.textContent = "自動選択（最も近い測定先）";
        el.serverSelect.appendChild(auto);
        servers.forEach(function (server) {
            if (!Core.isValidServerId(server.id))
                return;
            var opt = document.createElement("option");
            opt.value = server.id;
            opt.textContent = Core.serverLabel(server);
            el.serverSelect.appendChild(opt);
        });
        if (previous && Core.isValidServerId(previous))
            el.serverSelect.value = previous;
    }

    /* 速度測定を実行する */
    function runTest() {
        if (running || !cliAvailable)
            return;
        if (!hasConsent()) {
            refreshGate();
            return;
        }

        var serverId = el.serverSelect.value;
        if (serverId !== "" && !Core.isValidServerId(serverId)) {
            setAlert("danger", "測定先の指定が不正です",
                     "測定先サーバーを一覧から選び直してください。");
            return;
        }

        setAlert(null);
        hide(el.resultCard);
        el.logOutput.textContent = "";
        hide(el.logDetails);
        setRunning(true);
        setProgress("測定先へ接続中…", 0, "");

        var args = ["speedtest", "--format=jsonl", "--progress=yes"].concat(consentArgs());
        if (serverId !== "")
            args.push("--server-id", serverId);

        var buffer = "";
        var sawResult = false;
        var rawLines = [];

        function handleLine(line) {
            if (!line)
                return;
            rawLines.push(line);
            var event = Core.parseJsonlLine(line);
            if (!event)
                return;
            if (event.kind === "ping") {
                setProgress("遅延を測定中…", event.progress,
                            event.data.ping ? "遅延: " + Core.formatMs(event.data.ping.latency) + " ms" : "");
            } else if (event.kind === "download") {
                setProgress("ダウンロード速度を測定中…", event.progress,
                            event.bandwidth !== null ? "現在: " + Core.formatMbps(event.bandwidth) + " Mbps" : "");
            } else if (event.kind === "upload") {
                setProgress("アップロード速度を測定中…", event.progress,
                            event.bandwidth !== null ? "現在: " + Core.formatMbps(event.bandwidth) + " Mbps" : "");
            } else if (event.kind === "result") {
                sawResult = true;
                showResult(event.data);
            } else if (event.kind === "log") {
                log("[log] " + (event.data.message || JSON.stringify(event.data)));
            } else if (event.kind === "error") {
                log("[error] " + (event.data.message || JSON.stringify(event.data)));
            }
        }

        var proc = cockpit.spawn(args, { superuser: "try", err: "out" });
        currentProc = proc;
        proc.stream(function (chunk) {
            buffer += chunk;
            var idx;
            while ((idx = buffer.indexOf("\n")) >= 0) {
                handleLine(buffer.slice(0, idx).trim());
                buffer = buffer.slice(idx + 1);
            }
        });
        proc.then(function () {
            if (buffer.trim())
                handleLine(buffer.trim());
            if (!sawResult) {
                reportFailure("測定", null,
                              "結果を取得できませんでした。CLI の出力:\n" + rawLines.join("\n"));
            } else {
                setAlert("success", "測定が完了しました", "");
            }
        }).catch(function (err, output) {
            if (buffer.trim())
                handleLine(buffer.trim());
            if (!sawResult)
                reportFailure("測定", err, output || rawLines.join("\n"));
        }).always(function () {
            currentProc = null;
            setRunning(false);
        });
    }

    function showResult(result) {
        var s = Core.summarizeResult(result);
        if (!s)
            return;
        el.resultDownload.textContent = s.downloadMbps;
        el.resultUpload.textContent = s.uploadMbps;
        el.resultPing.textContent = s.pingMs;
        el.resultServer.textContent =
            (s.serverName || "（名称不明）") +
            (s.serverLocation ? " — " + s.serverLocation : "") +
            (s.serverId ? " (id: " + s.serverId + ")" : "");
        el.resultSponsor.textContent = s.serverSponsor || "–";
        el.resultTimestamp.textContent = s.timestamp
            ? new Date(s.timestamp).toLocaleString()
            : new Date().toLocaleString();
        if (s.resultUrl) {
            var a = document.createElement("a");
            a.href = s.resultUrl;
            a.textContent = s.resultUrl;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            el.resultUrl.innerHTML = "";
            el.resultUrl.appendChild(a);
        } else {
            el.resultUrl.textContent = "–";
        }
        show(el.resultCard);
    }

    function cancelTest() {
        if (currentProc && typeof currentProc.close === "function") {
            try {
                currentProc.close(true);
            } catch (e) { /* ignore */ }
            setAlert("warning", "測定を中断しました", "");
            currentProc = null;
            setRunning(false);
        }
    }

    function init() {
        el.alertArea = $("alert-area");
        el.notInstalled = $("not-installed");
        el.consentCard = $("consent-card");
        el.controlCard = $("control-card");
        el.cliVersion = $("cli-version");
        el.serverSelect = $("server-select");
        el.refreshServersButton = $("refresh-servers-button");
        el.serversStatus = $("servers-status");
        el.runButton = $("run-button");
        el.cancelButton = $("cancel-button");
        el.progressArea = $("progress-area");
        el.progressPhase = $("progress-phase");
        el.progressBar = $("progress-bar");
        el.progressBarWrap = $("progress-bar-wrap");
        el.progressDetail = $("progress-detail");
        el.resultCard = $("result-card");
        el.resultDownload = $("result-download");
        el.resultUpload = $("result-upload");
        el.resultPing = $("result-ping");
        el.resultServer = $("result-server");
        el.resultSponsor = $("result-sponsor");
        el.resultTimestamp = $("result-timestamp");
        el.resultUrl = $("result-url");
        el.logDetails = $("log-details");
        el.logOutput = $("log-output");
        el.consentCheckbox = $("consent-checkbox");
        el.consentButton = $("consent-button");

        $("recheck-button").addEventListener("click", checkCli);
        el.refreshServersButton.addEventListener("click", loadServers);
        el.runButton.addEventListener("click", runTest);
        el.cancelButton.addEventListener("click", cancelTest);
        el.consentCheckbox.addEventListener("change", function () {
            el.consentButton.disabled = !el.consentCheckbox.checked;
        });
        el.consentButton.addEventListener("click", function () {
            if (!el.consentCheckbox.checked)
                return;
            saveConsent();
            setAlert(null);
            refreshGate();
            loadServers();
        });

        refreshGate();
        checkCli();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
