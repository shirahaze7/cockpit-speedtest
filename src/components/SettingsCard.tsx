import React, { useState } from "react";
import {
    ActionGroup,
    AlertVariant,
    Button,
    Card,
    CardBody,
    CardTitle,
    Form,
    FormGroup,
    FormHelperText,
    HelperText,
    HelperTextItem,
    TextInput
} from "@patternfly/react-core";
import {
    clampHistoryLimit,
    isValidMaxHistoryInput,
    MAX_MAX_HISTORY_ENTRIES,
    MIN_MAX_HISTORY_ENTRIES,
    type AppConfig
} from "../lib/historyStorage";

interface SettingsCardProps {
    readonly config: AppConfig;
    readonly onSaveConfig: (newConfig: AppConfig) => void;
    readonly onNotify: (variant: AlertVariant, title: string) => void;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
    config,
    onSaveConfig,
    onNotify
}) => {
    const [inputValue, setInputValue] = useState(String(config.maxHistoryEntries));
    const [saved, setSaved] = useState(false);

    const isValid = isValidMaxHistoryInput(inputValue);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        const numericVal = parseInt(inputValue.trim(), 10);
        const clamped = clampHistoryLimit(numericVal);
        onSaveConfig({ maxHistoryEntries: clamped });
        setInputValue(String(clamped));
        setSaved(true);
        onNotify(AlertVariant.success, "設定を保存しました。");
    };

    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardTitle>設定</CardTitle>
            <CardBody>
                <Form onSubmit={handleSubmit}>
                    <FormGroup
                        label="測定結果の保持件数"
                        isRequired
                        fieldId="settings-max-history"
                    >
                        <TextInput
                            isRequired
                            type="number"
                            id="settings-max-history"
                            name="settings-max-history"
                            value={inputValue}
                            onChange={(_event, val) => {
                                setInputValue(val);
                                setSaved(false);
                            }}
                            min={MIN_MAX_HISTORY_ENTRIES}
                            max={MAX_MAX_HISTORY_ENTRIES}
                            validated={isValid ? "default" : "error"}
                            style={{ maxWidth: "200px" }}
                        />
                        <FormHelperText>
                            <HelperText>
                                <HelperTextItem variant={isValid ? "default" : "error"}>
                                    {isValid
                                        ? `過去の測定結果を何件まで保持するかを指定します (${MIN_MAX_HISTORY_ENTRIES}〜${MAX_MAX_HISTORY_ENTRIES} 件)。上限を超えた古い結果から自動的に削除されます。`
                                        : `${MIN_MAX_HISTORY_ENTRIES} から ${MAX_MAX_HISTORY_ENTRIES} までの整数を入力してください。`}
                                </HelperTextItem>
                            </HelperText>
                        </FormHelperText>
                    </FormGroup>

                    <ActionGroup>
                        <Button
                            variant="primary"
                            type="submit"
                            isDisabled={!isValid || saved}
                        >
                            保存
                        </Button>
                    </ActionGroup>
                </Form>
            </CardBody>
        </Card>
    );
};
