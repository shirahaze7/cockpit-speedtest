import React from "react";
import { Alert, AlertVariant } from "@patternfly/react-core";

export interface AlertState {
    readonly variant: AlertVariant;
    readonly title: string;
    readonly body?: string;
}

interface AlertAreaProps {
    readonly alert: AlertState | null;
    readonly onClose?: () => void;
}

export const AlertArea: React.FC<AlertAreaProps> = ({ alert, onClose }) => {
    if (!alert) return null;

    return (
        <div style={{ marginBottom: "1.5rem" }} aria-live="polite">
            <Alert
                variant={alert.variant}
                title={alert.title}
                actionClose={onClose ? undefined : undefined}
                isInline
            >
                {alert.body && <p>{alert.body}</p>}
            </Alert>
        </div>
    );
};
