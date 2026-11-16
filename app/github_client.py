import os
from datetime import datetime, timedelta, timezone

import jwt
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_APP_ID = os.getenv("GITHUB_APP_ID")
GITHUB_INSTALLATION_ID = os.getenv("GITHUB_INSTALLATION_ID")
GITHUB_PRIVATE_KEY_PATH = os.getenv("GITHUB_PRIVATE_KEY_PATH")

GITHUB_API = "https://api.github.com"


def generate_app_jwt():
    """Generate a short-lived JWT for GitHub App authentication."""

    if not all([
        GITHUB_APP_ID,
        GITHUB_INSTALLATION_ID,
        GITHUB_PRIVATE_KEY_PATH
    ]):
        raise RuntimeError("GitHub App configuration is incomplete.")

    with open(GITHUB_PRIVATE_KEY_PATH, "r", encoding="utf-8") as key_file:
        private_key = key_file.read()

    now = datetime.now(timezone.utc)

    payload = {
        "iat": int(now.timestamp()) - 60,
        "exp": int((now + timedelta(minutes=9)).timestamp()),
        "iss": GITHUB_APP_ID
    }

    return jwt.encode(payload, private_key, algorithm="RS256")


def get_installation_token():
    """Generate a short-lived token for the installed repositories."""

    app_jwt = generate_app_jwt()

    response = requests.post(
        f"{GITHUB_API}/app/installations/{GITHUB_INSTALLATION_ID}/access_tokens",
        headers={
            "Authorization": f"Bearer {app_jwt}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        },
        timeout=15
    )

    response.raise_for_status()
    return response.json()["token"]


def get_latest_workflow_runs(owner, repo):
    """Fetch recent GitHub Actions workflow runs for a repository."""

    token = get_installation_token()

    response = requests.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        },
        params={"per_page": 10},
        timeout=15
    )

    response.raise_for_status()
    return response.json()