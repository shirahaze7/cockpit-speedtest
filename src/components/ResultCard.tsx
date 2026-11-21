// 最新の測定結果をカード形式で表示するコンポーネント
import React from "react";
import {
    Card,
    CardBody,
    CardTitle,
    DescriptionList,
    DescriptionListDescription,
    DescriptionListGroup,
    DescriptionListTerm,
    Divider,
    Flex,
    FlexItem
} from "@patternfly/react-core";
import type { FormattedResult } from "../types/speedtest";

interface ResultCardProps {
    readonly result: FormattedResult | null;
}

export const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
    // 結果が未取得の場合は表示しない
    if (!result) return null;

    const formattedDate = (() => {
        if (!result.timestamp) return "–";
        const d = new Date(result.timestamp);
        return Number.isNaN(d.getTime()) ? result.timestamp : d.toLocaleString();
    })();

    const isSafeUrl = Boolean(result.resultUrl && /^https?:\/\//i.test(result.resultUrl));

    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardTitle>測定結果</CardTitle>
            <CardBody>
                <Flex spaceItems={{ default: "spaceItemsXl" }} style={{ marginBottom: "1.5rem" }}>
                    <FlexItem>
                        <div style={{ fontSize: "0.875rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                            ダウンロード
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
                            {result.downloadMbps}{" "}
                            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                Mbps
                            </span>
                        </div>
                    </FlexItem>
                    <FlexItem>
                        <div style={{ fontSize: "0.875rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                            アップロード
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
                            {result.uploadMbps}{" "}
                            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                Mbps
                            </span>
                        </div>
                    </FlexItem>
                    <FlexItem>
                        <div style={{ fontSize: "0.875rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                            遅延 (Ping)
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1.2 }}>
                            {result.pingMs}{" "}
                            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                ms
                            </span>
                        </div>
                    </FlexItem>
                </Flex>

                <Divider style={{ marginBottom: "1.5rem" }} />

                <DescriptionList isHorizontal isCompact>
                    <DescriptionListGroup>
                        <DescriptionListTerm>測定先</DescriptionListTerm>
                        <DescriptionListDescription>
                            {(result.serverName || "（名称不明）") +
                                (result.serverLocation ? ` — ${result.serverLocation}` : "") +
                                (result.serverId ? ` (id: ${result.serverId})` : "")}
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>運営元</DescriptionListTerm>
                        <DescriptionListDescription>{result.serverSponsor || "–"}</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>測定日時</DescriptionListTerm>
                        <DescriptionListDescription>{formattedDate}</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                        <DescriptionListTerm>結果URL</DescriptionListTerm>
                        <DescriptionListDescription>
                            {isSafeUrl ? (
                                <a href={result.resultUrl} target="_blank" rel="noopener noreferrer">
                                    {result.resultUrl}
                                </a>
                            ) : (
                                result.resultUrl || "–"
                            )}
                        </DescriptionListDescription>
                    </DescriptionListGroup>
                </DescriptionList>
            </CardBody>
        </Card>
    );
};
