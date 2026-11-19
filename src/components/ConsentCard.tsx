import React, { useState } from "react";
import { Button, Card, CardBody, CardFooter, CardTitle, Checkbox, List, ListItem } from "@patternfly/react-core";

interface ConsentCardProps {
    readonly onConsent: () => void;
}

export const ConsentCard: React.FC<ConsentCardProps> = ({ onConsent }) => {
    const [checked, setChecked] = useState(false);

    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardTitle>Ookla の利用条件の確認</CardTitle>
            <CardBody>
                <p style={{ marginBottom: "1rem" }}>
                    速度測定を実行するには、Ookla の利用条件とプライバシー方針への同意が必要です。
                    内容を確認したうえで、ご自身の操作で同意してください。この画面が自動で同意することはありません。
                </p>
                <List style={{ marginBottom: "1.25rem", wordBreak: "break-all" }}>
                    <ListItem>
                        利用条件: <code>https://www.speedtest.net/about/terms</code>
                    </ListItem>
                    <ListItem>
                        プライバシー方針: <code>https://www.speedtest.net/about/privacy</code>
                    </ListItem>
                </List>
                <Checkbox
                    id="consent-checkbox"
                    label="Ookla の利用条件とプライバシー方針を確認し、同意します"
                    isChecked={checked}
                    onChange={(_event, isChecked) => setChecked(isChecked)}
                />
            </CardBody>
            <CardFooter>
                <Button variant="primary" isDisabled={!checked} onClick={onConsent}>
                    同意して続ける
                </Button>
            </CardFooter>
        </Card>
    );
};
