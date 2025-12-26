document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityTemplate = document.getElementById("activity-template");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Avoid cached responses so UI always shows latest state
      const response = await fetch(`/activities?_=${Date.now()}`, { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message and previous items/options
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        // Clone template
        const node = activityTemplate.content.cloneNode(true);
        const article = node.querySelector("article");
        const titleEl = node.querySelector(".activity-title");
        const descEl = node.querySelector(".activity-desc");
        const participantsList = node.querySelector(".participants-list");
        const participantsCount = node.querySelector(".participants-count");
        const noParticipants = node.querySelector(".no-participants");

        // Fill title/description
        titleEl.textContent = name;
        descEl.textContent = details.description || "";

        // Add schedule & availability elements
        const scheduleP = document.createElement("p");
        scheduleP.innerHTML = `<strong>Schedule:</strong> ${details.schedule || "TBA"}`;
        const spotsLeft = Math.max(0, (details.max_participants || 0) - (details.participants?.length || 0));
        const availP = document.createElement("p");
        availP.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

        article.appendChild(scheduleP);
        article.appendChild(availP);

        // Populate participants list
        const participants = Array.isArray(details.participants) ? details.participants : [];
        participantsList.innerHTML = "";
        if (participants.length === 0) {
          participantsCount.textContent = `(0)`;
          noParticipants.classList.remove("hidden");
        } else {
          noParticipants.classList.add("hidden");
          participantsCount.textContent = `(${participants.length})`;
          participants.forEach((p) => {
            const li = document.createElement("li");

            const avatar = document.createElement("span");
            avatar.className = "participant-avatar";
            // Derive display name and initial
            const display = (typeof p === "string" && p.length) ? p : (p.name || p.email || "Participant");
            const initial = display.trim()[0]?.toUpperCase() || "?";
            avatar.textContent = initial;

            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = display;

            // Delete button to unregister participant
            const delBtn = document.createElement("button");
            delBtn.className = "delete-participant";
            delBtn.title = `Remove ${display}`;
            delBtn.setAttribute('aria-label', `Remove ${display}`);
            delBtn.textContent = "✖";

            delBtn.addEventListener("click", async (ev) => {
              ev.stopPropagation();
              try {
                const res = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(display)}`,
                  { method: "DELETE" }
                );
                const result = await res.json();
                if (res.ok) {
                  // Refresh activities list to reflect change
                  await fetchActivities();
                } else {
                  console.error("Failed to unregister:", result);
                }
              } catch (error) {
                console.error("Error unregistering participant:", error);
              }
            });

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            li.appendChild(delBtn);
            participantsList.appendChild(li);
          });
        }

        activitiesList.appendChild(node);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities to show new participant
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
