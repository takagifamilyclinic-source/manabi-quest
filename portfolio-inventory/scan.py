#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scan.py — 個人開発ポートフォリオ棚卸しの「機械的検出」部分。

このスクリプトは判断(🟢稼働中 など)はしない。あくまで事実だけを集める:
  - config.yaml のルート直下をプロジェクト候補として列挙(除外パターン適用)
  - 各候補の CLAUDE.md / README / 指示書系Markdown / ソースの有無
  - 主要言語(拡張子から推定)、ファイル数
  - 最終更新日(git があれば最終コミット、なければファイル mtime)
  - 90日(config.stale_days)以上未更新なら ⚫ の予備フラグ
  - ドキュメント健全性(README無し・セットアップ手順無し・APIキー疑い)
  - 前回スナップショット(history/最新)との差分(新規 / 更新 / 新たに放置入り)

出力:
  - 標準出力に生データ JSON(Claude がこれを読んで PORTFOLIO.md を書く)
  - history/YYYY-MM-DD.json に同じ内容を保存(--no-write で抑止)

使い方:
  python scan.py                      # config.yaml を使い、履歴も保存
  python scan.py --config other.yaml  # 別の設定ファイル
  python scan.py --no-write           # 履歴を保存しない(お試し)
  python scan.py --pretty             # 人が読みやすい整形JSON
"""

import argparse
import datetime as _dt
import json
import re
import subprocess
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# 設定読み込み(PyYAML があれば使う。無ければ簡易パーサでこの用途をカバー)
# ---------------------------------------------------------------------------

def load_config(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    try:
        import yaml  # type: ignore
        data = yaml.safe_load(text) or {}
        return data
    except ImportError:
        return _mini_yaml(text)


def _mini_yaml(text: str) -> dict:
    """roots/exclude(リスト)と単純なスカラーだけを扱う最小パーサ。"""
    data: dict = {}
    current_key = None
    for raw in text.splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        if re.match(r"^\s*-\s+", line):  # リスト要素
            item = re.sub(r"^\s*-\s+", "", line).strip().strip('"').strip("'")
            if current_key is not None:
                data.setdefault(current_key, [])
                if isinstance(data[current_key], list):
                    data[current_key].append(item)
            continue
        m = re.match(r"^([A-Za-z_][\w-]*)\s*:\s*(.*)$", line)
        if m:
            key, val = m.group(1), m.group(2).strip()
            if val == "":
                current_key = key
                data.setdefault(key, [])
            else:
                current_key = None
                data[key] = _coerce(val.strip('"').strip("'"))
    return data


def _coerce(v: str):
    if re.fullmatch(r"-?\d+", v):
        return int(v)
    if v.lower() in ("true", "false"):
        return v.lower() == "true"
    return v


# ---------------------------------------------------------------------------
# 判定に使う定数
# ---------------------------------------------------------------------------

LANG_BY_EXT = {
    ".py": "Python", ".js": "JavaScript", ".mjs": "JavaScript", ".ts": "TypeScript",
    ".tsx": "TypeScript", ".jsx": "JavaScript", ".rb": "Ruby", ".go": "Go",
    ".rs": "Rust", ".java": "Java", ".kt": "Kotlin", ".swift": "Swift",
    ".c": "C", ".h": "C", ".cpp": "C++", ".cc": "C++", ".cs": "C#",
    ".php": "PHP", ".sh": "Shell", ".ps1": "PowerShell", ".html": "HTML",
    ".css": "CSS", ".vue": "Vue", ".dart": "Dart", ".sql": "SQL", ".r": "R",
    ".lua": "Lua", ".ipynb": "Jupyter",
}
SOURCE_EXTS = set(LANG_BY_EXT) - {".html", ".css"}  # HTML/CSS単体は「ソース」とみなさない

README_NAMES = ("readme.md", "readme.txt", "readme", "readme.rst")
CLAUDE_NAMES = ("claude.md",)
# 指示書系とみなす Markdown 名の手掛かり
INSTRUCTION_HINTS = ("指示", "指示書", "spec", "仕様", "prompt", "プロンプト", "手順", "設計")

SETUP_HINTS = ("install", "setup", "セットアップ", "インストール", "使い方",
               "getting started", "npm install", "pip install", "起動", "実行")

# APIキーらしき文字列(検出のみ。値はマスクして表示)
SECRET_PATTERNS = [
    ("Anthropic key", re.compile(r"sk-ant-[A-Za-z0-9\-_]{8,}")),
    ("OpenAI key", re.compile(r"sk-[A-Za-z0-9]{20,}")),
    ("Google API key", re.compile(r"AIza[0-9A-Za-z\-_]{20,}")),
    ("AWS access key", re.compile(r"AKIA[0-9A-Z]{16}")),
    ("GitHub token", re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}")),
    ("Slack token", re.compile(r"xox[baprs]-[A-Za-z0-9\-]{10,}")),
    ("Generic secret assign",
     re.compile(r"""(?ix)(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*['"][^'"\s]{8,}['"]""")),
]

# APIキー検査の対象にする拡張子(テキスト系のみ・巨大ファイルは飛ばす)
SECRET_SCAN_EXTS = {".py", ".js", ".mjs", ".ts", ".jsx", ".tsx", ".rb", ".go",
                    ".java", ".php", ".env", ".yaml", ".yml", ".json", ".sh",
                    ".ini", ".cfg", ".toml", ".txt", ".config"}
MAX_SECRET_FILE_BYTES = 512 * 1024  # 512KB を超えるファイルは検査しない


# ---------------------------------------------------------------------------
# ヘルパー
# ---------------------------------------------------------------------------

# config に関わらず常に除外するディレクトリ(VCS内部・OS/エディタのメタ)
ALWAYS_EXCLUDE = {".git", ".hg", ".svn", ".DS_Store", ".idea", ".vscode"}


def is_excluded(name: str, patterns) -> bool:
    if name in ALWAYS_EXCLUDE:
        return True
    lname = name.lower()
    for p in patterns:
        p = p.strip().lower()
        if not p:
            continue
        if p.startswith("*") and lname.endswith(p.lstrip("*")):
            return True
        if p.endswith("*") and lname.startswith(p.rstrip("*")):
            return True
        if lname == p:
            return True
    return False


def git_info(path: Path) -> dict:
    """git リポジトリなら最終コミット情報を返す。違えば is_repo=False。"""
    inside = _git(path, ["rev-parse", "--is-inside-work-tree"])
    if inside != "true":
        return {"is_repo": False}
    iso = _git(path, ["log", "-1", "--format=%cI"])
    if not iso:  # コミットが1つも無い
        return {"is_repo": True, "last_commit_iso": None}
    subject = _git(path, ["log", "-1", "--format=%s"])
    author = _git(path, ["log", "-1", "--format=%an"])
    branch = _git(path, ["rev-parse", "--abbrev-ref", "HEAD"])
    return {
        "is_repo": True,
        "last_commit_iso": iso,
        "last_commit_date": iso[:10],
        "last_commit_subject": subject,
        "author": author,
        "branch": branch,
    }


def _git(path: Path, args) -> str:
    try:
        out = subprocess.run(
            ["git", "-C", str(path)] + args,
            capture_output=True, text=True, timeout=15,
        )
        return out.stdout.strip() if out.returncode == 0 else ""
    except (FileNotFoundError, subprocess.SubprocessError):
        return ""


def newest_mtime(path: Path, excludes) -> float:
    """除外パターンを避けつつ、ツリー内で最も新しい mtime を返す。"""
    latest = 0.0
    stack = [path]
    seen = 0
    while stack:
        d = stack.pop()
        try:
            entries = list(d.iterdir())
        except (PermissionError, OSError):
            continue
        for e in entries:
            if e.is_dir():
                if is_excluded(e.name, excludes):
                    continue
                stack.append(e)
            else:
                seen += 1
                try:
                    latest = max(latest, e.stat().st_mtime)
                except OSError:
                    pass
                if seen > 50000:  # 巨大ツリーの暴走防止
                    return latest
    return latest


def survey_files(path: Path, excludes):
    """ツリーを1回歩いて、言語・ファイル数・秘密情報を集める。"""
    lang_counts = {}
    file_count = 0
    secrets = []
    stack = [path]
    while stack:
        d = stack.pop()
        try:
            entries = list(d.iterdir())
        except (PermissionError, OSError):
            continue
        for e in entries:
            if e.is_dir():
                if not is_excluded(e.name, excludes):
                    stack.append(e)
                continue
            file_count += 1
            ext = e.suffix.lower()
            if ext in LANG_BY_EXT:
                lang = LANG_BY_EXT[ext]
                lang_counts[lang] = lang_counts.get(lang, 0) + 1
            if ext in SECRET_SCAN_EXTS and len(secrets) < 20:
                _scan_secrets(e, secrets)
    langs = sorted(lang_counts, key=lang_counts.get, reverse=True)
    return langs, file_count, secrets


def _scan_secrets(file: Path, out: list):
    try:
        if file.stat().st_size > MAX_SECRET_FILE_BYTES:
            return
        text = file.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return
    for lineno, line in enumerate(text.splitlines(), 1):
        for label, pat in SECRET_PATTERNS:
            m = pat.search(line)
            if m:
                token = m.group(0)
                masked = token[:6] + "…" + token[-2:] if len(token) > 10 else "***"
                out.append({"file": file.name, "line": lineno,
                            "type": label, "excerpt": masked})
                break
        if len(out) >= 20:
            return


def find_docs(path: Path):
    """README / CLAUDE.md / 指示書系Markdown を探す。"""
    readme = None
    claude = False
    instructions = []
    setup_found = False
    try:
        entries = list(path.iterdir())
    except OSError:
        return None, False, [], False
    for e in entries:
        if not e.is_file():
            continue
        low = e.name.lower()
        if low in CLAUDE_NAMES:
            claude = True
        elif low in README_NAMES and readme is None:
            readme = e.name
            setup_found = _has_setup(e)
        elif low.endswith(".md"):
            if any(h in low for h in INSTRUCTION_HINTS):
                instructions.append(e.name)
    return readme, claude, instructions, setup_found


def _has_setup(readme: Path) -> bool:
    try:
        text = readme.read_text(encoding="utf-8", errors="ignore").lower()
    except OSError:
        return False
    return any(h in text for h in SETUP_HINTS)


# ---------------------------------------------------------------------------
# 1プロジェクトの調査
# ---------------------------------------------------------------------------

def inspect(project_dir: Path, root: Path, excludes, stale_days: int, today: _dt.date):
    readme, claude_md, instructions, setup = find_docs(project_dir)
    langs, file_count, secrets = survey_files(project_dir, excludes)
    has_source = bool(langs)

    # 「プロジェクトらしさ」の判定:何らかの実体があるか
    is_project = bool(readme or claude_md or instructions or has_source)

    git = git_info(project_dir)
    if git.get("last_commit_date"):
        last_update = git["last_commit_date"]
        source = "git"
    else:
        mt = newest_mtime(project_dir, excludes)
        last_update = (_dt.datetime.fromtimestamp(mt).date().isoformat()
                       if mt else None)
        source = "mtime"

    days = None
    is_stale = False
    if last_update:
        try:
            d = _dt.date.fromisoformat(last_update)
            days = (today - d).days
            is_stale = days >= stale_days
        except ValueError:
            pass

    # 種別のヒント(最終判断は Claude)
    if instructions and not has_source and not readme:
        type_hint = "指示書のみ(未着手)"
    elif claude_md:
        type_hint = "CLAUDE.mdプロジェクト"
    elif has_source:
        type_hint = "アプリ / 試作"
    else:
        type_hint = "不明"

    doc_warnings = []
    if not readme:
        doc_warnings.append("READMEなし")
    elif not setup:
        doc_warnings.append("セットアップ手順が見当たらない")
    if secrets:
        doc_warnings.append(f"APIキー等の疑い {len(secrets)}件")

    return {
        "name": project_dir.name,
        "path": str(project_dir),
        "root": str(root),
        "is_project": is_project,
        "type_hint": type_hint,
        "markers": {
            "claude_md": claude_md,
            "readme": readme,
            "instructions": instructions,
            "has_source": has_source,
        },
        "primary_languages": langs[:5],
        "file_count": file_count,
        "git": git,
        "last_update": last_update,
        "last_update_source": source,
        "days_since_update": days,
        "is_stale": is_stale,
        "preliminary_state": "⚫" if is_stale else None,
        "doc_health": {
            "readme": bool(readme),
            "setup_instructions": setup,
            "possible_secrets": secrets,
            "warnings": doc_warnings,
        },
    }


# ---------------------------------------------------------------------------
# 前回スナップショットとの差分
# ---------------------------------------------------------------------------

def latest_previous(history_dir: Path, today_iso: str):
    if not history_dir.exists():
        return None, None
    snaps = sorted(p for p in history_dir.glob("*.json") if p.stem != today_iso)
    if not snaps:
        return None, None
    prev = snaps[-1]
    try:
        return prev, json.loads(prev.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return prev, None


def compute_diff(projects, prev_data):
    if not prev_data:
        return {"previous_snapshot": None, "new": [n["name"] for n in projects],
                "updated": [], "newly_stale": []}
    prev_by_path = {p["path"]: p for p in prev_data.get("projects", [])}
    new, updated, newly_stale = [], [], []
    for p in projects:
        old = prev_by_path.get(p["path"])
        if old is None:
            new.append(p["name"])
            continue
        if p.get("last_update") != old.get("last_update"):
            updated.append(p["name"])
        if p.get("is_stale") and not old.get("is_stale"):
            newly_stale.append(p["name"])
    return {
        "previous_snapshot": None,  # 呼び出し側で埋める
        "new": new,
        "updated": updated,
        "newly_stale": newly_stale,
    }


# ---------------------------------------------------------------------------
# メイン
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description="個人開発ポートフォリオ棚卸し(検出フェーズ)")
    ap.add_argument("--config", default="config.yaml", help="設定ファイル(既定: config.yaml)")
    ap.add_argument("--no-write", action="store_true", help="history に保存しない")
    ap.add_argument("--pretty", action="store_true", help="整形して出力")
    args = ap.parse_args()

    base = Path(__file__).resolve().parent
    cfg_path = Path(args.config)
    if not cfg_path.is_absolute():
        cfg_path = base / cfg_path
    if not cfg_path.exists():
        sys.exit(f"設定ファイルが見つかりません: {cfg_path}\n"
                 f"config.example.yaml をコピーして config.yaml を作ってください。")

    cfg = load_config(cfg_path)
    roots = [Path(r).expanduser() for r in (cfg.get("roots") or [])]
    if not roots:
        sys.exit("config.yaml の roots が空です。スキャン対象フォルダを1つ以上指定してください。")
    excludes = cfg.get("exclude") or []
    stale_days = int(cfg.get("stale_days", 90))

    today = _dt.date.today()
    today_iso = today.isoformat()

    projects = []
    for root in roots:
        if not root.exists():
            print(f"[警告] ルートが存在しません: {root}", file=sys.stderr)
            continue
        for child in sorted(root.iterdir()):
            if not child.is_dir() or is_excluded(child.name, excludes):
                continue
            info = inspect(child, root, excludes, stale_days, today)
            if info["is_project"]:
                projects.append(info)

    projects.sort(key=lambda p: (p["days_since_update"] is None,
                                 p["days_since_update"] or 0))

    history_dir = base / "history"
    prev_path, prev_data = latest_previous(history_dir, today_iso)
    diff = compute_diff(projects, prev_data)
    diff["previous_snapshot"] = (str(prev_path.relative_to(base))
                                 if prev_path else None)

    summary = {
        "total": len(projects),
        "stale": sum(1 for p in projects if p["is_stale"]),
        "with_warnings": sum(1 for p in projects if p["doc_health"]["warnings"]),
    }

    result = {
        "scanned_at": today_iso,
        "roots": [str(r) for r in roots],
        "stale_days": stale_days,
        "summary": summary,
        "diff": diff,
        "projects": projects,
    }

    if not args.no_write:
        history_dir.mkdir(exist_ok=True)
        out_path = history_dir / f"{today_iso}.json"
        out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2),
                            encoding="utf-8")
        print(f"[保存] {out_path}", file=sys.stderr)

    indent = 2 if args.pretty else None
    print(json.dumps(result, ensure_ascii=False, indent=indent))


if __name__ == "__main__":
    main()
