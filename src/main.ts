import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab } from "./settings";
import { StaticSiteGenerator } from "./generator";

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'generate-static-site',
			name: 'Generate Static Site',
			callback: async () => {
				await this.generate();
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	async generate() {
		const generator = new StaticSiteGenerator(this.app, this.settings);
		await generator.generate();
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
