document.addEventListener("DOMContentLoaded", () => {

    const repositorySelect = document.getElementById("repository-select");
    const refreshWorkflowsButton = document.getElementById("refresh-workflows");
    const workflowList = document.getElementById("workflow-list");

    // Dashboard status elements
    const apiStatus = document.getElementById("api-status");
    const apiMessage = document.getElementById("api-message");
    const githubStatus = document.getElementById("github-status");
    const githubMessage = document.getElementById("github-message");
    const workflowStatus = document.getElementById("workflow-status");
    const workflowMessage = document.getElementById("workflow-message");


    // 1. Check DevOps Control Center API health
    async function updatePlatformHealth() {
        try {
            const response = await fetch("/health", {
                cache: "no-store"
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error("Health check failed");
            }
            apiStatus.textContent = data.status.toUpperCase();
            apiMessage.textContent = data.message;

        } catch (error) {
            apiStatus.textContent = "UNAVAILABLE";
            apiMessage.textContent = "Platform health check failed.";
        }
    }


    // 2. Show application health from the latest deployment workflow
    function updateApplicationHealth(workflowRuns) {
        const healthIcon = document.getElementById("application-health-icon");
        const healthStatus = document.getElementById("application-health-status");
        const healthMessage = document.getElementById("application-health-message");

        const deploymentRuns = workflowRuns.filter(run => {
            const workflowPath = (run.path || "").toLowerCase();
            const workflowName = (run.name || "").toLowerCase();

            return workflowPath.includes("deploy") ||
                   workflowName.includes("deploy");
        });

        if (deploymentRuns.length === 0) {
            healthIcon.textContent = "?";
            healthStatus.textContent = "NOT VERIFIED";
            healthMessage.textContent =
                "No deployment workflow was found for this repository.";
            return;
        }

        // GitHub returns the latest workflow runs first.
        const latest = deploymentRuns[0];

        if (latest.status === "completed" && latest.conclusion === "success") {
            const verifiedAt = latest.updated_at || latest.created_at;
            const timeText = verifiedAt
                ? new Date(verifiedAt).toLocaleString()
                : "time unavailable";

            healthIcon.textContent = "✓";
            healthStatus.textContent = "HEALTH VERIFIED";
            healthMessage.textContent =
                `Health check passed during deployment on ${timeText}. This is not a live health check.`;
            return;
        }

        if (latest.status !== "completed") {
            healthIcon.textContent = "…";
            healthStatus.textContent = "VERIFICATION PENDING";
            healthMessage.textContent =
                "The latest deployment workflow is still running. Health verification is not complete yet.";
            return;
        }

        healthIcon.textContent = "!";
        healthStatus.textContent = "DEPLOYMENT FAILED";
        healthMessage.textContent =
            "The latest deployment workflow did not succeed. Open its GitHub Actions run to investigate.";
    }


    // Show the latest actual deployment for the selected repository
    function updateLatestDeployment(workflowRuns, fullName) {
        const deploymentStatus = document.getElementById("deployment-status");
        const deploymentRepository = document.getElementById("deployment-repository");
        const deploymentTime = document.getElementById("deployment-time");
        const deploymentResult = document.getElementById("deployment-result");
        const deploymentNote = document.getElementById("deployment-note");

        deploymentRepository.textContent = fullName;

        const deploymentRuns = workflowRuns.filter(run => {
            const workflowPath = (run.path || "").toLowerCase();
            const workflowName = (run.name || "").toLowerCase();
            return workflowPath.includes("deploy") || workflowName.includes("deploy");
        });

        if (deploymentRuns.length === 0) {
            deploymentStatus.textContent = "NOT FOUND";
            deploymentTime.textContent = "--";
            deploymentResult.textContent = "No deployment run found";
            deploymentNote.textContent = "No deployment workflow run was found for this repository.";
            return;
        }

        const latest = deploymentRuns[0];
        deploymentStatus.textContent = (latest.status || "unknown").toUpperCase();
        deploymentResult.textContent = latest.status === "completed"
            ? (latest.conclusion || "Unknown").toUpperCase()
            : (latest.status || "Unknown").toUpperCase();

        const timestamp = latest.updated_at || latest.created_at;
        deploymentTime.textContent = timestamp
            ? new Date(timestamp).toLocaleString()
            : "Time unavailable";

        deploymentNote.replaceChildren();

        const commitInfo = document.createElement("span");
        commitInfo.textContent = `Commit: ${latest.commit ? latest.commit.substring(0, 7) : "Unknown"}`;
        deploymentNote.appendChild(commitInfo);

        if (latest.url) {
            const link = document.createElement("a");
            link.href = latest.url;
            link.textContent = " View Deployment Run";
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            deploymentNote.appendChild(link);
        }
    }


    // Show real deployment workflow runs as deployment history
    function updateDeploymentHistory(workflowRuns) {
        const eventList = document.querySelector(".event-list");
        const eventCount = document.querySelector(".event-count");

        const deploymentRuns = workflowRuns.filter(run => {
            const workflowPath = (run.path || "").toLowerCase();
            const workflowName = (run.name || "").toLowerCase();
            return workflowPath.includes("deploy") || workflowName.includes("deploy");
        });

        eventCount.textContent = `${deploymentRuns.length} DEPLOYMENT RUNS`;
        eventList.replaceChildren();

        if (deploymentRuns.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No deployment workflow runs found for this repository.";
            eventList.appendChild(emptyMessage);
            return;
        }

        deploymentRuns.forEach(run => {
            const item = document.createElement("div");
            item.className = "workflow-item";

            const details = document.createElement("div");

            const title = document.createElement("strong");
            title.textContent = run.name || "Deployment workflow";

            const result = document.createElement("span");
            result.textContent = `Status: ${(run.status || "unknown").toUpperCase()} | Result: ${(run.conclusion || "pending").toUpperCase()}`;

            const timestamp = document.createElement("span");
            const date = run.updated_at || run.created_at;
            timestamp.textContent = date
                ? `Updated: ${new Date(date).toLocaleString()}`
                : "Time unavailable";

            const commit = document.createElement("span");
            commit.textContent = `Commit: ${run.commit ? run.commit.substring(0, 7) : "Unknown"}`;

            details.append(title, result, timestamp, commit);
            item.appendChild(details);

            if (run.url) {
                const link = document.createElement("a");
                link.href = run.url;
                link.textContent = "View Run";
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                item.appendChild(link);
            }

            eventList.appendChild(item);
        });
    }

    // 2. Load GitHub App repositories
    async function loadRepositories() {
        repositorySelect.disabled = true;
        repositorySelect.replaceChildren();

        const loadingOption = document.createElement("option");
        loadingOption.value = "";
        loadingOption.textContent = "Loading repositories...";
        repositorySelect.appendChild(loadingOption);

        try {
            const response = await fetch("/api/github/repositories", {
                cache: "no-store"
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Repository fetch failed");
            }

            repositorySelect.replaceChildren();

            if (!data.repositories || data.repositories.length === 0) {
                const option = document.createElement("option");
                option.value = "";
                option.textContent = "No connected repositories";
                repositorySelect.appendChild(option);

                githubStatus.textContent = "CONNECTED";
                githubMessage.textContent = "No repositories available.";
                workflowStatus.textContent = "WAITING";
                workflowMessage.textContent = "Connect a repository to monitor workflows.";
                workflowList.textContent = "No connected repositories found.";

                return;
            }

            data.repositories.forEach(repo => {
                const option = document.createElement("option");
                option.value = repo.full_name;
                option.textContent = repo.full_name;
                repositorySelect.appendChild(option);
            });

            repositorySelect.disabled = false;

            githubStatus.textContent = "CONNECTED";
            githubMessage.textContent =
                `${data.total_count} repositories accessible`;

            await loadWorkflows();

        } catch (error) {
            repositorySelect.replaceChildren();

            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Unable to load repositories";
            repositorySelect.appendChild(option);

            githubStatus.textContent = "ERROR";
            githubMessage.textContent = error.message;

            workflowStatus.textContent = "UNAVAILABLE";
            workflowMessage.textContent = "Repository data unavailable.";

            workflowList.textContent =
                "Unable to load repositories: " + error.message;
        }
    }


    // 3. Load workflows for selected repository
    async function loadWorkflows() {
        const fullName = repositorySelect.value;

        if (!fullName) {
            workflowStatus.textContent = "WAITING";
            workflowMessage.textContent = "Select a repository.";
            workflowList.textContent = "Please select a repository.";
            return;
        }

        const [owner, repo] = fullName.split("/");

        refreshWorkflowsButton.disabled = true;
        refreshWorkflowsButton.textContent = "Loading...";
        workflowList.textContent = "Fetching latest GitHub workflows...";

        try {
            const response = await fetch(
                `/api/github/workflows/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
                { cache: "no-store" }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Workflow fetch failed");
            }

            const workflowRuns = data.workflow_runs || [];
            updateApplicationHealth(workflowRuns);
            updateLatestDeployment(workflowRuns, fullName);
            updateDeploymentHistory(workflowRuns);
            workflowList.replaceChildren();

            workflowStatus.textContent = "AVAILABLE";
            workflowMessage.textContent =
                `${data.total_count} workflow runs retrieved`;

            if (workflowRuns.length === 0) {
                workflowList.textContent = "No workflow runs found.";
                return;
            }

            workflowRuns.forEach(run => {
                const item = document.createElement("div");
                item.className = "workflow-item";

                const details = document.createElement("div");

                const name = document.createElement("strong");
                name.textContent = run.name || "Unnamed workflow";

                const status = document.createElement("span");
                status.textContent =
                    `Status: ${run.status} | Result: ${run.conclusion || "Not completed"}`;

                const branch = document.createElement("span");
                branch.textContent =
                    `Branch: ${run.branch || "Unknown"}`;

                const commit = document.createElement("span");
                commit.textContent =
                    `Commit: ${run.commit ? run.commit.substring(0, 7) : "Unknown"}`;

                details.append(name, status, branch, commit);

                if (run.url) {
                    const link = document.createElement("a");
                    link.href = run.url;
                    link.textContent = "View Run";
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    item.append(details, link);
                } else {
                    item.appendChild(details);
                }

                workflowList.appendChild(item);
            });

        } catch (error) {
            workflowStatus.textContent = "ERROR";
            workflowMessage.textContent = "Unable to retrieve workflow data.";

            workflowList.textContent =
                "Unable to load workflows: " + error.message;

            document.getElementById("application-health-icon").textContent = "?";
            document.getElementById("application-health-status").textContent = "UNAVAILABLE";
            document.getElementById("application-health-message").textContent =
                "Unable to retrieve deployment verification data.";

        } finally {
            refreshWorkflowsButton.disabled = false;
            refreshWorkflowsButton.textContent = "↻ Refresh Workflows";
        }
    }


    // 4. Repository selection
    repositorySelect.addEventListener("change", loadWorkflows);


    // 5. Refresh selected repository workflows
    refreshWorkflowsButton.addEventListener("click", loadWorkflows);


    // 6. Health check buttons
    document.querySelectorAll("button").forEach(button => {
        if (button.textContent.trim() !== "Check Health") return;

        button.addEventListener("click", async () => {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Checking...";

            try {
                const response = await fetch("/health", {
                    cache: "no-store"
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Health check failed");
                }

                let result = button.parentElement.querySelector(".health-result");

                if (!result) {
                    result = document.createElement("p");
                    result.className = "health-result";
                    button.insertAdjacentElement("afterend", result);
                }

                result.textContent =
                    `✓ ${data.status.toUpperCase()} — ${data.message}`;

            } catch (error) {
                alert("Health check failed: " + error.message);

            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });


    // 7. Refresh platform status
    document.querySelectorAll("button").forEach(button => {
        if (button.textContent.trim() !== "Refresh Status") return;

        button.addEventListener("click", async () => {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Refreshing...";

            await updatePlatformHealth();

            let result = document.getElementById("refresh-result");

            if (!result) {
                result = document.createElement("p");
                result.id = "refresh-result";
                button.insertAdjacentElement("afterend", result);
            }

            result.textContent =
                `Last refreshed: ${new Date().toLocaleTimeString()}`;

            button.disabled = false;
            button.textContent = originalText;
        });
    });


    // Initial dashboard loading
    updatePlatformHealth();
    loadRepositories();

});