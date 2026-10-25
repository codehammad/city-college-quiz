document.querySelectorAll(".edit-campus").forEach((button) =>
	button.addEventListener("click", () => {
		document.getElementById("editForm").action =
			"/admin/campuses/" + button.dataset.id + "/update";
		document.getElementById("editName").value = button.dataset.name;
		document.getElementById("editLocation").value = button.dataset.location;
	})
);

document.querySelectorAll(".edit-team").forEach((button) =>
	button.addEventListener("click", () => {
		document.getElementById("editTeamForm").action =
			"/admin/teams/" + button.dataset.id + "/update";
		document.getElementById("editTeamName").value = button.dataset.name;
		document.getElementById("editTeamUsername").value = button.dataset.username;
		document.getElementById("editTeamCampus").value = button.dataset.campusId;
	})
);
