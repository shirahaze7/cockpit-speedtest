// 画面上部に表示する通知アラートの状態と表示コンポーネント
import React from "react";
import { Alert, AlertActionCloseButton, AlertVariant } from "@patternfly/react-core";

// アラート表示に必要な情報
export interface AlertState {
    readonly variant: AlertVariant;
    readonly title: string;
    readonly body?: string;
}

interface AlertAreaProps {
    readonly alert: AlertState | null;
    readonly onClose?: () => void;
}

// アラートが存在する場合のみ描画する（スクリーンリーダー向けに aria-live を設定）
export const AlertArea: React.FC<AlertAreaProps> = ({ alert, onClose }) => {
    if (!alert) return null;

    return (
        <div style={{ marginBottom: "1.5rem" }} aria-live="polite">
            <Alert
                variant={alert.variant}
                title={alert.title}
                actionClose={onClose ? <AlertActionCloseButton onClose={onClose} /> : undefined}
                isInline
            >
                {alert.body && <p>{alert.body}</p>}
            </Alert>
        </div>
    );
};
