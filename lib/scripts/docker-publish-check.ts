import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";

interface ImageConfig {
	label: "bot" | "web";
	repository: string;
	packageFile: string;
}

interface Decision {
	version: string;
	build: boolean;
	publish: boolean;
	exists: boolean | null;
	reason: string;
}

const imageConfigs: ImageConfig[] = [
	{
		label: "bot",
		repository: "bassbot",
		packageFile: "package.json",
	},
	{
		label: "web",
		repository: "bassbot-web",
		packageFile: join("web", "package.json"),
	},
];

const manifestAcceptHeader = [
	"application/vnd.oci.image.index.v1+json",
	"application/vnd.oci.image.manifest.v1+json",
	"application/vnd.docker.distribution.manifest.list.v2+json",
	"application/vnd.docker.distribution.manifest.v2+json",
].join(", ");

const eventName = getRequiredEnv("GITHUB_EVENT_NAME");
const gitRef = process.env.GITHUB_REF ?? "";
const repositoryOwner = getRequiredEnv("GITHUB_REPOSITORY_OWNER").toLowerCase();
const githubActor = process.env.GITHUB_ACTOR ?? "github-actions[bot]";
const githubToken = process.env.GH_TOKEN;
const headCommitMessage = process.env.HEAD_COMMIT_MESSAGE ?? "";
const outputFile = process.env.GITHUB_OUTPUT;
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

const isPullRequest = eventName === "pull_request";
const isWorkflowDispatch = eventName === "workflow_dispatch";
const isMainPush = eventName === "push" && gitRef === "refs/heads/main";

async function main() {
	console.log("[docker-check] Starting Docker publish planning");
	console.log(
		`[docker-check] Context: event=${eventName}, ref=${gitRef || "<none>"}, owner=${repositoryOwner}, actor=${githubActor}`,
	);

	const versions = Object.fromEntries(
		await Promise.all(
			imageConfigs.map(async (config) => [config.label, await readVersion(config.packageFile)]),
		),
	) as Record<ImageConfig["label"], string>;

	console.log(`[docker-check] Versions: bot=${versions.bot}, web=${versions.web}`);

	const decisions = new Map<ImageConfig["label"], Decision>();

	if (isPullRequest) {
		console.log("[docker-check] Pull request detected, building both images without publishing");
		for (const config of imageConfigs) {
			decisions.set(config.label, {
				version: versions[config.label],
				build: true,
				publish: false,
				exists: null,
				reason: "pull request build",
			});
		}
	} else if (headCommitMessage.includes("[no-publish]")) {
		console.log("[docker-check] [no-publish] marker found in head commit message");
		for (const config of imageConfigs) {
			decisions.set(config.label, {
				version: versions[config.label],
				build: isWorkflowDispatch,
				publish: false,
				exists: null,
				reason: isWorkflowDispatch
					? "workflow_dispatch build only because [no-publish] is set"
					: "publishing disabled by [no-publish]",
			});
		}
	} else {
		if (!githubToken) {
			throw new Error("GH_TOKEN is required for registry checks on publish-capable events");
		}

		console.log("[docker-check] Checking GHCR for existing version tags");

		for (const config of imageConfigs) {
			const version = versions[config.label];
			const exists = await ghcrManifestExists({
				owner: repositoryOwner,
				repository: config.repository,
				version,
				actor: githubActor,
				token: githubToken,
			});

			const publish = !exists;
			const build = isWorkflowDispatch ? true : publish;

			console.log(
				`[docker-check] ${config.label}: version=${version}, exists=${exists}, build=${build}, publish=${publish}`,
			);

			decisions.set(config.label, {
				version,
				build,
				publish,
				exists,
				reason: exists
					? `version ${version} already exists in ghcr.io/${repositoryOwner}/${config.repository}`
					: `version ${version} does not exist in ghcr.io/${repositoryOwner}/${config.repository}`,
			});
		}
	}

	if (!isPullRequest && !isWorkflowDispatch && !isMainPush) {
		console.log("[docker-check] Event is not publish-capable, forcing build/publish to false");
		for (const config of imageConfigs) {
			decisions.set(config.label, {
				version: versions[config.label],
				build: false,
				publish: false,
				exists: null,
				reason: `event ${eventName} is not configured for builds`,
			});
		}
	}

	await writeOutputs(decisions);
	await writeSummary(decisions);

	console.log("[docker-check] Final decision summary");
	for (const config of imageConfigs) {
		const decision = decisions.get(config.label);
		if (!decision) {
			throw new Error(`Missing decision for ${config.label}`);
		}

		console.log(
			`[docker-check] ${config.label}: version=${decision.version}, build=${decision.build}, publish=${decision.publish}, reason=${decision.reason}`,
		);
	}
	console.log("[docker-check] Planning complete");
}

async function readVersion(filePath: string) {
	const packageJson = JSON.parse(await readFile(filePath, "utf8")) as { version?: string };
	if (!packageJson.version) {
		throw new Error(`No version found in ${filePath}`);
	}

	return packageJson.version;
}

async function ghcrManifestExists({
	owner,
	repository,
	version,
	actor,
	token,
}: {
	owner: string;
	repository: string;
	version: string;
	actor: string;
	token: string;
}) {
	const registryToken = await getGhcrBearerToken({ owner, repository, actor, token });
	const response = await fetch(`https://ghcr.io/v2/${owner}/${repository}/manifests/${version}`, {
		method: "HEAD",
		headers: {
			Authorization: `Bearer ${registryToken}`,
			Accept: manifestAcceptHeader,
		},
	});

	if (response.status === 200) {
		return true;
	}

	if (response.status === 404) {
		return false;
	}

	throw new Error(
		`Unexpected GHCR response for ${owner}/${repository}:${version}: ${response.status} ${response.statusText}`,
	);
}

async function getGhcrBearerToken({
	owner,
	repository,
	actor,
	token,
}: {
	owner: string;
	repository: string;
	actor: string;
	token: string;
}) {
	const credentials = Buffer.from(`${actor}:${token}`).toString("base64");
	const url = new URL("https://ghcr.io/token");
	url.searchParams.set("service", "ghcr.io");
	url.searchParams.set("scope", `repository:${owner}/${repository}:pull`);

	const response = await fetch(url, {
		headers: {
			Authorization: `Basic ${credentials}`,
			Accept: "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Failed to get GHCR bearer token for ${owner}/${repository}: ${response.status} ${response.statusText}`,
		);
	}

	const payload = (await response.json()) as { token?: string };
	if (!payload.token) {
		throw new Error(`GHCR token response did not include a token for ${owner}/${repository}`);
	}

	return payload.token;
}

async function writeOutputs(decisions: Map<ImageConfig["label"], Decision>) {
	if (!outputFile) {
		console.log("[docker-check] GITHUB_OUTPUT is not set, skipping output file write");
		return;
	}

	const lines: string[] = [];
	for (const config of imageConfigs) {
		const decision = decisions.get(config.label);
		if (!decision) {
			throw new Error(`Missing decision for ${config.label}`);
		}

		lines.push(`${config.label}_version=${decision.version}`);
		lines.push(`build_${config.label}=${decision.build}`);
		lines.push(`publish_${config.label}=${decision.publish}`);
		lines.push(`exists_${config.label}=${decision.exists ?? "unknown"}`);
		lines.push(`${config.label}_reason=${decision.reason}`);
	}

	await appendFile(outputFile, `${lines.join("\n")}\n`, "utf8");
	console.log(`[docker-check] Wrote ${lines.length} outputs to GITHUB_OUTPUT`);
}

async function writeSummary(decisions: Map<ImageConfig["label"], Decision>) {
	if (!summaryFile) {
		return;
	}

	const lines = [
		"## Docker publish plan",
		"",
		`Event: ${eventName}`,
		`Ref: ${gitRef || "<none>"}`,
		"",
		"| Image | Version | Exists in GHCR | Build | Publish | Reason |",
		"| --- | --- | --- | --- | --- | --- |",
	];

	for (const config of imageConfigs) {
		const decision = decisions.get(config.label);
		if (!decision) {
			throw new Error(`Missing decision for ${config.label}`);
		}

		lines.push(
			`| ${config.label} | ${decision.version} | ${decision.exists ?? "n/a"} | ${decision.build} | ${decision.publish} | ${decision.reason} |`,
		);
	}

	await appendFile(summaryFile, `${lines.join("\n")}\n`, "utf8");
}

function getRequiredEnv(name: string) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

await main();