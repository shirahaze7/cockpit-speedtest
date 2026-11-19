import React from "react";
import { Button, Card, CardBody, CardFooter, CardTitle } from "@patternfly/react-core";

interface NotInstalledCardProps {
    readonly detectedVersion: string;
    readonly onRecheck: () => void;
    readonly checking: boolean;
}

export const NotInstalledCard: React.FC<NotInstalledCardProps> = ({
    detectedVersion,
    onRecheck,
    checking
}) => {
    const hasIncompatibleCli = detectedVersion !== "";

    return (
        <Card style={{ marginBottom: "1.5rem" }}>
            <CardTitle>
                {hasIncompatibleCli
                    ? "Ookla Speedtest CLI が利用できません"
                    : "Ookla Speedtest CLI がインストールされていません"}
            </CardTitle>
            <CardBody>
                <p style={{ marginBottom: "1rem" }}>
                    {hasIncompatibleCli
                        ? `検出された CLI (${detectedVersion}) は Ookla 版ではありません。Python 版の speedtest-cli など、別の実装が先に見つかっている可能性があります。`
                        : "測定には、サーバー上で Linux 用の Ookla Speedtest CLI（コマンド名 speedtest）が動作している必要があります。"}
                </p>
                <p>
                    Ookla 公式 CLI をインストールし、<code>speedtest --version</code> が「Ookla」を含むことを確認してください。
                    導入手順は公式配布ページ（<code>https://www.speedtest.net/apps/cli</code>）を参照してください。
                    導入後、「再確認」を押してください。
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
