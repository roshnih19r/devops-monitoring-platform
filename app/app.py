from flask import Flask, render_template
from app.github_client import (
    get_latest_workflow_runs,
    get_installation_repositories
)
app = Flask(__name__)


@app.route("/")
def dashboard():
    return render_template("index.html")


@app.route("/health")
def health():
    return {
        "status": "healthy",
        "message": "Application is running"
    }, 200
@app.route("/api/github/repositories")
def github_repositories():
    try:
        repositories = get_installation_repositories()

        repo_list = [
            {
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "owner": repo.get("owner", {}).get("login"),
                "private": repo.get("private"),
                "default_branch": repo.get("default_branch")
            }
            for repo in repositories
        ]

        return {
            "total_count": len(repo_list),
            "repositories": repo_list
        }, 200

    except Exception:
        app.logger.exception("GitHub repository fetch failed")
        return {
            "error": "Unable to fetch installed repositories"
        }, 502
deployments = [
    {
        "version": "v1.0.0",
        "status": "Success",
        "time": "Initial demo deployment"
    }
]
from datetime import datetime

@app.route("/api/deploy", methods=["POST"])
def trigger_deployment():
    deployment = {
        "version": "v1.0.1",
        "status": "Queued (demo)",
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    deployments.insert(0, deployment)

    return {
        "message": "Demo deployment request recorded",
        "deployment": deployment
    }, 202
@app.route("/api/deployments")
def get_deployments():
    return {
        "deployments": deployments
    }, 200
@app.route("/api/github/workflows/<owner>/<repo>")
def github_workflows(owner, repo):
    try:
        data = get_latest_workflow_runs(owner, repo)

        workflow_runs = []

        for run in data.get("workflow_runs", []):
            workflow_runs.append({
                "id": run.get("id"),
                "name": run.get("name"),
                "status": run.get("status"),
                "conclusion": run.get("conclusion"),
                "branch": run.get("head_branch"),
                "commit": run.get("head_sha"),
                "created_at": run.get("created_at"),
                "updated_at": run.get("updated_at"),
                "started_at": run.get("run_started_at"),
                "url": run.get("html_url")
            })

        return {
            "repository": f"{owner}/{repo}",
            "total_count": data.get("total_count", 0),
            "workflow_runs": workflow_runs
        }, 200

    except Exception:
        app.logger.exception("GitHub workflow fetch failed")
        return {
            "error": "Unable to fetch GitHub workflow status"
        }, 502
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)