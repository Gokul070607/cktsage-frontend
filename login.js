(() => {

  "use strict";


  // =====================================================
  // CURRENT BACKEND
  // =====================================================

  const API_BASE =
    "https://questions-vessel-championships-conjunction.trycloudflare.com";

  const AUTH_KEY =
    "cktsage-auth";


  // =====================================================
  // ELEMENTS
  // =====================================================

  const form =
    document.getElementById("auth-form");

  const signInTab =
    document.getElementById("signin-tab");

  const signUpTab =
    document.getElementById("signup-tab");

  const title =
    document.getElementById("auth-title");

  const subtitle =
    document.getElementById("auth-subtitle");

  const nameInput =
    document.getElementById("name");

  const nameLabel =
    document.getElementById("name-label");

  const emailInput =
    document.getElementById("email");

  const passwordInput =
    document.getElementById("password");

  const confirmInput =
    document.getElementById("confirm-password");

  const confirmLabel =
    document.getElementById("confirm-password-label");

  const submitButton =
    document.getElementById("submit-button");

  const submitLabel =
    document.getElementById("submit-label");

  const message =
    document.getElementById("form-message");

  const togglePassword =
    document.getElementById("toggle-password");

  const forgotPassword =
    document.getElementById("forgot-password");

  const tabs =
    document.querySelector(".auth-tabs");


  // =====================================================
  // REQUIRED ELEMENT CHECK
  // =====================================================

  if (
    !form ||
    !signInTab ||
    !signUpTab ||
    !emailInput ||
    !passwordInput ||
    !submitButton ||
    !submitLabel ||
    !message
  ) {

    console.error(
      "Login page is missing required HTML elements."
    );

    return;
  }


  // =====================================================
  // IF ALREADY LOGGED IN
  // =====================================================

  let existingAuth = null;

  try {

    existingAuth =
      JSON.parse(
        localStorage.getItem(
          AUTH_KEY
        ) || "null"
      );

  } catch (error) {

    existingAuth = null;
  }


  if (
    existingAuth &&
    existingAuth.access_token
  ) {

    window.location.replace(
      "chat.html"
    );

    return;
  }


  // =====================================================
  // STATE
  // =====================================================

  let mode =
    "signin";

  let modeTransitionTimer =
    null;


  if (tabs) {

    tabs.dataset.mode =
      mode;
  }


  // =====================================================
  // MESSAGE HELPER
  // =====================================================

  function showMessage(
    text,
    isError = false
  ) {

    message.textContent =
      text;

    message.className =
      isError
        ? "form-message error"
        : "form-message";
  }


  // =====================================================
  // API HELPER
  // =====================================================

  async function apiRequest(
    path,
    options = {}
  ) {

    let response;


    try {

      response =
        await fetch(
          `${API_BASE}${path}`,
          {
            ...options,

            headers: {
              "Content-Type":
                "application/json",

              ...(options.headers || {})
            }
          }
        );

    } catch (error) {

      console.error(
        "Backend connection error:",
        error
      );

      throw new Error(
        "Cannot connect to the backend."
      );
    }


    let data =
      null;


    try {

      data =
        await response.json();

    } catch (error) {

      data =
        null;
    }


    if (!response.ok) {

      let detail =
        data?.detail ||
        data?.message ||
        `Request failed (${response.status})`;


      if (Array.isArray(detail)) {

        detail =
          detail
            .map(
              item =>
                item.msg ||
                JSON.stringify(item)
            )
            .join(", ");
      }


      throw new Error(
        detail
      );
    }


    return data;
  }


  // =====================================================
  // SAVE AUTH
  // =====================================================

  function saveAuth(
    data
  ) {

    const accessToken =
      data?.access_token ||
      data?.token;


    if (!accessToken) {

      throw new Error(
        "Login succeeded but no access token was returned."
      );
    }


    const authData = {

      access_token:
        accessToken,

      token_type:
        data?.token_type ||
        "bearer",

      user:
        data?.user ||
        null
    };


    // IMPORTANT:
    // localStorage keeps login after browser closes.
    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify(
        authData
      )
    );
  }


  // =====================================================
  // CHANGE SIGN IN / SIGN UP MODE
  // =====================================================

  function setMode(
    nextMode
  ) {

    if (
      mode === nextMode
    ) {

      return;
    }


    mode =
      nextMode;


    const signup =
      mode === "signup";


    if (tabs) {

      tabs.dataset.mode =
        mode;
    }


    form.classList.add(
      "mode-changing"
    );


    subtitle?.classList.add(
      "mode-changing"
    );


    if (
      modeTransitionTimer
    ) {

      window.clearTimeout(
        modeTransitionTimer
      );
    }


    modeTransitionTimer =
      window.setTimeout(
        () => {

          form.classList.remove(
            "mode-changing"
          );

          subtitle?.classList.remove(
            "mode-changing"
          );

        },
        190
      );


    signInTab.classList.toggle(
      "active",
      !signup
    );


    signUpTab.classList.toggle(
      "active",
      signup
    );


    signInTab.setAttribute(
      "aria-selected",
      String(!signup)
    );


    signUpTab.setAttribute(
      "aria-selected",
      String(signup)
    );


    if (nameInput) {

      nameInput.hidden =
        !signup;

      nameInput.required =
        signup;

      nameInput.autocomplete =
        signup
          ? "name"
          : "off";
    }


    if (nameLabel) {

      nameLabel.hidden =
        !signup;
    }


    if (confirmInput) {

      confirmInput.hidden =
        !signup;

      confirmInput.required =
        signup;

      confirmInput.value =
        "";

      confirmInput.autocomplete =
        signup
          ? "new-password"
          : "off";
    }


    if (confirmLabel) {

      confirmLabel.hidden =
        !signup;
    }


    if (title) {

      title.textContent =
        signup
          ? "Create your account"
          : "Sign in";
    }


    if (subtitle) {

      subtitle.textContent =
        signup
          ? "Set up your cktsage workspace."
          : "Continue to your electronics workspace.";
    }


    submitLabel.textContent =
      signup
        ? "Create account"
        : "Sign in";


    passwordInput.autocomplete =
      signup
        ? "new-password"
        : "current-password";


    showMessage("");
  }


  // =====================================================
  // TABS
  // =====================================================

  signInTab.addEventListener(
    "click",
    () => {

      setMode(
        "signin"
      );
    }
  );


  signUpTab.addEventListener(
    "click",
    () => {

      setMode(
        "signup"
      );
    }
  );


  // =====================================================
  // PASSWORD VISIBILITY
  // =====================================================

  togglePassword?.addEventListener(
    "click",
    () => {

      const showing =
        passwordInput.type ===
        "text";


      passwordInput.type =
        showing
          ? "password"
          : "text";


      if (confirmInput) {

        confirmInput.type =
          showing
            ? "password"
            : "text";
      }


      togglePassword.textContent =
        showing
          ? "Show"
          : "Hide";


      passwordInput.focus();
    }
  );


  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  forgotPassword?.addEventListener(
    "click",
    () => {

      showMessage(
        "Password reset is not configured yet."
      );
    }
  );


  // =====================================================
  // SUBMIT
  // =====================================================

  form.addEventListener(
    "submit",
    async event => {

      event.preventDefault();
      event.stopPropagation();


      showMessage("");


      if (
        !emailInput.checkValidity()
      ) {

        showMessage(
          "Enter a valid email address.",
          true
        );

        emailInput.focus();

        return;
      }


      if (
        passwordInput.value.length < 6
      ) {

        showMessage(
          "Use at least 6 characters for the password.",
          true
        );

        passwordInput.focus();

        return;
      }


      if (
        mode === "signup" &&
        !nameInput?.value.trim()
      ) {

        showMessage(
          "Enter your name to continue.",
          true
        );

        nameInput?.focus();

        return;
      }


      if (
        mode === "signup" &&
        confirmInput &&
        passwordInput.value !==
          confirmInput.value
      ) {

        showMessage(
          "Passwords do not match.",
          true
        );

        confirmInput.focus();

        return;
      }


      submitButton.disabled =
        true;


      submitLabel.textContent =
        mode === "signup"
          ? "Creating account…"
          : "Signing in…";


      const email =
        emailInput.value
          .trim()
          .toLowerCase();


      try {

        // =================================================
        // SIGN UP
        // =================================================

        if (
          mode === "signup"
        ) {

          const data =
            await apiRequest(
              "/register",
              {
                method:
                  "POST",

                body:
                  JSON.stringify({
                    name:
                      nameInput.value.trim(),

                    email:
                      email,

                    password:
                      passwordInput.value
                  })
              }
            );


          // If backend ever returns token
          // immediately after registration.
          if (
            data?.access_token ||
            data?.token
          ) {

            saveAuth(
              data
            );


            showMessage(
              "Account created. Opening your workspace…"
            );


            window.setTimeout(
              () => {

                window.location.href =
                  "chat.html";

              },
              350
            );


            return;
          }


          showMessage(
            "Account created. Sign in with your new account."
          );


          mode =
            "signup";


          setMode(
            "signin"
          );


          emailInput.value =
            email;


          passwordInput.value =
            "";


          if (confirmInput) {

            confirmInput.value =
              "";
          }


          passwordInput.focus();


        // =================================================
        // SIGN IN
        // =================================================

        } else {

          const data =
            await apiRequest(
              "/login",
              {
                method:
                  "POST",

                body:
                  JSON.stringify({
                    email:
                      email,

                    password:
                      passwordInput.value
                  })
              }
            );


          saveAuth(
            data
          );


          showMessage(
            "Signed in successfully. Opening your workspace…"
          );


          window.setTimeout(
            () => {

              window.location.href =
                "chat.html";

            },
            350
          );
        }


      } catch (error) {

        console.error(
          "Authentication error:",
          error
        );


        showMessage(
          error?.message ||
          "Authentication failed. Please try again.",
          true
        );


      } finally {

        submitButton.disabled =
          false;


        submitLabel.textContent =
          mode === "signup"
            ? "Create account"
            : "Sign in";
      }
    }
  );


  // =====================================================
  // INITIAL MODE
  // =====================================================

  if (nameInput) {

    nameInput.hidden =
      true;

    nameInput.required =
      false;
  }


  if (nameLabel) {

    nameLabel.hidden =
      true;
  }


  if (confirmInput) {

    confirmInput.hidden =
      true;

    confirmInput.required =
      false;
  }


  if (confirmLabel) {

    confirmLabel.hidden =
      true;
  }

})();