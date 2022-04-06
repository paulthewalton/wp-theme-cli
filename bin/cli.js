#!/usr/bin/env node

const { execSync } = require("child_process");

const prompts = require("prompts");
const replaceInFiles = require("replace-in-file");
/**
 * Strip the case of a string: no capitals, words separated by a single space.
 * @summary Strip the case of a string.
 * @arg {string} str
 * @returns {string}
 */
function stripCase(str) {
	return str
		.replace(/([A-Z]+)/g, " $1")
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

/**
 * Upper case the first letter of each word in a string.
 * @arg {string} str
 * @returns {string}
 */
function upperCaseWords(str) {
	return str.replace(/\b\w/g, (match) => match.toUpperCase());
}

/**
 * Title case a string.
 * @arg {string} str
 * @returns {string}
 * @example titleCase("this is my sample"); // => "This Is My Sample"
 */
function titleCase(str) {
	return upperCaseWords(stripCase(str));
}

/**
 * Snake case a string.
 * @arg {string} str
 * @returns {string}
 * @example snakeCase("This is my sample"); // => "this_is_my_sample"
 */
function snakeCase(str) {
	return stripCase(str).replace(/\s+/g, "_");
}

/**
 * Title snake case a string (aka PHP class case).
 * @category String
 * @arg {string} str
 * @returns {string}
 * @example upperSnakeCase("This is my sample"); // => "THIS_IS_MY_SAMPLE"
 */
export function titleSnakeCase(str) {
	return titleCase(str).replace(/\s+/g, "_");
}

/**
 *
 * @param {string} command
 * @returns {boolean}
 */
const runCommand = (command) => {
	try {
		execSync(`${command}`, { stdio: "inherit" });
	} catch (error) {
		console.error(`Failed to execute "${command}"`, error);
		return false;
	}
	return true;
};

const repoName = process.argv[2];

(async () => {
	/** @type {Object.<string, string>} */
	const {
		slug,
		displayName,
		description,
		authorName,
		authorUri,
		githubUri,
		uri,
		keywords,
		textDomain,
		funcPrefix,
		classPrefix,
	} = await prompts([
		{
			type: "text",
			name: "slug",
			message: "Theme slug",
			initial: repoName && repoName !== "." ? repoName : "my-project",
		},
		{
			type: "text",
			name: "displayName",
			message: "Theme display name",
			initial: (prev) => titleCase(prev),
		},
		{
			type: "text",
			name: "description",
			message: "Theme description",
			initial: "Modern responsive WordPress Theme.",
		},
		{
			type: "text",
			name: "authorName",
			message: "Author name",
			initial: "Denman Digital",
		},
		{
			type: "text",
			name: "authorUri",
			message: "Author URL",
			initial: (prev) => (prev === "Denman Digital" ? "https://denman.digital/" : ""),
		},
		{
			type: "text",
			name: "githubUri",
			message: "GitHub repository URL",
			initial: (_, { slug, authorName, authorUri }) => {
				return authorName === "Denman Digital" || authorUri === "https://denman.digital/"
					? `https://github.com/Denman-Digital/${slug}`
					: "";
			},
		},
		{
			type: "text",
			name: "uri",
			message: "Theme homepage",
			initial: (prev) => (!!prev ? `${prev}#readme` : ""),
		},
		{
			type: "text",
			name: "keywords",
			message: "Theme keywords",
			initial: "responsive, modern",
		},
		{
			type: "text",
			name: "textDomain",
			message: "Theme text-domain",
			initial: (_, { slug }) => slug,
		},
		{
			type: "text",
			name: "funcPrefix",
			message: "Theme function prefix",
			initial: (_, { slug }) => snakeCase(slug) + "_",
		},
		{
			type: "text",
			name: "classPrefix",
			message: "Theme class prefix",
			initial: (_, { slug }) => titleSnakeCase(slug) + "_",
		},
	]);

	const commands = {
		gitCheckout: `git clone --depth 1 https://github.com/Denman-Digital/wp-theme-starter.git  ${repoName}`,
		installDeps: `echo "cd ${repoName} && npm install"`,
	};

	console.log(`Cloning the template repository to "${repoName}"`);
	const didCheckOut = runCommand(commands.gitCheckout);
	if (!didCheckOut) process.exit(-1);

	try {
		console.log("Customizing theme metadata.");
		await replaceInFiles({
			files: ["style.css", "package.json"],
			from: [
				/<theme_slug>/g,
				/<theme_display_name>/g,
				/<theme_description>/g,
				/<theme_author_name>/g,
				/<theme_author_uri>/g,
				/<theme_github_uri>/g,
				/<theme_uri>/g,
				"wp-theme-starter-text-domain",
			],
			to: [slug, displayName, description, authorName, authorUri, githubUri, uri, textDomain],
		});

		await replaceInFiles({
			files: ["style.css"],
			from: "<theme_keywords>",
			to: keywords,
		});

		await replaceInFiles({
			files: ["package.json"],
			from: '"<theme_keywords>"',
			to: keywords
				.split(",")
				.map((str) => `"${str.trim()}"`)
				.join(", "),
		});

		await replaceInFiles({
			files: "**/*.php",
			from: ["<theme_slug>", "wp-theme-starter-text-domain", "wp_theme_starter_", "WP_Theme_Starter_"],
			to: [slug, textDomain, funcPrefix, classPrefix],
		});
	} catch (error) {
		console.error(error);
	}

	console.log(`Installing dependencies for ${repoName}`);
	const didInstallDeps = runCommand(commands.installDeps);

	if (!didInstallDeps) process.exit(-1);

	console.log("Congratulations! Use the following commands to get started:");
	console.log(`\n\tcd ${repoName} && npm start`);
})();
