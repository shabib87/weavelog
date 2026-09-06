export interface FlightleadManifest {
	tools: Record<string, ToolSpec>;
	models: string[];
	proxyPort: number;
	apiUrls: Record<string, string>;
	launchd: FlightleadLaunchd;
	updatedAt: string;
}

export interface ToolSpec {
	channel: "pipx" | "npm" | "app" | "git";
	version: string;
	check: string;
	repo?: string;
}

export interface FlightleadLaunchd {
	proxy: string;
	stackCheck: string;
}