import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';

export interface MyPluginSettings {
	outputDir: string;
	allowPrivateFolders: boolean;
	lockedFolders: string[];
	previousOutputDirs: string[];
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	outputDir: 'dist',
	allowPrivateFolders: false,
	lockedFolders: [],
	previousOutputDirs: []
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
					this.plugin.refreshFileExplorerIcons();
				}));


		new Setting(containerEl)
			.setName('Allow Private Folders')
			.setDesc('Enable the ability to lock specific root folders from the file explorer.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.allowPrivateFolders)
				.onChange(async (value) => {
					this.plugin.settings.allowPrivateFolders = value;
					await this.plugin.saveSettings();
					// Trigger UI update in main plugin
					this.plugin.refreshFileExplorerIcons();
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
