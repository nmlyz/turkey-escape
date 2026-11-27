#!/usr/bin/env python3
"""Publish turkey-escape to GitHub via the Git Data API (first push: empty repo).
Usage: python3 upload-turkey.py
Uses the custom.github connector helper (gh_stdin.py) for authenticated calls.
"""
import base64, json, subprocess, sys, os

ROOT = os.path.expanduser("~/workspace/projects/makefun/repo-turkey")
GH = os.path.expanduser("~/workspace/custom-connectors/custom.github/bin/gh_stdin.py")
REPO = "/repos/nmlyz/turkey-escape"
AUTHOR = {"name": "nmlyz", "email": "84489715+nmlyz@users.noreply.github.com"}
SKIP_DIRS = {".git", "__pycache__", "node_modules"}

def call(method, path, body=None):
    p = subprocess.run([sys.executable, GH, method, path],
                       input=json.dumps(body).encode() if body is not None else b"",
                       capture_output=True, timeout=180)
    out = json.loads(p.stdout.decode())
    if "_http_status" in out:
        raise RuntimeError(f"{method} {path} -> {out['_http_status']}: {out['_body'][:300]}")
    return out

def main():
    files = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            files.append(os.path.relpath(os.path.join(dirpath, fn), ROOT))
    files.sort()
    print("files:", len(files))
    tree_items = []
    for rel in files:
        with open(os.path.join(ROOT, rel), "rb") as f:
            content = base64.b64encode(f.read()).decode()
        blob = call("POST", REPO + "/git/blobs", {"content": content, "encoding": "base64"})
        tree_items.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print("blob", rel)
    base_sha = None
    base_tree = None
    try:
        ref = call("GET", REPO + "/git/ref/heads/main")
        base_sha = ref["object"]["sha"]
        base_tree = call("GET", REPO + f"/git/commits/{base_sha}")["tree"]["sha"]
    except RuntimeError as e:
        if "404" not in str(e):
            raise
    tree_body = {"tree": tree_items}
    if base_tree:
        tree_body["base_tree"] = base_tree
    tree = call("POST", REPO + "/git/trees", tree_body)
    commit_body = {"message": "Turkey Escape: outrun the farmer, dodge the oven and the carving knife",
                   "tree": tree["sha"], "author": AUTHOR, "committer": AUTHOR}
    if base_sha:
        commit_body["parents"] = [base_sha]
    commit = call("POST", REPO + "/git/commits", commit_body)
    print("commit", commit["sha"])
    if base_sha:
        call("PATCH", REPO + "/git/refs/heads/main", {"sha": commit["sha"]})
        print("updated existing main")
    else:
        call("POST", REPO + "/git/refs", {"ref": "refs/heads/main", "sha": commit["sha"]})
        print("created main")
    call("PATCH", REPO, {"homepage": "https://make.fun/c/turkey-run-game-01",
                         "topics": ["makefun", "escape-game"]})
    print("repo:", "https://github.com/nmlyz/turkey-escape")
    print("sha:", commit["sha"])

if __name__ == "__main__":
    main()
