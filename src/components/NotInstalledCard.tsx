import React from "react";
import { Button, Card, CardBody, CardFooter, CardTitle } from "@patternfly/react-core";

interface NotInstalledCardProps {
    onRecheck: () => void;
    checking: boolean;
}

export const NotInstalledCard: React.FC<NotInstalledCardProps> = ({ onRecheck, checking }) => {
    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardTitle>Ookla Speedtest CLI がインストールされていません</CardTitle>
            <CardBody>
                <p style={{ marginBottom: "1rem" }}>
                    測定には、サーバー上で Linux 用の Ookla Speedtest CLI（コマンド名 <code>speedtest</code>）が動作している必要があります。
                </p>
                <p>
                    導入手順は Ookla の公式配布ページ（<code>https://www.speedtest.net/apps/cli</code>）を参照してください。
                    導入後、この画面を開き直すか「再確認」を押してください。
                </p>
            </CardBody>
            <CardFooter>
                <Button variant="secondary" onClick={onRecheck} isLoading={checking} isDisabled={checking}>
                    再確認
                </Button>
            </CardFooter>
        </Card>
    );
};
