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

            workflowList.replaceChildren();

            workflowStatus.textContent = "AVAILABLE";
            workflowMessage.textContent =
                `${data.total_count} workflow runs retrieved`;

            if (!data.workflow_runs || data.workflow_runs.length === 0) {
                workflowList.textContent = "No workflow runs found.";
                return;
            }

            data.workflow_runs.forEach(run => {
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


    // 8. View deployment history
    document.querySelectorAll("button").forEach(button => {
        if (button.textContent.trim() !== "View Deployments") return;

        button.addEventListener("click", async () => {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Loading...";

            try {
                const response = await fetch("/api/deployments");
                const data = await response.json();

                if (!response.ok) {
                    throw new Error("Could not load deployments");
                }

                let panel = document.getElementById("deployment-history");

                if (!panel) {
                    panel = document.createElement("div");
                    panel.id = "deployment-history";
                    panel.style.marginTop = "20px";
                    panel.style.padding = "16px";
                    panel.style.borderRadius = "12px";
                    panel.style.background = "#111827";
                    button.insertAdjacentElement("afterend", panel);
                }

                panel.replaceChildren();

                const heading = document.createElement("h3");
                heading.textContent = "Deployment History";
                panel.appendChild(heading);

                if (!data.deployments || data.deployments.length === 0) {
                    const empty = document.createElement("p");
                    empty.textContent = "No deployments recorded yet.";
                    panel.appendChild(empty);
                }

                (data.deployments || []).forEach(deployment => {
                    const item = document.createElement("p");
                    item.textContent =
                        `${deployment.version} — ${deployment.status} — ${deployment.time}`;
                    panel.appendChild(item);
                });

            } catch (error) {
                alert("Unable to load deployment history: " + error.message);

            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });


    // 9. Demo deployment record only
    document.querySelectorAll("button").forEach(button => {
        if (!button.textContent.includes("Deploy Latest Version")) return;

        button.addEventListener("click", async () => {
            const confirmed = confirm(
                "Create a demo deployment record? This will not deploy to AWS."
            );

            if (!confirmed) return;

            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Submitting...";

            try {
                const response = await fetch("/api/deploy", {
                    method: "POST"
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Request failed");
                }

                alert(data.message);

            } catch (error) {
                alert("Could not submit request: " + error.message);

            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });


    // Initial dashboard loading
    updatePlatformHealth();
    loadRepositories();

});