// esbuild を用いて Cockpit 拡張のフロントエンドと単体テストをビルドするスクリプト
const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

// コマンドライン引数に --watch が含まれる場合は監視モードで起動する
const isWatch = process.argv.includes("--watch");

// ビルド処理のエントリーポイント
async function build() {
    // 出力先ディレクトリ（dist）を解決し、存在しない場合は作成する
    const outdir = path.resolve(__dirname, "dist");
    if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
    }

    // Cockpit が読み込む静的ファイル（HTML とマニフェスト）を dist にコピーする
    fs.copyFileSync(
        path.resolve(__dirname, "src/index.html"),
        path.resolve(outdir, "index.html")
    );
    fs.copyFileSync(
        path.resolve(__dirname, "src/manifest.json"),
        path.resolve(outdir, "manifest.json")
    );

    // ブラウザ側クライアント（React UI）のバンドル設定
    // cockpit モジュールは Cockpit 実行環境が提供するため external にする
    const clientBuildOptions = {
        entryPoints: [path.resolve(__dirname, "src/index.tsx")],
        bundle: true,
        outfile: path.resolve(outdir, "index.js"),
        sourcemap: true,
        target: ["es2022"],
        format: "iife",
        external: ["cockpit"],
        define: {
            "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production")
        },
        loader: {
            // 画像やフォントはファイルとして出力し、参照パスを解決する
            ".png": "file",
            ".svg": "file",
            ".woff": "file",
            ".woff2": "file",
            ".ttf": "file",
            ".eot": "file"
        }
    };

    // 単体テスト用 TypeScript ファイルを Node.js 実行可能な JS にバンドルする
    const testFiles = [
        "src/test/speedtestCore.test.ts",
        "src/test/historyStorage.test.ts"
    ].filter((f) => fs.existsSync(path.resolve(__dirname, f)));

    const testBuilds = testFiles.map((f) => {
        const basename = path.basename(f, ".ts");
        return esbuild.build({
            entryPoints: [path.resolve(__dirname, f)],
            bundle: true,
            platform: "node",
            outfile: path.resolve(outdir, `test/${basename}.js`),
            sourcemap: true,
            target: ["node20"],
            format: "cjs"
        });
    });

    if (isWatch) {
        // 監視モード: クライアント側の変更を検知して再ビルドする
        const clientCtx = await esbuild.context(clientBuildOptions);
        await clientCtx.watch();
        console.log("Watching for changes...");
    } else {
        // 通常ビルド: クライアントとテストを並列にビルドする
        await esbuild.build(clientBuildOptions);
        await Promise.all(testBuilds);
        console.log("Build completed successfully.");
    }
}

// ビルド実行とエラーハンドリング（失敗時は非ゼロ終了コードで終了）
build().catch((err) => {
    console.error(err);
    process.exit(1);
});
