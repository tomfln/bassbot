import { appendFile, readFile } from "node:fs/promises";

interface Image {
	name: "bot" | "web";
	repo: string;
	packageFile: string;
	version: string;
	build: boolean;
	publish: boolean;
	exists: boolean | null;
	reason: string;
}

const eventName = required("GITHUB_EVENT_NAME");
const gitRef = process.env.GITHUB_REF ?? "";
const owner = required("GITHUB_REPOSITORY_OWNER").toLowerCase();
const actor = process.env.GITHUB_ACTOR ?? "github-actions[bot]";
const token = process.env.GH_TOKEN;
const commitMessage = process.env.HEAD_COMMIT_MESSAGE ?? "";
const outputFile = process.env.GITHUB_OUTPUT;
const summaryFile = process.env.GITHUB_STEP_SUMMARY;

const isPr = eventName === "pull_request";
const isDispatch = eventName === "workflow_dispatch";
const isMainPush = eventName === "push" && gitRef === "refs/heads/main";
const shouldCheckRegistry = !isPr && !commitMessage.includes("[no-publish]") && (isDispatch || isMainPush);

const images: Image[] = [
	{ name: "bot", repo: "bassbot", packageFile: "package.json", version: "", build: false, publish: false, exists: null, reason: "" },
	{ name: "web", repo: "bassbot-web", packageFile: "web/package.json", version: "", build: false, publish: false, exists: null, reason: "" },
];

console.log(`[docker-check] event=${eventName} ref=${gitRef || "<none>"} owner=${owner}`);

for (const image of images) {
	image.version = await versionFrom(image.packageFile);
}

console.log(`[docker-check] versions: ${images.map((image) => `${image.name}=${image.version}`).join(" ")}`);

let bearerToken = "";
if (shouldCheckRegistry) {
	if (!token) {
		throw new Error("GH_TOKEN is required for registry checks");
	}

	bearerToken = await registryToken(owner, actor, token);
	console.log("[docker-check] checking GHCR for existing version tags");
}

for (const image of images) {
	if (!isPr && !isDispatch && !isMainPush) {
		image.reason = `event ${eventName} is not configured for builds`;
		continue;
	}

	if (isPr) {
		image.build = true;
		image.reason = "pull request build";
		continue;
	}

	if (commitMessage.includes("[no-publish]")) {
		image.build = isDispatch;
		image.reason = isDispatch
			? "workflow_dispatch build only because [no-publish] is set"
			: "publishing disabled by [no-publish]";
		continue;
	}

	image.exists = await tagExists(bearerToken, owner, image.repo, image.version);
	image.publish = !image.exists;
	image.build = isDispatch || image.publish;
	image.reason = image.exists
		? `version ${image.version} already exists in ghcr.io/${owner}/${image.repo}`
		: `version ${image.version} does not exist in ghcr.io/${owner}/${image.repo}`;
}

for (const image of images) {
	console.log(
		`[docker-check] ${image.name}: version=${image.version}, exists=${image.exists ?? "n/a"}, build=${image.build}, publish=${image.publish}, reason=${image.reason}`,
	);
}

if (outputFile) {
	await appendFile(
		outputFile,
		images
			.flatMap((image) => [
				`${image.name}_version=${image.version}`,
				`build_${image.name}=${image.build}`,
				`publish_${image.name}=${image.publish}`,
				`exists_${image.name}=${image.exists ?? "unknown"}`,
				`${image.name}_reason=${image.reason}`,
			])
			.join("\n") + "\n",
		"utf8",
	);
	console.log("[docker-check] wrote outputs to GITHUB_OUTPUT");
}

if (summaryFile) {
	await appendFile(
		summaryFile,
		[
			"## Docker publish plan",
			"",
			`Event: ${eventName}`,
			`Ref: ${gitRef || "<none>"}`,
			"",
			"| Image | Version | Exists in GHCR | Build | Publish | Reason |",
			"| --- | --- | --- | --- | --- | --- |",
			...images.map(
				(image) =>
					`| ${image.name} | ${image.version} | ${image.exists ?? "n/a"} | ${image.build} | ${image.publish} | ${image.reason} |`,
			),
		].join("\n") + "\n",
		"utf8",
	);
}

async function versionFrom(filePath: string) {
	const pkg = JSON.parse(await readFile(filePath, "utf8")) as { version?: string };
	if (!pkg.version) {
		throw new Error(`No version found in ${filePath}`);
	}
	return pkg.version;
}

async function registryToken(ownerName: string, githubActor: string, githubToken: string) {
	const response = await fetch(
		`https://ghcr.io/token?service=ghcr.io&scope=repository:${ownerName}/bassbot:pull`,
		{
			headers: {
				Authorization: `Basic ${Buffer.from(`${githubActor}:${githubToken}`).toString("base64")}`,
				Accept: "application/json",
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to get GHCR token: ${response.status} ${response.statusText}`);
	}

	const body = (await response.json()) as { token?: string };
	if (!body.token) {
		throw new Error("GHCR token response did not include a token");
	}

	return body.token;
}

async function tagExists(bearerToken: string, ownerName: string, repo: string, version: string) {
	const response = await fetch(`https://ghcr.io/v2/${ownerName}/${repo}/manifests/${version}`, {
		method: "HEAD",
		headers: {
			Authorization: `Bearer ${bearerToken}`,
			Accept: [
				"application/vnd.oci.image.index.v1+json",
				"application/vnd.oci.image.manifest.v1+json",
				"application/vnd.docker.distribution.manifest.list.v2+json",
				"application/vnd.docker.distribution.manifest.v2+json",
			].join(", "),
		},
	});

	if (response.status === 200) {
		return true;
	}
	if (response.status === 404) {
		return false;
	}

	throw new Error(
		`Unexpected GHCR response for ${ownerName}/${repo}:${version}: ${response.status} ${response.statusText}`,
	);
}

function required(name: string) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}