import React from "react";
import {
    ActionGroup,
    Button,
    Card,
    CardBody,
    CardTitle,
    Form,
    FormGroup,
    FormSelect,
    FormSelectOption,
    Progress,
    ProgressMeasureLocation
} from "@patternfly/react-core";
import type { SpeedtestServer } from "../types/speedtest";
import { serverLabel } from "../lib/speedtestCore";

interface MeasurementCardProps {
    readonly cliVersion: string;
    readonly servers: readonly SpeedtestServer[];
    readonly selectedServerId: string;
    readonly onSelectServerId: (id: string) => void;
    readonly serversStatus: string;
    readonly loadingServers: boolean;
    readonly onRefreshServers: () => void;
    readonly running: boolean;
    readonly onRunTest: () => void;
    readonly onCancelTest: () => void;
    readonly progressPhase: string;
    readonly progressPercent: number | null;
    readonly progressDetail: string;
}

export const MeasurementCard: React.FC<MeasurementCardProps> = ({
    cliVersion,
    servers,
    selectedServerId,
    onSelectServerId,
    serversStatus,
    loadingServers,
    onRefreshServers,
    running,
    onRunTest,
    onCancelTest,
    progressPhase,
    progressPercent,
    progressDetail
}) => {
    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardTitle>測定</CardTitle>
            <CardBody>
                {cliVersion && (
                    <p style={{ color: "var(--pf-v5-global--Color--200, #6a6e73)", marginBottom: "1rem" }}>
                        検出された CLI: {cliVersion}
                    </p>
                )}

                <Form style={{ marginBottom: "1.5rem" }}>
                    <FormGroup label="測定先サーバー" fieldId="server-select">
                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                            <FormSelect
                                id="server-select"
                                value={selectedServerId}
                                onChange={(_event, value) => onSelectServerId(value)}
                                isDisabled={running}
                                style={{ minWidth: "min(480px, 100%)" }}
                            >
                                <FormSelectOption key="auto" value="" label="自動選択（最も近い測定先）" />
                                {servers.map((s) => (
                                    <FormSelectOption key={s.id} value={s.id} label={serverLabel(s)} />
                                ))}
                            </FormSelect>
                            <Button
                                variant="secondary"
                                onClick={onRefreshServers}
                                isDisabled={running || loadingServers}
                                isLoading={loadingServers}
                            >
                                一覧を更新
                            </Button>
                        </div>
                        {serversStatus && (
                            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                {serversStatus}
                            </p>
                        )}
                    </FormGroup>

                    <ActionGroup>
                        <Button variant="primary" onClick={onRunTest} isDisabled={running}>
                            測定を開始
                        </Button>
                        <Button variant="danger" onClick={onCancelTest} isDisabled={!running}>
                            中断
                        </Button>
                    </ActionGroup>
                </Form>

                {running && (
                    <div style={{ marginTop: "1.5rem" }}>
                        <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{progressPhase}</p>
                        <Progress
                            value={progressPercent ?? 0}
                            title={progressPhase}
                            measureLocation={progressPercent !== null ? ProgressMeasureLocation.outside : ProgressMeasureLocation.none}
                        />
                        {progressDetail && (
                            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                {progressDetail}
                            </p>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
