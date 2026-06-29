import { Octokit } from "@octokit/rest";

export const githubClient = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

export async function getOwner(): Promise<string> {
  return process.env.GITHUB_OWNER || "pablo";
}

export async function getRepo(): Promise<string> {
  return process.env.GITHUB_REPO || "eyegents";
}