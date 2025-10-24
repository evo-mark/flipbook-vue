import configPrettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";
import js from "@eslint/js";
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";

export default defineConfigWithVueTs(
	js.configs.recommended,
	vueTsConfigs.recommended,
	...pluginVue.configs["flat/recommended"],
	configPrettier,
	{
		languageOptions: {
			globals: {
				...globals.node,
				...globals.browser,
			},
		},
		rules: {
			"vue/multi-word-component-names": "off",
			"vue/valid-v-slot": "off",
			"@typescript-eslint/no-explicit-any": "off",
		},
	}
);
