from flask import Flask, render_template

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

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)