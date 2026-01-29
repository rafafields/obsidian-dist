import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';

export interface MyPluginSettings {
	outputDir: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	outputDir: 'dist'
}

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Output Directory')
			.setDesc('Values relative to the vault root.')
			.addText(text => text
				.setPlaceholder('dist')
				.setValue(this.plugin.settings.outputDir)
				.onChange(async (value) => {
					this.plugin.settings.outputDir = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Generate Site')
			.setDesc('Generate the static site now.')
			.addButton(button => button
				.setButtonText('Generate Now')
				.setCta()
				.onClick(async () => {
					await this.plugin.generate();
				}));

	}
}
