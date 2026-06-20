const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");

const root = process.cwd();
const port = Number(process.argv[2] || 8080);
const maxBodyBytes = 60 * 1024 * 1024;

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    sendJson(response, 500, { error: error.message || "Server error." });
  });
});

async function route(request, response) {
  const parsedUrl = new URL(request.url, "http://127.0.0.1");

  if (request.method === "GET" && parsedUrl.pathname === "/api/admin-status") {
    const gitStatus = await getGitStatus();
    sendJson(response, 200, {
      canCommit: gitStatus.ok,
      branch: gitStatus.branch,
      remote: gitStatus.remote,
      message: gitStatus.message,
    });
    return;
  }

  if (request.method === "POST" && parsedUrl.pathname === "/api/upload-commit") {
    const payload = await readJsonBody(request);
    const result = await saveCommitAndPush(payload);
    sendJson(response, 200, result);
    return;
  }

  serveStatic(parsedUrl.pathname, response);
}

async function saveCommitAndPush(payload) {
  if (!payload || !Array.isArray(payload.products)) {
    throw new Error("Upload payload must include products.");
  }

  const products = payload.products.map(normalizeProduct);
  const files = Array.isArray(payload.files) ? payload.files : [];
  const message = sanitizeCommitMessage(payload.message || "Update dress catalogue");

  await fsp.mkdir(path.join(root, "data"), { recursive: true });
  await fsp.mkdir(path.join(root, "assets", "uploads"), { recursive: true });
  await fsp.writeFile(path.join(root, "data", "dresses.json"), `${JSON.stringify(products, null, 2)}\n`, "utf8");

  for (const file of files) {
    await writeUploadFile(file);
  }

  const gitResult = await commitAndPush(message);
  return {
    message: gitResult.message,
    committed: gitResult.committed,
    pushed: gitResult.pushed,
    branch: gitResult.branch,
  };
}

async function writeUploadFile(file) {
  if (!file || typeof file.path !== "string" || typeof file.data !== "string") {
    throw new Error("Every uploaded image must include path and data.");
  }

  const targetPath = safeUploadPath(file.path);
  const bytes = Buffer.from(file.data, "base64");

  if (!bytes.length) {
    throw new Error(`Image ${file.path} is empty.`);
  }

  await fsp.writeFile(targetPath, bytes);
}

function safeUploadPath(value) {
  const normalized = String(value).replace(/\\/g, "/");

  if (!normalized.startsWith("assets/uploads/")) {
    throw new Error("Images can only be saved inside assets/uploads.");
  }

  const fileName = path.basename(normalized).replace(/[^a-zA-Z0-9._-]/g, "");
  if (!fileName) {
    throw new Error("Uploaded image file name is invalid.");
  }

  const targetPath = path.resolve(root, "assets", "uploads", fileName);
  const uploadsRoot = path.resolve(root, "assets", "uploads");

  if (!targetPath.startsWith(uploadsRoot + path.sep)) {
    throw new Error("Uploaded image path is outside assets/uploads.");
  }

  return targetPath;
}

async function commitAndPush(message) {
  await runGit(["rev-parse", "--is-inside-work-tree"]);
  await runGit(["add", "data/dresses.json", "assets/uploads"]);

  const diff = await runGit(["diff", "--cached", "--quiet"], { allowExitCodes: [0, 1] });
  if (diff.code === 0) {
    return {
      message: "No catalogue changes to upload.",
      committed: false,
      pushed: false,
      branch: await getBranchName(),
    };
  }

  await runGit(["commit", "-m", message]);

  try {
    await runGit(["push"]);
    return {
      message: "Catalogue committed and pushed to GitHub.",
      committed: true,
      pushed: true,
      branch: await getBranchName(),
    };
  } catch (error) {
    throw new Error(`Committed locally, but git push failed. ${error.message}`);
  }
}

async function getGitStatus() {
  try {
    await runGit(["rev-parse", "--is-inside-work-tree"]);
    return {
      ok: true,
      branch: await getBranchName(),
      remote: await getRemoteName(),
      message: "Git repository ready.",
    };
  } catch (error) {
    return {
      ok: false,
      branch: "",
      remote: "",
      message: error.message,
    };
  }
}

async function getBranchName() {
  const result = await runGit(["branch", "--show-current"], { allowExitCodes: [0] });
  return result.stdout.trim();
}

async function getRemoteName() {
  const result = await runGit(["remote"], { allowExitCodes: [0] });
  return result.stdout.trim().split(/\s+/).filter(Boolean)[0] || "";
}

function runGit(args, options = {}) {
  const allowExitCodes = options.allowExitCodes || [0];

  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd: root,
      shell: false,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const result = { code, stdout, stderr };
      if (allowExitCodes.includes(code)) {
        resolve(result);
        return;
      }

      reject(new Error((stderr || stdout || `git ${args.join(" ")} failed`).trim()));
    });
  });
}

function normalizeProduct(product) {
  const name = String(product.name || "Untitled Dress").trim();
  const id = String(product.id || slugify(name)).trim();

  return {
    id,
    name,
    description: String(product.description || "").trim(),
    sizes: normalizeSizes(product.sizes),
    price: Number(product.price || 0),
    image: String(product.image || "").trim(),
    available: product.available !== false,
    featured: Boolean(product.featured),
    createdAt: product.createdAt || new Date().toISOString().slice(0, 10),
    updatedAt: product.updatedAt || "",
  };
}

function normalizeSizes(value) {
  const clean = (size) => String(size).trim().replace(/[^\d]/g, "");

  if (Array.isArray(value)) {
    return value.map(clean).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map(clean)
    .filter(Boolean);
}

function slugify(value) {
  return String(value || "dress")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "dress";
}

function sanitizeCommitMessage(value) {
  return String(value || "Update dress catalogue")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 120) || "Update dress catalogue";
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;

      if (size > maxBodyBytes) {
        reject(new Error("Upload payload is too large."));
        request.destroy();
        return;
      }

      body += chunk.toString();
    });

    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(new Error("Upload payload must be valid JSON."));
      }
    });

    request.on("error", reject);
  });
}

function serveStatic(pathname, response) {
  let requestPath = decodeURIComponent(pathname);

  if (requestPath.endsWith("/")) {
    requestPath += "index.html";
  }

  const filePath = path.normalize(path.join(root, requestPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    });
    response.end(data);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

server.listen(port, "127.0.0.1", () => {
  console.log(`GlowUp Empire admin server running at http://127.0.0.1:${port}/`);
  console.log("Open http://127.0.0.1:" + port + "/login.html for admin uploads.");
});
