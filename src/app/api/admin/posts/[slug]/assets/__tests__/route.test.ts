import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { isAuthorizedUser } from "@/lib/auth-utils";
import { getGitHubClient, getRepoInfo } from "@/lib/github-app";
import {
  createBranch,
  createOrGetPullRequest,
  getBlogPost,
} from "@/lib/github";
import { GET, DELETE } from "../route";

jest.mock("next-auth", () => ({ getServerSession: jest.fn() }));
jest.mock("@/lib/auth", () => ({ authOptions: {} }));
jest.mock("@/lib/auth-utils", () => ({ isAuthorizedUser: jest.fn() }));
jest.mock("@/lib/github-app", () => ({
  getGitHubClient: jest.fn(),
  getRepoInfo: jest.fn(),
}));
jest.mock("@/lib/github", () => ({
  createBranch: jest.fn(),
  createOrGetPullRequest: jest.fn(),
  getBlogPost: jest.fn(),
}));

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedIsAuthorizedUser = jest.mocked(isAuthorizedUser);
const mockedGetGitHubClient = jest.mocked(getGitHubClient);
const mockedGetRepoInfo = jest.mocked(getRepoInfo);
const mockedCreateBranch = jest.mocked(createBranch);
const mockedCreateOrGetPullRequest = jest.mocked(createOrGetPullRequest);
const mockedGetBlogPost = jest.mocked(getBlogPost);

function octokitStub() {
  return {
    rest: {
      repos: {
        getContent: jest.fn(),
        listBranches: jest.fn().mockResolvedValue({ data: [] }),
        deleteFile: jest.fn().mockResolvedValue({}),
      },
    },
  };
}

let octokit: ReturnType<typeof octokitStub>;

function ctx(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

beforeEach(() => {
  octokit = octokitStub();
  mockedGetServerSession.mockResolvedValue({
    user: { name: "Jane", email: "a@etsa.tech" },
  } as never);
  mockedIsAuthorizedUser.mockReturnValue(true);
  mockedGetGitHubClient.mockResolvedValue(octokit as never);
  mockedGetRepoInfo.mockReturnValue({ owner: "etsa", repo: "etsa.tech" });
  mockedGetBlogPost.mockResolvedValue('---\ntitle: "My Post"\n---\nbody');
});

afterEach(() => jest.clearAllMocks());

describe("GET /api/admin/posts/[slug]/assets", () => {
  it("lists files under the presentation directory", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: [
        {
          type: "file",
          name: "a.png",
          path: "public/presentation/slug/a.png",
          size: 100,
        },
        {
          type: "dir",
          name: "sub",
          path: "public/presentation/slug/sub",
          size: 0,
        },
      ],
    });
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    const body = await res.json();
    expect(body.assets).toHaveLength(1);
    expect(body.assets[0]).toMatchObject({
      name: "a.png",
      url: "/presentation/slug/a.png",
      type: "PNG",
      size: 100,
    });
  });

  it("defaults size to 0 when the API omits it", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: [
        { type: "file", name: "a.png", path: "public/presentation/slug/a.png" },
      ],
    });
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect((await res.json()).assets[0].size).toBe(0);
  });

  it("returns an empty asset list when the directory doesn't exist", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("not found"));
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect((await res.json()).assets).toEqual([]);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(401);
  });

  it("500s when the GitHub client throws", async () => {
    mockedGetGitHubClient.mockRejectedValue(new Error("auth failed"));
    const res = await GET(new NextRequest("http://localhost/x"), ctx("slug"));
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/admin/posts/[slug]/assets", () => {
  function delReq(query: string) {
    return new NextRequest(`http://localhost/x${query}`);
  }

  it("deletes the file directly on a non-main branch", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: { type: "file", sha: "sha1" },
    });
    const res = await DELETE(
      delReq("?fileName=a.png&branch=feature/x"),
      ctx("slug"),
    );
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(octokit.rest.repos.deleteFile).toHaveBeenCalledWith(
      expect.objectContaining({ sha: "sha1", branch: "feature/x" }),
    );
    expect(body.pullRequest).toBeNull();
  });

  it("creates an update branch and PR when deleting from main", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: { type: "file", sha: "sha1" },
    });
    mockedCreateOrGetPullRequest.mockResolvedValue({
      prNumber: 8,
      isNew: true,
    });
    const res = await DELETE(delReq("?fileName=a.png"), ctx("slug"));
    const body = await res.json();
    expect(mockedCreateBranch).toHaveBeenCalled();
    expect(body.pullRequest.prNumber).toBe(8);
  });

  it("400s when fileName is missing", async () => {
    const res = await DELETE(delReq(""), ctx("slug"));
    expect(res.status).toBe(400);
  });

  it("404s when the file to delete isn't found", async () => {
    octokit.rest.repos.getContent.mockRejectedValue(new Error("not found"));
    const res = await DELETE(
      delReq("?fileName=missing.png&branch=feature/x"),
      ctx("slug"),
    );
    expect(res.status).toBe(404);
  });

  it("404s when the path resolves to a directory rather than a file", async () => {
    octokit.rest.repos.getContent.mockResolvedValue({
      data: [{ type: "file" }],
    });
    const res = await DELETE(
      delReq("?fileName=a.png&branch=feature/x"),
      ctx("slug"),
    );
    expect(res.status).toBe(404);
  });

  it("401s for an unauthorized user", async () => {
    mockedIsAuthorizedUser.mockReturnValue(false);
    const res = await DELETE(delReq("?fileName=a.png"), ctx("slug"));
    expect(res.status).toBe(401);
  });

  it("500s when branch resolution throws on main", async () => {
    octokit.rest.repos.listBranches.mockRejectedValue(new Error("down"));
    const res = await DELETE(delReq("?fileName=a.png"), ctx("slug"));
    expect(res.status).toBe(500);
  });
});
