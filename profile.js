(() => {

  "use strict";


  // ======================================================
  // CONFIG
  // ======================================================

  const API_BASE =
  window.CKTSAGE_CONFIG.API_BASE;


  const AUTH_KEY =
    "cktsage-auth";


  // ======================================================
  // AUTH
  // ======================================================

  let auth =
    null;


  try {

    auth =
      JSON.parse(
        localStorage.getItem(
          AUTH_KEY
        ) || "null"
      );

  } catch (error) {

    auth =
      null;
  }


  if (
    !auth ||
    !auth.access_token
  ) {

    window.location.replace(
      "login.html"
    );

    return;
  }


  const token =
    auth.access_token;


  // ======================================================
  // PROFILE ELEMENTS
  // ======================================================

  const sidebarUserName =
    document.getElementById(
      "sidebar-user-name"
    );


  const profileName =
    document.getElementById(
      "profile-name"
    );


  const profileNameValue =
    document.getElementById(
      "profile-name-value"
    );


  const profileEmail =
    document.getElementById(
      "profile-email"
    );


  const profileMessage =
    document.getElementById(
      "profile-message"
    );


  // ======================================================
  // CHANGE NAME ELEMENTS
  // ======================================================

  const nameForm =
    document.getElementById(
      "name-form"
    );


  const newNameInput =
    document.getElementById(
      "new-name"
    );


  const changeNameButton =
    document.getElementById(
      "change-name-button"
    );


  const nameMessage =
    document.getElementById(
      "name-message"
    );


  // ======================================================
  // PASSWORD ELEMENTS
  // ======================================================

  const passwordForm =
    document.getElementById(
      "password-form"
    );


  const currentPassword =
    document.getElementById(
      "current-password"
    );


  const newPassword =
    document.getElementById(
      "new-password"
    );


  const confirmPassword =
    document.getElementById(
      "confirm-password"
    );


  const passwordMessage =
    document.getElementById(
      "password-message"
    );


  const changePasswordButton =
    document.getElementById(
      "change-password-button"
    );


  // ======================================================
  // SIGN OUT
  // ======================================================

  const signoutButton =
    document.getElementById(
      "signout-button"
    );


  // ======================================================
  // DISPLAY USER
  // ======================================================

  function displayUser(
    user
  ) {

    if (!user) {
      return;
    }


    const name =
      user.name ||
      "User";


    const email =
      user.email ||
      "—";


    if (
      sidebarUserName
    ) {

      sidebarUserName.textContent =
        name;
    }


    if (
      profileName
    ) {

      profileName.textContent =
        name;
    }


    if (
      profileNameValue
    ) {

      profileNameValue.textContent =
        name;
    }


    if (
      profileEmail
    ) {

      profileEmail.textContent =
        email;
    }


    if (
      newNameInput
    ) {

      newNameInput.value =
        name;
    }
  }


  // ======================================================
  // PROFILE MESSAGE
  // ======================================================

  function showProfileMessage(
    text,
    error = false
  ) {

    if (
      !profileMessage
    ) {

      return;
    }


    profileMessage.textContent =
      text;


    profileMessage.className =
      error
        ? "profile-message error"
        : "profile-message";
  }


  // ======================================================
  // NAME MESSAGE
  // ======================================================

  function showNameMessage(
    text,
    type = ""
  ) {

    if (
      !nameMessage
    ) {

      return;
    }


    nameMessage.textContent =
      text;


    nameMessage.className =
      "password-message";


    if (
      type
    ) {

      nameMessage.classList.add(
        type
      );
    }
  }


  // ======================================================
  // PASSWORD MESSAGE
  // ======================================================

  function showPasswordMessage(
    text,
    type = ""
  ) {

    if (
      !passwordMessage
    ) {

      return;
    }


    passwordMessage.textContent =
      text;


    passwordMessage.className =
      "password-message";


    if (
      type
    ) {

      passwordMessage.classList.add(
        type
      );
    }
  }


  // ======================================================
  // SHOW SAVED ACCOUNT IMMEDIATELY
  // ======================================================

  displayUser(
    auth.user
  );


  // ======================================================
  // LOAD PROFILE
  // ======================================================

  async function loadProfile() {

    try {

      const response =
        await fetch(
          `${API_BASE}/profile`,
          {

            headers: {

              Authorization:
                `Bearer ${token}`

            }

          }
        );


      let data =
        null;


      try {

        data =
          await response.json();

      } catch (error) {

        data =
          null;
      }


      if (
        !response.ok
      ) {

        throw new Error(
          data?.detail ||
          "Could not load profile."
        );
      }


      const updatedAuth = {

        ...auth,

        user: {

          user_id:
            data.user_id,

          name:
            data.name,

          email:
            data.email

        }

      };


      auth =
        updatedAuth;


      localStorage.setItem(
        AUTH_KEY,
        JSON.stringify(
          updatedAuth
        )
      );


      displayUser(
        updatedAuth.user
      );


      showProfileMessage(
        ""
      );


    } catch (error) {

      console.error(
        "Profile load error:",
        error
      );


      showProfileMessage(
        "Could not refresh profile from the backend. Your login is still saved.",
        true
      );
    }
  }


  // ======================================================
  // CHANGE NAME
  // ======================================================

  if (
    nameForm &&
    newNameInput &&
    changeNameButton
  ) {

    nameForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        showNameMessage(
          ""
        );


        const newName =
          newNameInput.value.trim();


        if (
          newName.length < 2
        ) {

          showNameMessage(
            "Name must contain at least 2 characters.",
            "error"
          );


          newNameInput.focus();


          return;
        }


        changeNameButton.disabled =
          true;


        changeNameButton.textContent =
          "Updating...";


        try {

          const response =
            await fetch(
              `${API_BASE}/profile/name`,
              {

                method:
                  "PUT",

                headers: {

                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`

                },

                body:
                  JSON.stringify({

                    name:
                      newName

                  })

              }
            );


          let data =
            null;


          try {

            data =
              await response.json();

          } catch (error) {

            data =
              null;
          }


          if (
            !response.ok
          ) {

            throw new Error(
              data?.detail ||
              "Could not update name."
            );
          }


          const updatedUser =
            data?.user || {

              user_id:
                auth?.user?.user_id,

              name:
                newName,

              email:
                auth?.user?.email

            };


          auth = {

            ...auth,

            user:
              updatedUser

          };


          localStorage.setItem(
            AUTH_KEY,
            JSON.stringify(
              auth
            )
          );


          displayUser(
            updatedUser
          );


          showNameMessage(
            "Name updated successfully.",
            "success"
          );


        } catch (error) {

          console.error(
            "Name update error:",
            error
          );


          showNameMessage(
            error?.message ||
            "Could not update name.",
            "error"
          );


        } finally {

          changeNameButton.disabled =
            false;


          changeNameButton.textContent =
            "Update name";
        }

      }
    );
  }


  // ======================================================
  // PASSWORD SHOW / HIDE
  // ======================================================

  document
    .querySelectorAll(
      ".password-toggle"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const input =
              document.getElementById(
                button.dataset.target
              );


            if (
              !input
            ) {

              return;
            }


            const show =
              input.type ===
              "password";


            input.type =
              show
                ? "text"
                : "password";


            button.textContent =
              show
                ? "Hide"
                : "Show";
          }
        );
      }
    );


  // ======================================================
  // CHANGE PASSWORD
  // ======================================================

  if (
    passwordForm
  ) {

    passwordForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        showPasswordMessage(
          ""
        );


        const current =
          currentPassword.value;


        const next =
          newPassword.value;


        const confirm =
          confirmPassword.value;


        if (
          current.length < 6
        ) {

          showPasswordMessage(
            "Enter your current password.",
            "error"
          );


          currentPassword.focus();


          return;
        }


        if (
          next.length < 6
        ) {

          showPasswordMessage(
            "New password must contain at least 6 characters.",
            "error"
          );


          newPassword.focus();


          return;
        }


        if (
          next !==
          confirm
        ) {

          showPasswordMessage(
            "New passwords do not match.",
            "error"
          );


          confirmPassword.focus();


          return;
        }


        if (
          current ===
          next
        ) {

          showPasswordMessage(
            "Your new password must be different.",
            "error"
          );


          return;
        }


        changePasswordButton.disabled =
          true;


        changePasswordButton.textContent =
          "Updating...";


        try {

          const response =
            await fetch(
              `${API_BASE}/profile/password`,
              {

                method:
                  "PUT",

                headers: {

                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`

                },

                body:
                  JSON.stringify({

                    current_password:
                      current,

                    new_password:
                      next

                  })

              }
            );


          let data =
            null;


          try {

            data =
              await response.json();

          } catch (error) {

            data =
              null;
          }


          if (
            !response.ok
          ) {

            throw new Error(
              data?.detail ||
              "Password update failed."
            );
          }


          currentPassword.value =
            "";


          newPassword.value =
            "";


          confirmPassword.value =
            "";


          showPasswordMessage(
            data?.message ||
            "Password changed successfully.",
            "success"
          );


        } catch (error) {

          console.error(
            "Password update error:",
            error
          );


          showPasswordMessage(
            error?.message ||
            "Could not change password.",
            "error"
          );


        } finally {

          changePasswordButton.disabled =
            false;


          changePasswordButton.textContent =
            "Update password";
        }

      }
    );
  }


  // ======================================================
  // MANUAL SIGN OUT
  // ======================================================

  signoutButton?.addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        AUTH_KEY
      );


      localStorage.removeItem(
        "cktsage-active-conversation"
      );


      sessionStorage.removeItem(
        "cktsage-active-conversation"
      );


      window.location.replace(
        "login.html"
      );

    }
  );


  // ======================================================
  // START
  // ======================================================

  loadProfile();


})();