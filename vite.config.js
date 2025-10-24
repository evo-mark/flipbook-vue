import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import dts from "vite-plugin-dts";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["es"],
			name: "flipbook-vue",
		},
		rollupOptions: {
			external: ["vue"],
		},
	},
	plugins: [dts(), vue()],
});
