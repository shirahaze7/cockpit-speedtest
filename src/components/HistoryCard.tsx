import React, { useState } from "react";
import {
    Button,
    Card,
    CardBody,
    CardTitle,
    DescriptionList,
    DescriptionListDescription,
    DescriptionListGroup,
    DescriptionListTerm,
    Divider,
    EmptyState,
    EmptyStateBody,
    Flex,
    FlexItem,
    Modal,
    ModalVariant,
    Pagination
} from "@patternfly/react-core";
import { TrashIcon, ExternalLinkAltIcon } from "@patternfly/react-icons";
import { formatTimestamp, type HistoryEntry } from "../lib/historyStorage";

interface HistoryCardProps {
    readonly history: readonly HistoryEntry[];
    readonly onClearHistory: () => void;
    readonly onDeleteEntry: (id: string) => void;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({
    history,
    onClearHistory,
    onDeleteEntry
}) => {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    const onSetPage = (_event: React.MouseEvent | React.KeyboardEvent | MouseEvent, newPage: number) => {
        setPage(newPage);
    };

    const onPerPageSelect = (
        _event: React.MouseEvent | React.KeyboardEvent | MouseEvent,
        newPerPage: number
    ) => {
        setPerPage(newPerPage);
        setPage(1);
    };

    const totalCount = history.length;
    const startIndex = (page - 1) * perPage;
    const paginatedEntries = history.slice(startIndex, startIndex + perPage);

    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardTitle>
                <Flex justifyContent={{ default: "justifyContentSpaceBetween" }} alignItems={{ default: "alignItemsCenter" }}>
                    <FlexItem>
                        <span>測定履歴 ({totalCount} 件)</span>
                    </FlexItem>
                    {totalCount > 0 && (
                        <FlexItem>
                            <Button
                                variant="danger"
                                isInline
                                icon={<TrashIcon />}
                                onClick={() => setIsClearModalOpen(true)}
                            >
                                履歴をすべて削除
                            </Button>
                        </FlexItem>
                    )}
                </Flex>
            </CardTitle>
            <CardBody>
                {totalCount === 0 ? (
                    <EmptyState>
                        <EmptyStateBody>測定履歴はまだありません。「測定」タブから速度テストを実行してください。</EmptyStateBody>
                    </EmptyState>
                ) : (
                    <>
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {paginatedEntries.map((entry) => {
                                const isSafeUrl = Boolean(
                                    entry.resultUrl && /^https?:\/\//i.test(entry.resultUrl)
                                );
                                return (
                                    <div
                                        key={entry.id}
                                        style={{
                                            border: "1px solid var(--pf-v5-global--BorderColor--100, #d2d2d2)",
                                            borderRadius: "4px",
                                            padding: "1rem",
                                            backgroundColor: "var(--pf-v5-global--BackgroundColor--100, #fff)"
                                        }}
                                    >
                                        <Flex
                                            justifyContent={{ default: "justifyContentSpaceBetween" }}
                                            alignItems={{ default: "alignItemsFlexStart" }}
                                            style={{ marginBottom: "0.75rem" }}
                                        >
                                            <Flex spaceItems={{ default: "spaceItemsXl" }}>
                                                <FlexItem>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                                        ダウンロード
                                                    </div>
                                                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--pf-v5-global--primary-color--100, #0066cc)" }}>
                                                        {entry.downloadMbps}{" "}
                                                        <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                                            Mbps
                                                        </span>
                                                    </div>
                                                </FlexItem>
                                                <FlexItem>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                                        アップロード
                                                    </div>
                                                    <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                                                        {entry.uploadMbps}{" "}
                                                        <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                                            Mbps
                                                        </span>
                                                    </div>
                                                </FlexItem>
                                                <FlexItem>
                                                    <div style={{ fontSize: "0.75rem", color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                                        遅延 (Ping)
                                                    </div>
                                                    <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
                                                        {entry.pingMs}{" "}
                                                        <span style={{ fontSize: "0.875rem", fontWeight: 400, color: "var(--pf-v5-global--Color--200, #6a6e73)" }}>
                                                            ms
                                                        </span>
                                                    </div>
                                                </FlexItem>
                                            </Flex>
                                            <Button
                                                variant="plain"
                                                aria-label="削除"
                                                onClick={() => onDeleteEntry(entry.id)}
                                                title="この履歴を削除"
                                            >
                                                <TrashIcon />
                                            </Button>
                                        </Flex>

                                        <Divider style={{ marginBottom: "0.75rem" }} />

                                        <DescriptionList isHorizontal isCompact>
                                            <DescriptionListGroup>
                                                <DescriptionListTerm>測定日時</DescriptionListTerm>
                                                <DescriptionListDescription>{formatTimestamp(entry.timestamp)}</DescriptionListDescription>
                                            </DescriptionListGroup>
                                            <DescriptionListGroup>
                                                <DescriptionListTerm>測定先</DescriptionListTerm>
                                                <DescriptionListDescription>
                                                    {(entry.serverName || "（名称不明）") +
                                                        (entry.serverLocation ? ` — ${entry.serverLocation}` : "") +
                                                        (entry.serverId ? ` (id: ${entry.serverId})` : "")}
                                                </DescriptionListDescription>
                                            </DescriptionListGroup>
                                            {entry.serverSponsor && (
                                                <DescriptionListGroup>
                                                    <DescriptionListTerm>運営元</DescriptionListTerm>
                                                    <DescriptionListDescription>{entry.serverSponsor}</DescriptionListDescription>
                                                </DescriptionListGroup>
                                            )}
                                            {entry.resultUrl && (
                                                <DescriptionListGroup>
                                                    <DescriptionListTerm>結果URL</DescriptionListTerm>
                                                    <DescriptionListDescription>
                                                        {isSafeUrl ? (
                                                            <a href={entry.resultUrl} target="_blank" rel="noopener noreferrer">
                                                                {entry.resultUrl} <ExternalLinkAltIcon />
                                                            </a>
                                                        ) : (
                                                            entry.resultUrl
                                                        )}
                                                    </DescriptionListDescription>
                                                </DescriptionListGroup>
                                            )}
                                        </DescriptionList>
                                    </div>
                                );
                            })}
                        </div>

                        {totalCount > 10 && (
                            <Pagination
                                itemCount={totalCount}
                                perPage={perPage}
                                page={page}
                                onSetPage={onSetPage}
                                onPerPageSelect={onPerPageSelect}
                                variant="bottom"
                                style={{ marginTop: "1rem" }}
                            />
                        )}
                    </>
                )}
            </CardBody>

            <Modal
                variant={ModalVariant.small}
                title="測定履歴の全件削除"
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                actions={[
                    <Button
                        key="confirm"
                        variant="danger"
                        onClick={() => {
                            onClearHistory();
                            setIsClearModalOpen(false);
                        }}
                    >
                        削除する
                    </Button>,
                    <Button key="cancel" variant="link" onClick={() => setIsClearModalOpen(false)}>
                        キャンセル
                    </Button>
                ]}
            >
                保存されているすべての測定結果（{totalCount} 件）を削除しますか？この操作は取り消せません。
            </Modal>
        </Card>
    );
};
