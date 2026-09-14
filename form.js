/**
 * Orbit Waitlist: form validation, submission, and success state.
 */
(function () {

  var SUPABASE_URL      = "";
  var SUPABASE_ANON_KEY = "";

  var form      = document.getElementById("waitlist-form");
  var btnSubmit = document.getElementById("btn-submit");
  var bannerEl  = document.getElementById("form-banner");
  var stepForm    = document.getElementById("step-form");
  var stepSuccess = document.getElementById("step-success");

  var SS_KEY = "orbit_form";

  var nameInput  = document.getElementById("field-name");
  var emailInput = document.getElementById("field-email");
  var errName    = document.getElementById("err-name");
  var errEmail   = document.getElementById("err-email");

  /* ── Success transition ── */
  function showSuccess() {
    if (!stepForm || !stepSuccess) return;
    stepForm.classList.remove("is-active");
    stepForm.classList.add("is-exit-fwd");

    setTimeout(function () {
      stepForm.classList.remove("is-exit-fwd");
      stepSuccess.classList.add("is-active");
      stepSuccess.scrollTop = 0;
    }, 160);
  }

  /* ── Form validation ── */
  function clearErrors() {
    nameInput.classList.remove("is-error");
    emailInput.classList.remove("is-error");
    errName.textContent  = "";
    errName.classList.remove("is-visible");
    errEmail.textContent = "";
    errEmail.classList.remove("is-visible");
    bannerEl.className   = "form-banner";
    bannerEl.textContent = "";
  }

  function fieldErr(input, errEl, msg) {
    input.classList.add("is-error");
    errEl.textContent = msg;
    errEl.classList.add("is-visible");
  }

  function validate(name, email) {
    var ok = true;
    if (!name || name.trim().length < 2) {
      fieldErr(nameInput, errName, "Please enter your name.");
      ok = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      fieldErr(emailInput, errEmail, "Please enter a valid email address.");
      ok = false;
    }
    return ok;
  }

  function setLoading(on) {
    btnSubmit.disabled = on;
    btnSubmit.classList.toggle("is-loading", on);
  }

  function showBanner(cls, msg) {
    bannerEl.className   = "form-banner " + cls;
    bannerEl.textContent = msg;
  }

  function submitToSupabase(payload) {
    return fetch(SUPABASE_URL + "/rest/v1/orbit_waitlist", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer":        "return=minimal",
      },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (res.status === 201 || res.status === 200) return { ok: true };
      return res.json().then(function (b) {
        return { ok: false, status: res.status, body: b };
      }).catch(function () {
        return { ok: false, status: res.status, body: null };
      });
    });
  }

  /* ── sessionStorage: persist form fields across refreshes ── */
  function saveFormState() {
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify({
        name:  nameInput  ? nameInput.value  : "",
        email: emailInput ? emailInput.value : "",
      }));
    } catch (e) {}
  }

  function restoreFormState() {
    try {
      var raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (nameInput  && d.name)  nameInput.value  = d.name;
      if (emailInput && d.email) emailInput.value = d.email;
    } catch (e) {}
  }

  function clearFormState() {
    try { sessionStorage.removeItem(SS_KEY); } catch (e) {}
  }

  [nameInput, emailInput].forEach(function (el) {
    if (el) el.addEventListener("input", saveFormState);
  });

  restoreFormState();

  /* ── Bootstrap ── */
  fetch("/site-config.json", { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (cfg && cfg.supabase) {
        SUPABASE_URL      = String(cfg.supabase.url     || "").trim().replace(/\/$/, "");
        SUPABASE_ANON_KEY = String(cfg.supabase.anonKey || "").trim();
      }
    })
    .catch(function () {})
    .finally(function () {
      if (!form) return;

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearErrors();

        var name  = nameInput.value;
        var email = emailInput.value;

        if (!validate(name, email)) {
          var first = form.querySelector(".is-error");
          if (first) first.focus();
          return;
        }

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
          showBanner("is-error", "Configuration error. Please try again later.");
          return;
        }

        setLoading(true);

        var payload = {
          name:  name.trim(),
          email: email.trim().toLowerCase(),
        };

        submitToSupabase(payload)
          .then(function (result) {
            if (result.ok) {
              var nameEl = document.getElementById("success-name");
              if (nameEl) nameEl.textContent = name.trim().split(" ")[0];
              clearFormState();
              showSuccess();
              return;
            }

            var isDupe =
              result.status === 409 ||
              (result.body &&
                typeof result.body.message === "string" &&
                result.body.message.toLowerCase().indexOf("unique") !== -1);

            showBanner(
              isDupe ? "is-duplicate" : "is-error",
              isDupe
                ? "You are already on the list. We will be in touch when Orbit launches."
                : "Something went wrong. Please try again in a moment."
            );
          })
          .catch(function () {
            showBanner("is-error", "Connection error. Please check your internet and try again.");
          })
          .finally(function () { setLoading(false); });
      });
    });

})();
