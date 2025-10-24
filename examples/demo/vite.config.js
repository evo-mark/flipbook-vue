import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
	resolve: {
		alias: {
			"flipbook-vue": resolve("../../src/index.ts"),
		},
	},
	plugins: [vue()],
});
