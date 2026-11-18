const esbuild = require("esbuild");
const fs = require("node:fs");
const path = require("node:path");

const isWatch = process.argv.includes("--watch");

async function build() {
    const outdir = path.resolve(__dirname, "dist");
    if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
    }

    // コピー: index.html と manifest.json
    fs.copyFileSync(
        path.resolve(__dirname, "src/index.html"),
        path.resolve(outdir, "index.html")
    );
    fs.copyFileSync(
        path.resolve(__dirname, "src/manifest.json"),
        path.resolve(outdir, "manifest.json")
    );

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
            ".png": "file",
            ".svg": "file",
            ".woff": "file",
            ".woff2": "file",
            ".ttf": "file",
            ".eot": "file"
        }
    };

    const testBuildOptions = {
        entryPoints: [path.resolve(__dirname, "src/test/speedtestCore.test.ts")],
        bundle: true,
        platform: "node",
        outfile: path.resolve(outdir, "test/speedtestCore.test.js"),
        sourcemap: true,
        target: ["node20"],
        format: "cjs"
    };

    if (isWatch) {
        const clientCtx = await esbuild.context(clientBuildOptions);
        await clientCtx.watch();
        console.log("Watching for changes...");
    } else {
        await esbuild.build(clientBuildOptions);
        if (fs.existsSync(path.resolve(__dirname, "src/test/speedtestCore.test.ts"))) {
            await esbuild.build(testBuildOptions);
        }
        console.log("Build completed successfully.");
    }
}

build().catch((err) => {
    console.error(err);
    process.exit(1);
});
