import React, { useState } from "react";
import { Card, CardBody, CodeBlock, CodeBlockCode, ExpandableSection } from "@patternfly/react-core";

interface LogDetailsProps {
    logs: string;
}

export const LogDetails: React.FC<LogDetailsProps> = ({ logs }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!logs) return null;

    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardBody>
                <ExpandableSection
                    toggleText={isExpanded ? "詳細ログを閉じる" : "詳細ログを表示"}
                    onToggle={(_event, isExpanded) => setIsExpanded(isExpanded)}
                    isExpanded={isExpanded}
                >
                    <div style={{ marginTop: "1rem" }}>
                        <CodeBlock>
                            <CodeBlockCode style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: "320px", overflow: "auto" }}>
                                {logs}
                            </CodeBlockCode>
                        </CodeBlock>
                    </div>
                </ExpandableSection>
            </CardBody>
        </Card>
    );
};
