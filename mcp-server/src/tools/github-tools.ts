import { z } from "zod";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const githubTools = [
  {
    name: "github_create_pr",
    description: "Create a pull request",
    inputSchema: z.object({
      title: z.string(),
      body: z.string(),
      head: z.string(),
      base: z.string().default("main"),
      draft: z.boolean().default(false)
    }),
    handler: async (args: { title: string; body: string; head: string; base?: string; draft?: boolean }) => {
      const { data } = await octokit.pulls.create({
        owner: getOwner(),
        repo: getRepo(),
        title: args.title,
        body: args.body,
        head: args.head,
        base: args.base || "main",
        draft: args.draft || false
      });
      return { pr: data };
    }
  },
  {
    name: "github_get_pr",
    description: "Get PR details, files, reviews",
    inputSchema: z.object({
      prNumber: z.number()
    }),
    handler: async (args: { prNumber: number }) => {
      const [pr, files, reviews] = await Promise.all([
        octokit.pulls.get({ owner: getOwner(), repo: getRepo(), pull_number: args.prNumber }),
        octokit.pulls.listFiles({ owner: getOwner(), repo: getRepo(), pull_number: args.prNumber }),
        octokit.pulls.listReviews({ owner: getOwner(), repo: getRepo(), pull_number: args.prNumber })
      ]);
      return { pr: pr.data, files: files.data, reviews: reviews.data };
    }
  },
  {
    name: "github_post_review",
    description: "Post review comment on PR",
    inputSchema: z.object({
      prNumber: z.number(),
      body: z.string(),
      event: z.enum(["COMMENT", "APPROVE", "REQUEST_CHANGES"]).default("COMMENT"),
      comments: z.array(z.object({
        path: z.string(),
        line: z.number(),
        body: z.string()
      })).optional()
    }),
    handler: async (args: { prNumber: number; body: string; event: string; comments?: any[] }) => {
      const { data } = await octokit.pulls.createReview({
        owner: getOwner(),
        repo: getRepo(),
        pull_number: args.prNumber,
        body: args.body,
        event: args.event as any,
        comments: args.comments
      });
      return { review: data };
    }
  },
  {
    name: "github_search_code",
    description: "Search code across repository",
    inputSchema: z.object({
      query: z.string(),
      perPage: z.number().default(10)
    }),
    handler: async (args: { query: string; perPage?: number }) => {
      const { data } = await octokit.search.code({
        q: `repo:${getOwner()}/${getRepo()} ${args.query}`,
        per_page: args.perPage
      });
      return { results: data.items };
    }
  },
  {
    name: "github_get_issues",
    description: "List or search issues",
    inputSchema: z.object({
      state: z.enum(["open", "closed", "all"]).default("open"),
      labels: z.array(z.string()).optional(),
      perPage: z.number().default(20)
    }),
    handler: async (args: { state: string; labels?: string[]; perPage?: number }) => {
      const { data } = await octokit.issues.listForRepo({
        owner: getOwner(),
        repo: getRepo(),
        state: args.state as any,
        labels: args.labels?.join(","),
        per_page: args.perPage
      });
      return { issues: data };
    }
  },
  {
    name: "github_create_issue",
    description: "Create a new issue",
    inputSchema: z.object({
      title: z.string(),
      body: z.string(),
      labels: z.array(z.string()).optional(),
      assignees: z.array(z.string()).optional()
    }),
    handler: async (args: { title: string; body: string; labels?: string[]; assignees?: string[] }) => {
      const { data } = await octokit.issues.create({
        owner: getOwner(),
        repo: getRepo(),
        ...args
      });
      return { issue: data };
    }
  }
];

function getOwner(): string {
  return process.env.GITHUB_OWNER || "pablo";
}

function getRepo(): string {
  return process.env.GITHUB_REPO || "eyegents";
}