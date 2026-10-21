// vite.config.js
import { defineConfig, loadEnv } from "vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { resolve } from "path";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");
    const API_Endpoint = env.VITE_API_Endpoint;

    return {
        base: "/spki/",
        esbuild: {
            drop: ["console", "debugger"],
        },
        build: {
            outDir: "dist",
            rollupOptions: {
                input: {
                    main: resolve(__dirname, "index.html"),
                },
            },
        },
        plugins: [
            vue(),
            AutoImport({
                resolvers: [ElementPlusResolver()],
            }),
            Components({
                resolvers: [ElementPlusResolver()],
            }),
        ],
        server: {
            host: "0.0.0.0",
            proxy: {
                "/spki/atlas": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                    rewrite: (path) => path.replace(/^\/spki/, ""),
                },
                "/atlas": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                },
                "/api/spki": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                },
                "/api/uias": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                },
                "/authui": {
                    target: API_Endpoint,
                    changeOrigin: true,
                    secure: false,
                },
            },
        },
    };
});
