(() => {
  const data = window.quizData,
    questions = data.questions;
  let current = 0,
    answers = { ...data.answers },
    saving = Promise.resolve();
  const area = document.getElementById("questionArea"),
    numbers = document.getElementById("questionNumbers");
  function paint() {
    const q = questions[current];
    area.innerHTML = `<div class="question-box"><h2>Q${current + 1
      }. ${escapeHtml(q.text)}</h2>${q.options
        .map(
          (o, i) =>
            `<label class="answer-option ${String(answers[q.id]) === String(o.id) ? "chosen" : ""
            }"><input type="radio" name="answer" value="${o.id}" ${String(answers[q.id]) === String(o.id) ? "checked" : ""
            }><span>${String.fromCharCode(65 + i)}.</span> ${escapeHtml(
              o.text
            )}</label>`
        )
        .join("")}</div>`;
    document.getElementById("questionCount").textContent = `Question ${current + 1
      } of ${questions.length}`;
    document.getElementById("progressLabel").textContent = `Question ${current + 1
      } of ${questions.length}`;
    document.getElementById("progressBar").style.width = `${((current + 1) / questions.length) * 100
      }%`;
    document.getElementById("previous").disabled = current === 0;
    document.getElementById("next").textContent =
      current === questions.length - 1 ? "Review answers" : "Next question";
    document.querySelectorAll(".q-number").forEach((b, i) => {
      b.classList.toggle("current", i === current);
      b.classList.toggle("answered", Boolean(answers[questions[i].id]));
    });
    area.querySelectorAll("input").forEach((input) =>
      input.addEventListener("change", () => {
        const optionId = input.value;
        answers[q.id] = optionId;
        document
          .querySelectorAll(".answer-option")
          .forEach((n) => n.classList.remove("chosen"));
        input.closest(".answer-option").classList.add("chosen");
        document
          .querySelectorAll(".q-number")
        [current].classList.add("answered");
        saving = saving
          .then(() =>
            fetch(`/quiz/${data.competitionId}/save`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                _csrf: data.csrfToken,
                attempt_id: data.attemptId,
                question_id: q.id,
                option_id: optionId,
              }),
            })
          )
          .then((r) => r.json())
          .then((result) => {
            if (result.error) alert(result.error);
          });
      })
    );
  }
  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }
  questions.forEach((q, i) => {
    const b = document.createElement("button");
    b.className = "q-number";
    b.textContent = i + 1;
    b.addEventListener("click", () => {
      current = i;
      paint();
    });
    numbers.appendChild(b);
  });
  document.getElementById("previous").addEventListener("click", () => {
    if (current > 0) {
      current--;
      paint();
    }
  });
  document.getElementById("next").addEventListener("click", () => {
    if (current < questions.length - 1) {
      current++;
      paint();
    } else {
      document
        .querySelector(".question-nav")
        .scrollIntoView({ behavior: "smooth" });
    }
  });
  const timerElement = document.getElementById("timer");
  let remaining = Math.max(
    0,
    Number(timerElement.dataset.minutes) * 60 -
    Math.floor(
      (Date.now() - new Date(timerElement.dataset.started).getTime()) / 1000
    )
  );
  const timer = document.querySelector("#timer span");
  function tick() {
    const m = Math.floor(remaining / 60),
      s = remaining % 60;
    timer.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(
      2,
      "0"
    )}`;
    if (remaining <= 0) {
      submit(true);
      return;
    }
    remaining--;
    setTimeout(tick, 1000);
  }
  function submit(auto = false) {
    if (
      !auto &&
      !confirm("Submit your quiz now? You cannot change answers afterwards.")
    )
      return;
    saving.then(() => {
      const form = document.createElement("form");
      form.method = "post";
      form.action = `/quiz/${data.competitionId}/submit`;
      form.innerHTML = `<input name="_csrf" value="${data.csrfToken}"><input name="attempt_id" value="${data.attemptId}">`;
      document.body.appendChild(form);
      form.submit();
    });
  }
  document
    .getElementById("submitQuiz")
    .addEventListener("click", () => submit(false));
  paint();
  tick();
})();
