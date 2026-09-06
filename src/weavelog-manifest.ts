export interface WeavelogManifest {
	tools: Record<string, ToolSpec>;
	models: string[];
	proxyPort: number;
	apiUrls: Record<string, string>;
	launchd: WeavelogLaunchd;
	updatedAt: string;
}

export interface ToolSpec {
	channel: "pipx" | "npm" | "app" | "git";
	version: string;
	check: string;
	repo?: string;
}

export interface WeavelogLaunchd {
	proxy: string;
	stackCheck: string;
}
