#!/usr/bin/env node

const { execSync } = require("child_process");

const prompts = require("prompts");
const replaceInFiles = require("replace-in-file");
const fs = require("fs/promises");
const path = require("path");

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
 * @arg {string} str
 * @returns {string}
 * @example upperSnakeCase("This is my sample"); // => "THIS_IS_MY_SAMPLE"
 */
function titleSnakeCase(str) {
	return titleCase(str).replace(/\s+/g, "_");
}

/**
 * Kebab case a string.
 * @arg {string} str
 * @returns {string}
 * @example kebabCase("This is my sample"); // => "this-is-my-sample"
 */
function kebabCase(str) {
	return stripCase(str).replace(/\s+/g, "-");
}

/**
 * An await-able timeout
 *
 * @param {number} duration
 * @returns {Promise}
 */
function setTimer(duration) {
	const promise = new Promise((resolve) => {
		setTimeout(resolve, toNumber(duration));
	});
	return promise;
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

const commands = {
	gitCheckout: `git clone -b npx --depth 1 https://github.com/Denman-Digital/wp-theme-starter.git  ${repoName}`,
	newRepo: `cd ${repoName} && rm -rf .git && git init && git add --all && git commit -m "Created new theme from wp-theme-starter"`,
	installDeps: `cd ${repoName} && npm install`,
};

const paths = {
	package: path.join(repoName, "package.json"),
	packageSample: path.join(repoName, "package-sample.json"),
	composer: path.join(repoName, "composer.json"),
	composerSample: path.join(repoName, "composer-sample.json"),
	composerIncludes: path.join(repoName, "includes", "composer.json"),
	composerIncludesSample: path.join(repoName, "includes", "composer-sample.json"),
	styleCSS: path.join(repoName, "style.css"),
	repoHistory: path.join(repoName, ".git"),
};

(async () => {
	/** @type {Object.<string, string>} */
	const {
		slug,
		displayName,
		description,
		authorName,
		authorSlug,
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
			name: "authorSlug",
			message: "Author slug/GitHub username",
			initial: (prev) => kebabCase(prev),
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
			validate: (value) => (/\s/.test(value) ? "Function prefix must not contain any spaces." : true),
		},
		{
			type: "text",
			name: "classPrefix",
			message: "Theme class prefix",
			initial: (_, { slug }) => titleSnakeCase(slug) + "_",
			validate: (value) => (/\s/.test(value) ? "Class prefix must not contain any spaces." : true),
		},
	]);

	console.log(`Cloning the template repository to "${repoName}"`);
	const didCheckOut = runCommand(commands.gitCheckout);
	if (!didCheckOut) process.exit(-1);

	try {
		await fs.access(paths.packageSample);
		console.log("\nGenerating new package.json from package-sample.json");
		await fs.rm(paths.package);
		await fs.rename(paths.packageSample, paths.package);
	} catch (error) {
		console.error("Unable to generate new package.json from package-sample.json");
	}

	try {
		await fs.access(paths.packageSample);
		console.log("\nGenerating new composer.json's from composer-sample.json's");
		await fs.rm(paths.composer);
		await fs.rename(paths.composerSample, paths.composer);
		await fs.rm(paths.composerIncludes);
		await fs.rename(paths.composerIncludesSample, paths.composerIncludes);
	} catch (error) {
		console.error("Unable to generate new composer.json's");
	}

	try {
		console.log("Customizing theme metadata");
		await replaceInFiles({
			files: [paths.styleCSS, paths.package, paths.composer, paths.composerIncludes],
			from: [
				/<theme_slug>/g,
				/<theme_display_name>/g,
				/<theme_description>/g,
				/<theme_author_name>/g,
				/<theme_author_uri>/g,
				/<theme_author_slug>/g,
				/<theme_github_uri>/g,
				/<theme_uri>/g,
				/wp-theme-starter-text-domain/g,
			],
			to: [slug, displayName, description, authorName, authorUri, authorSlug, githubUri, uri, textDomain],
		});

		await replaceInFiles({
			files: paths.styleCSS,
			from: "<theme_keywords>",
			to: keywords,
		});

		await replaceInFiles({
			files: [paths.package, paths.composer, paths.composerIncludes],
			from: '"<theme_keywords>"',
			to: keywords
				.split(",")
				.map((str) => `"${str.trim()}"`)
				.join(", "),
		});

		await replaceInFiles({
			files: path.join(repoName, "**/*.php"),
			ignore: "**/vendor/**/*.php",
			from: [/<theme_slug>/g, /wp-theme-starter-text-domain/g, /wp_theme_starter_/g, /WP_Theme_Starter_/g],
			to: [slug, textDomain, funcPrefix, classPrefix],
		});

		await replaceInFiles({
			files: path.join(repoName, "readme.md"),
			from: /<!-- start_banner.*end_banner -->/gims,
			to: `# ${displayName}\n\n${description}\n\nBased on [Denman WP Theme Starter](https://github.com/Denman-Digital/wp-theme-starter/)\n\n`,
		});
	} catch (error) {
		console.error(error);
	}

	console.log("Creating a blank-slate Git repo");

	await setTimer(2000);

	const didClearRepo = runCommand(commands.newRepo);
	if (!didClearRepo)
		console.warn("Was unable to finish removing boilerplate's development Git history and initialize new blank repo");

	console.log(`\nInstalling dependencies for ${repoName}`);

	await setTimer(2000);

	const didInstallDeps = runCommand(commands.installDeps);
	if (!didInstallDeps) process.exit(-1);

	console.log("\nCongratulations! Use the following commands to get started:");
	console.log(`\n\tcd ${repoName} && npm start`);
})();
