// Auth tab compatibility fix.
// A legacy handler in app.js reads data-tab, while the current markup uses data-auth-tab.
// Capture the click before the legacy bubble handlers and switch the visible form directly.
document.addEventListener("click", (event) => {
  const tab = event.target.closest(".auth-tab");
  if (!tab) return;

  event.stopImmediatePropagation();

  const isRegister = tab.dataset.authTab === "register";
  document.querySelectorAll(".auth-tab").forEach((button) => {
    button.classList.toggle("active", button === tab);
  });
  document.querySelectorAll(".auth-form").forEach((form) => {
    form.classList.toggle("hidden", isRegister ? form.id !== "registerForm" : form.id !== "loginForm");
  });
}, true);
