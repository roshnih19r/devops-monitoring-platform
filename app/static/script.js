document.addEventListener("DOMContentLoaded", () => {
    const healthButtons = [...document.querySelectorAll("button")]
        .filter(button =>
            button.textContent.trim().toLowerCase() === "check health"
        );
document.addEventListener("DOMContentLoaded", () => {
    const refreshButtons = [...document.querySelectorAll("button")]
        .filter(button =>
            button.textContent.trim().toLowerCase() === "refresh status"
        );

    refreshButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Refreshing...";

            try {
                const response = await fetch("/health", {
                    cache: "no-store"
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error("Health check failed");
                }

                let message = document.getElementById("refresh-result");

                if (!message) {
                    message = document.createElement("p");
                    message.id = "refresh-result";
                    message.style.marginTop = "12px";
                    button.insertAdjacentElement("afterend", message);
                }

                message.textContent =
                   `Last refreshed: ${new Date().toLocaleTimeString()} — ${data.status}`;

                message.style.color =
                    data.status === "healthy" ? "#4ade80" : "#f87171";

            } catch (error) {
                let message = document.getElementById("refresh-result");

                if (!message) {
                    message = document.createElement("p");
                    message.id = "refresh-result";
                    button.insertAdjacentElement("afterend", message);
                }

                message.textContent = "Refresh failed. Check the server.";
                message.style.color = "#f87171";

            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });
});
    healthButtons.forEach(button => {
        button.addEventListener("click", async () => {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Checking...";

            let result = button.parentElement.querySelector(".health-result");

            if (!result) {
                result = document.createElement("p");
                result.className = "health-result";
                result.style.marginTop = "12px";
                result.style.fontSize = "14px";
                button.insertAdjacentElement("afterend", result);
            }

            result.textContent = "Connecting to health API...";

            try {
                const response = await fetch("/health");
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Health check failed");
                }

                result.textContent =
                    `✓ ${data.status.toUpperCase()} — ${data.message}`;

                result.style.color = "#4ade80";
            } catch (error) {
                result.textContent =
                    `✕ Health check failed: ${error.message}`;

                result.style.color = "#f87171";
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll("button");

    buttons.forEach(button => {
        if (!button.textContent.includes("Refresh Status")) return;

        button.addEventListener("click", async () => {
            const originalText = button.textContent;
            button.disabled = true;
            button.textContent = "Refreshing...";

            try {
                const response = await fetch("/health", {
                    cache: "no-store"
                });

                const data = await response.json();

                let result = document.getElementById("refresh-result");

                if (!result) {
                    result = document.createElement("p");
                    result.id = "refresh-result";
                    result.style.marginTop = "12px";
                    button.insertAdjacentElement("afterend", result);
                }

                if (!response.ok) {
                    throw new Error("Health check failed");
                }

                result.textContent =
                    "Last refreshed: " +
                    new Date().toLocaleTimeString() +
                    " — " + data.status;

                result.style.color = "#4ade80";

            } catch (error) {
                let result = document.getElementById("refresh-result");

                if (!result) {
                    result = document.createElement("p");
                    result.id = "refresh-result";
                    button.insertAdjacentElement("afterend", result);
                }

                result.textContent = "Refresh failed. Please try again.";
                result.style.color = "#f87171";

            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const buttons = document.querySelectorAll("button");

    buttons.forEach(button => {
        if (!button.textContent.includes("View Deployments")) {
            return;
        }

        button.addEventListener("click", async () => {
            button.disabled = true;
            const originalText = button.textContent;
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

                if (data.deployments.length === 0) {
                    const empty = document.createElement("p");
                    empty.textContent = "No deployments recorded yet.";
                    panel.appendChild(empty);
                }

                data.deployments.forEach(deployment => {
                    const item = document.createElement("p");
                    item.textContent =
                        `${deployment.version} — ${deployment.status} — ${deployment.time}`;
                    panel.appendChild(item);
                });

            } catch (error) {
                alert("Unable to load deployment history. Please try again.");
            } finally {
                button.disabled = false;
                button.textContent = originalText;
            }
        });
    });
});
document.addEventListener("DOMContentLoaded", () => {
    const deployButton = [...document.querySelectorAll("button")]
        .find(button =>
            button.textContent.includes("Deploy Latest Version")
        );

    if (!deployButton) return;

    deployButton.addEventListener("click", async () => {
        const confirmed = confirm(
            "Create a demo deployment record? This will not deploy to AWS yet."
        );

        if (!confirmed) return;

        const originalText = deployButton.textContent;
        deployButton.disabled = true;
        deployButton.textContent = "Submitting...";

        try {
            const response = await fetch("/api/deploy", {
                method: "POST"
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error("Request failed");
            }

            alert(data.message);

            const historyButton = [...document.querySelectorAll("button")]
            .find(button => button.textContent.includes("View Deployments"));

            if (historyButton) {
                historyButton.click();
            }
        } catch (error) {
            alert("Could not submit the request. Check that Flask is running.");
        } finally {
            deployButton.disabled = false;
            deployButton.textContent = originalText;
        }
    });
});