import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

let statusBarItem: vscode.StatusBarItem;
let intervalTimer: NodeJS.Timeout;

export function activate(context: vscode.ExtensionContext) {
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(statusBarItem);

	const homeDir = process.env.USERPROFILE || process.env.HOME || '';
	const claudeProjectsDir = path.join(homeDir, '.claude', 'projects');

	updateClaudeStatus(claudeProjectsDir, homeDir);
	intervalTimer = setInterval(() => updateClaudeStatus(claudeProjectsDir, homeDir), 3000);

	statusBarItem.show();
}

async function updateClaudeStatus(baseDir: string, homeDir: string) {
	const activeFile = findActiveSessionFile(baseDir);

	if (!activeFile) {
		statusBarItem.text = "$(hubot) Claude: Idle";
		statusBarItem.color = new vscode.ThemeColor('disabledForeground');
		statusBarItem.tooltip = "No active Claude Code session logs found.";
		return;
	}

	try {
		const data = parseTranscript(activeFile);
		if (!data) return;

		// Pass homeDir to dynamically locate your caveman badge script
		const cavemanBadge = await getCavemanBadge(homeDir);
		const badgePrefix = cavemanBadge ? `${cavemanBadge} ` : "$(hubot) ";

		const budget = data.modelId.includes('1m') ? 1000000 : 200000;

		if (data.used > 0) {
			const pct = (data.used / budget) * 100;
			const usedK = Math.round(data.used / 1000);
			const budK = Math.round(budget / 1000);
			const pctStr = pct.toFixed(1);

			statusBarItem.text = `${badgePrefix}${data.modelName} | ${usedK}k/${budK}k (${pctStr}%)`;

			if (pct >= 85) {
				statusBarItem.color = new vscode.ThemeColor('errorForeground');
			} else if (pct >= 60) {
				statusBarItem.color = new vscode.ThemeColor('terminal.ansiYellow');
			} else {
				statusBarItem.color = new vscode.ThemeColor('terminal.ansiGreen');
			}
		} else {
			statusBarItem.text = `${badgePrefix}${data.modelName} | Ready`;
			statusBarItem.color = undefined;
		}

		const fileStat = fs.statSync(activeFile);
		statusBarItem.tooltip = new vscode.MarkdownString(
			`**Session:** ${path.basename(activeFile)}\n\n` +
			`**Last Active:** ${fileStat.mtime.toLocaleTimeString()}\n\n` +
			`*Tracks active tokens used by your Claude extension panels.*`
		);

	} catch (err) {
		console.error("Error updating Claude status:", err);
	}
}

function findActiveSessionFile(baseDir: string): string | null {
	if (!fs.existsSync(baseDir)) return null;

	let latestFile: string | null = null;
	let latestMtime = 0;

	try {
		const projects = fs.readdirSync(baseDir);
		for (const project of projects) {
			const projectPath = path.join(baseDir, project);
			if (!fs.statSync(projectPath).isDirectory()) continue;

			const files = fs.readdirSync(projectPath);
			for (const file of files) {
				if (!file.endsWith('.jsonl')) continue;
				const filePath = path.join(projectPath, file);

				const stat = fs.statSync(filePath);
				if (stat.isFile() && stat.mtimeMs > latestMtime) {
					latestMtime = stat.mtimeMs;
					latestFile = filePath;
				}
			}
		}
	} catch (e) {
		console.error("Error searching session logs:", e);
	}

	return latestFile;
}

function parseTranscript(filePath: string) {
	try {
		const content = fs.readFileSync(filePath, 'utf8');
		const lines = content.split('\n').filter((l: string) => l.trim().length > 0);

		let used = 0;
		let modelId = '';
		let modelName = 'Claude';

		for (let i = lines.length - 1; i >= 0; i--) {
			const line = lines[i];

			if (!modelId || modelName === 'Claude') {
				try {
					const obj = JSON.parse(line);
					const m = obj.model || (obj.message && obj.message.model);

					if (m) {
						if (typeof m === 'object') {
							modelId = m.id || modelId;
							modelName = m.display_name || m.id || modelName;
						} else if (typeof m === 'string') {
							modelId = m;
							modelName = m;
						}
					}
				} catch (e) {
					const nameMatch = line.match(/"display_name"\s*:\s*"([^"]+)"/);
					if (nameMatch) modelName = nameMatch[1];

					const modelMatch = line.match(/"model"\s*:\s*"([^"]+)"/);
					if (modelMatch) {
						modelId = modelMatch[1];
						if (modelName === 'Claude') modelName = modelMatch[1];
					}
				}
			}

			if (used === 0 && line.includes('"usage"')) {
				try {
					const obj = JSON.parse(line);
					const u = obj.message?.usage || obj.usage;
					if (u) {
						used = (u.input_tokens || 0) +
							(u.cache_creation_input_tokens || 0) +
							(u.cache_read_input_tokens || 0);
					}
				} catch (e) { }
			}

			if (used > 0 && modelId && modelName !== 'Claude') break;
		}

		return { used, modelName, modelId };
	} catch (err) {
		return null;
	}
}

/**
 * Dynamically crawls the local cache folder to locate the caveman status hook script
 * without relying on a hardcoded username or installation hash string.
 */
function findCavemanScript(homeDir: string): string | null {
	const basePluginDir = path.join(homeDir, '.claude', 'plugins', 'cache', 'caveman', 'caveman');
	if (!fs.existsSync(basePluginDir)) return null;

	try {
		const subdirs = fs.readdirSync(basePluginDir);
		for (const subdir of subdirs) {
			const potentialScript = path.join(basePluginDir, subdir, 'src', 'hooks', 'caveman-statusline.ps1');
			if (fs.existsSync(potentialScript)) {
				return potentialScript;
			}
		}
	} catch (e) {
		console.error("Error locating caveman script path automatically:", e);
	}
	return null;
}

function getCavemanBadge(homeDir: string): Promise<string> {
	return new Promise((resolve) => {
		const targetScript = findCavemanScript(homeDir);

		if (!targetScript) {
			return resolve(""); // Gracefully fall back to no badge if caveman isn't installed
		}

		const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${targetScript}"`;

		exec(cmd, (error: Error | null, stdout: string) => {
			if (error || !stdout) {
				resolve("");
			} else {
				const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
				const cleanText = stdout.replace(ansiRegex, '').trim();
				const badgeMatch = cleanText.match(/^\[[^\]]+\]/);

				if (badgeMatch) {
					resolve(badgeMatch[0]);
				} else {
					resolve(cleanText.split(' ')[0]);
				}
			}
		});
	});
}

export function deactivate() {
	if (intervalTimer) {
		clearInterval(intervalTimer);
	}
}