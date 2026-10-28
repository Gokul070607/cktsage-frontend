(() => {
  "use strict";


  // =====================================================
  // CONFIG
  // =====================================================

  if (
    !window.CKTSAGE_CONFIG ||
    !window.CKTSAGE_CONFIG.API_BASE
  ) {
    console.error(
      "CKTSage backend configuration is missing."
    );

    alert(
      "CKTSage configuration could not be loaded."
    );

    return;
  }


  const API_BASE =
    window.CKTSAGE_CONFIG.API_BASE;


  const AUTH_KEY =
    "cktsage-auth";


  const ACTIVE_CHAT_KEY =
    "cktsage-active-conversation";


  // =====================================================
  // AUTH
  // =====================================================

  let auth = null;


  try {
    auth = JSON.parse(
      localStorage.getItem(
        AUTH_KEY
      ) || "null"
    );

  } catch (error) {
    console.error(
      "Auth read error:",
      error
    );

    auth = null;
  }
  // Guest mode: pages remain accessible without signing in.
const TOKEN =
    auth?.access_token || "";


  // =====================================================
  // ELEMENTS
  // =====================================================

  const libraryGrid =
    document.getElementById(
      "library-grid"
    );


  const resourceCount =
    document.getElementById(
      "resource-count"
    );


  const libraryStatus =
    document.getElementById(
      "library-status"
    );


  const searchInput =
    document.getElementById(
      "library-search"
    );


  const addResourceButton =
    document.getElementById(
      "add-resource-toggle"
    );


  const cancelAddButton =
    document.getElementById(
      "cancel-add"
    );


  const addResourcePanel =
    document.getElementById(
      "add-resource-panel"
    );


  const resourceForm =
    document.getElementById(
      "resource-form"
    );


  const resourceTitle =
    document.getElementById(
      "resource-title"
    );


  const resourceType =
    document.getElementById(
      "resource-type"
    );


  const resourceUrlWrap =
    document.getElementById(
      "resource-url-wrap"
    );


  const resourceUrl =
    document.getElementById(
      "resource-url"
    );


  const resourceFileWrap =
    document.getElementById(
      "resource-file-wrap"
    );


  const resourceFile =
    document.getElementById(
      "resource-file"
    );


  const selectedFileName =
    document.getElementById(
      "selected-file-name"
    );


  const resourceDescription =
    document.getElementById(
      "resource-description"
    );


  const saveResourceButton =
    document.getElementById(
      "save-resource"
    );


  // =====================================================
  // STATE
  // =====================================================

  let libraryItems = [];

  let searchTerm = "";

  let savingResource = false;

  let usingInChat = false;


  // =====================================================
  // HELPERS
  // =====================================================

  function setStatus(
    message = "",
    isError = false
  ) {
    if (!libraryStatus) {
      return;
    }


    libraryStatus.textContent =
      message;


    libraryStatus.classList.toggle(
      "error",
      Boolean(isError)
    );
  }


  function getItemId(
    item
  ) {
    return Number(
      item?.library_item_id ??
      item?.id ??
      0
    );
  }


  function getItemTitle(
    item
  ) {
    return (
      item?.title ||
      item?.file_name ||
      "Library resource"
    );
  }


  function getItemType(
    item
  ) {
    return (
      item?.item_type ||
      "resource"
    );
  }


  function getItemText(
    item
  ) {
    return (
      item?.text_content ||
      ""
    );
  }


  function escapeHtmlForDocument(
    value
  ) {
    return String(
      value ?? ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );
  }


  // =====================================================
  // API
  // =====================================================

  async function apiFetch(
    path,
    options = {}
  ) {
    const headers = {
      Authorization:
        `Bearer ${TOKEN}`,

      ...(options.headers || {})
    };


    if (
      options.body &&
      !(
        options.body instanceof
        FormData
      )
    ) {
      headers["Content-Type"] =
        "application/json";
    }


    let response;


    try {
      response =
        await fetch(
          `${API_BASE}${path}`,
          {
            ...options,
            headers
          }
        );

    } catch (error) {
      console.error(
        "Backend network error:",
        error
      );


      throw new Error(
        "Cannot connect to backend."
      );
    }


    let data = null;


    try {
      data =
        await response.json();

    } catch (error) {
      data = null;
    }


    if (
      response.status === 401
    ) {
      console.error(
        "Authentication rejected by backend."
      );


      throw new Error(
        "Authentication was rejected by the backend."
      );
    }


    if (
      !response.ok
    ) {
      let detail =
        data?.detail ||
        data?.message;


      if (
        Array.isArray(detail)
      ) {
        detail =
          detail
            .map(
              item =>
                item?.msg ||
                JSON.stringify(
                  item
                )
            )
            .join(", ");
      }


      throw new Error(
        detail ||
        `Backend error ${response.status}`
      );
    }


    return data;
  }


  // =====================================================
  // ADD RESOURCE PANEL
  // =====================================================

  function openAddPanel() {
    if (
      !addResourcePanel
    ) {
      return;
    }


    addResourcePanel.hidden =
      false;


    setStatus("");


    updateResourceType();


    resourceTitle?.focus();


    requestAnimationFrame(
      () => {
        addResourcePanel.scrollIntoView({
          behavior:
            "smooth",

          block:
            "start"
        });
      }
    );
  }


  function closeAddPanel() {
    if (
      !addResourcePanel
    ) {
      return;
    }


    addResourcePanel.hidden =
      true;


    resourceForm?.reset();


    if (
      selectedFileName
    ) {
      selectedFileName.textContent =
        "No file selected";
    }


    updateResourceType();

    setStatus("");
  }


  addResourceButton?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      openAddPanel();
    }
  );


  cancelAddButton?.addEventListener(
    "click",
    event => {
      event.preventDefault();

      closeAddPanel();
    }
  );


  // =====================================================
  // RESOURCE TYPE
  // =====================================================

  function updateResourceType() {
    const type =
      resourceType?.value ||
      "note";


    if (
      resourceUrlWrap
    ) {
      resourceUrlWrap.hidden =
        type !== "link";
    }


    if (
      resourceFileWrap
    ) {
      resourceFileWrap.hidden =
        type !== "file";
    }


    if (
      resourceUrl
    ) {
      resourceUrl.required =
        type === "link";
    }


    if (
      resourceFile
    ) {
      resourceFile.required =
        type === "file";
    }
  }


  resourceType?.addEventListener(
    "change",
    updateResourceType
  );


  // =====================================================
  // FILE SELECTION
  // =====================================================

  resourceFile?.addEventListener(
    "change",
    () => {
      const file =
        resourceFile.files?.[0];


      if (
        !selectedFileName
      ) {
        return;
      }


      selectedFileName.textContent =
        file
          ? `Selected: ${file.name}`
          : "No file selected";
    }
  );


  // =====================================================
  // SAVE RESOURCE
  // =====================================================

  resourceForm?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();


      if (
        savingResource
      ) {
        return;
      }


      const title =
        resourceTitle?.value?.trim() ||
        "";


      const type =
        resourceType?.value ||
        "note";


      const description =
        resourceDescription?.value?.trim() ||
        "";


      const url =
        resourceUrl?.value?.trim() ||
        "";


      const file =
        resourceFile?.files?.[0] ||
        null;


      if (
        !title
      ) {
        setStatus(
          "Please enter a title.",
          true
        );


        resourceTitle?.focus();

        return;
      }


      if (
        type === "link" &&
        !url
      ) {
        setStatus(
          "Please enter a web link.",
          true
        );

        return;
      }


      if (
        type === "file" &&
        !file
      ) {
        setStatus(
          "Please choose a file or image.",
          true
        );

        return;
      }


      savingResource =
        true;


      if (
        saveResourceButton
      ) {
        saveResourceButton.disabled =
          true;


        saveResourceButton.textContent =
          type === "file"
            ? "Uploading..."
            : "Saving...";
      }


      try {

        // NOTE
        if (
          type === "note"
        ) {
          await apiFetch(
            "/library",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  title,
                  item_type:
                    "note",
                  url:
                    null,
                  text_content:
                    description ||
                    null
                })
            }
          );
        }


        // LINK
        else if (
          type === "link"
        ) {
          await apiFetch(
            "/library",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  title,
                  item_type:
                    "link",
                  url,
                  text_content:
                    description ||
                    null
                })
            }
          );
        }


        // FILE
        else if (
          type === "file"
        ) {
          const formData =
            new FormData();


          formData.append(
            "title",
            title
          );


          formData.append(
            "description",
            description
          );


          formData.append(
            "file",
            file
          );


          await apiFetch(
            "/library/upload",
            {
              method:
                "POST",

              body:
                formData
            }
          );
        }


        resourceForm?.reset();


        if (
          selectedFileName
        ) {
          selectedFileName.textContent =
            "No file selected";
        }


        if (
          addResourcePanel
        ) {
          addResourcePanel.hidden =
            true;
        }


        updateResourceType();


        await loadLibrary();


        setStatus(
          "Resource added successfully."
        );


      } catch (error) {
        console.error(
          "Save resource error:",
          error
        );


        setStatus(
          error.message ||
          "Could not add resource.",
          true
        );


        alert(
          error.message ||
          "Could not add resource."
        );


      } finally {
        savingResource =
          false;


        if (
          saveResourceButton
        ) {
          saveResourceButton.disabled =
            false;


          saveResourceButton.textContent =
            "Save to library";
        }
      }
    }
  );


  // =====================================================
  // LOAD LIBRARY
  // =====================================================

  async function loadLibrary() {
    if (
      libraryGrid
    ) {
      libraryGrid.innerHTML = `
        <div class="library-loading">
          Loading your library…
        </div>
      `;
    }


    try {
      const data =
        await apiFetch(
          "/library"
        );


      libraryItems =
        Array.isArray(
          data
        )
          ? data
          : [];


      renderLibrary();


      setStatus("");


    } catch (error) {
      console.error(
        "Load library error:",
        error
      );


      if (
        libraryGrid
      ) {
        libraryGrid.innerHTML = `
          <div class="library-empty-state">
            Could not load library.
          </div>
        `;
      }


      setStatus(
        error.message ||
        "Could not load library.",
        true
      );
    }
  }


  // =====================================================
  // RENDER LIBRARY
  // =====================================================

  function renderLibrary() {
    if (
      !libraryGrid
    ) {
      return;
    }


    const query =
      searchTerm
        .trim()
        .toLowerCase();


    const filtered =
      libraryItems.filter(
        item => {
          if (
            !query
          ) {
            return true;
          }


          const searchable = [
            getItemTitle(
              item
            ),

            getItemText(
              item
            ),

            getItemType(
              item
            ),

            item.file_name ||
            "",

            item.url ||
            ""
          ]
            .join(" ")
            .toLowerCase();


          return searchable.includes(
            query
          );
        }
      );


    if (
      resourceCount
    ) {
      resourceCount.textContent =
        `${filtered.length} ${
          filtered.length === 1
            ? "resource"
            : "resources"
        }`;
    }


    libraryGrid.innerHTML =
      "";


    if (
      !filtered.length
    ) {
      const empty =
        document.createElement(
          "div"
        );


      empty.className =
        "library-empty-state";


      empty.textContent =
        query
          ? "No resources match your search."
          : "Your Library is empty.";


      libraryGrid.appendChild(
        empty
      );

      return;
    }


    filtered.forEach(
      item => {
        libraryGrid.appendChild(
          createLibraryCard(
            item
          )
        );
      }
    );
  }


  // =====================================================
  // CREATE CARD
  // =====================================================

  function createLibraryCard(
    item
  ) {
    const card =
      document.createElement(
        "article"
      );


    card.className =
      "library-card";


    const itemId =
      getItemId(
        item
      );


    const title =
      getItemTitle(
        item
      );


    const type =
      getItemType(
        item
      );


    const text =
      getItemText(
        item
      );


    const top =
      document.createElement(
        "div"
      );


    top.className =
      "library-card-top";


    const badge =
      document.createElement(
        "span"
      );


    badge.className =
      "library-card-type";


    badge.textContent =
      type;


    top.appendChild(
      badge
    );


    card.appendChild(
      top
    );


    // TITLE
    const heading =
      document.createElement(
        "h3"
      );


    heading.textContent =
      title;


    card.appendChild(
      heading
    );


    // DESCRIPTION
    if (
      text
    ) {
      const description =
        document.createElement(
          "p"
        );


      description.className =
        "library-card-description";


      description.textContent =
        text;


      card.appendChild(
        description
      );
    }


    // FILE
    if (
      item.file_name
    ) {
      const fileInfo =
        document.createElement(
          "div"
        );


      fileInfo.className =
        "library-file-info";


      const extension =
        item.file_name
          .split(".")
          .pop()
          ?.toLowerCase();


      const isImage =
        [
          "png",
          "jpg",
          "jpeg",
          "webp"
        ].includes(
          extension
        );


      fileInfo.textContent =
        isImage
          ? `🖼 ${item.file_name}`
          : `📄 ${item.file_name}`;


      card.appendChild(
        fileInfo
      );
    }


    // LINK
    if (
      item.url
    ) {
      const link =
        document.createElement(
          "a"
        );


      link.className =
        "library-card-link";


      link.href =
        item.url;


      link.target =
        "_blank";


      link.rel =
        "noopener noreferrer";


      link.textContent =
        item.url;


      card.appendChild(
        link
      );
    }


    // ACTIONS
    const actions =
      document.createElement(
        "div"
      );


    actions.className =
      "library-card-actions";


    // USE IN CHAT
    const useButton =
      document.createElement(
        "button"
      );


    useButton.type =
      "button";


    useButton.className =
      "use-in-chat-btn";


    useButton.textContent =
      "Use in Chat";


    useButton.addEventListener(
      "click",
      () => {
        useInChat(
          itemId,
          title,
          useButton
        );
      }
    );


    // VIEW
    const viewButton =
      document.createElement(
        "button"
      );


    viewButton.type =
      "button";


    viewButton.className =
      "use-in-chat-btn";


    viewButton.textContent =
      "View";


    viewButton.addEventListener(
      "click",
      () => {
        viewResource(
          item,
          viewButton
        );
      }
    );


    // DELETE
    const deleteButton =
      document.createElement(
        "button"
      );


    deleteButton.type =
      "button";


    deleteButton.className =
      "delete-resource-btn";


    deleteButton.textContent =
      "Delete";


    deleteButton.addEventListener(
      "click",
      () => {
        deleteLibraryItem(
          itemId,
          title
        );
      }
    );


    actions.append(
      useButton,
      viewButton,
      deleteButton
    );


    card.appendChild(
      actions
    );


    return card;
  }


  // =====================================================
  // VIEW RESOURCE
  // =====================================================

  async function viewResource(
    item,
    button
  ) {
    const itemId =
      getItemId(
        item
      );


    const type =
      getItemType(
        item
      );


    const title =
      getItemTitle(
        item
      );


    const originalText =
      button.textContent;


    // LINK
    if (
      type === "link" &&
      item.url
    ) {
      window.open(
        item.url,
        "_blank",
        "noopener,noreferrer"
      );

      return;
    }


    // NOTE
    if (
      type === "note"
    ) {
      const noteWindow =
        window.open(
          "",
          "_blank"
        );


      if (
        !noteWindow
      ) {
        alert(
          "Please allow pop-ups to view this note."
        );

        return;
      }


      const safeTitle =
        escapeHtmlForDocument(
          title
        );


      const safeText =
        escapeHtmlForDocument(
          item.text_content ||
          "No content saved."
        );


      noteWindow.document.write(`
        <!doctype html>
        <html lang="en">

        <head>
          <meta charset="utf-8">

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          >

          <title>${safeTitle}</title>

          <style>
            body {
              margin: 0;
              background: #080808;
              color: #f5f5f5;
              font-family: Arial, Helvetica, sans-serif;
              padding: 40px 20px;
            }

            main {
              max-width: 800px;
              margin: auto;
            }

            h1 {
              color: #ffd800;
              margin-bottom: 24px;
            }

            .note {
              white-space: pre-wrap;
              line-height: 1.7;
              background: #141414;
              border: 1px solid #2d2d2d;
              border-radius: 14px;
              padding: 22px;
            }
          </style>
        </head>

        <body>
          <main>

            <h1>
              ${safeTitle}
            </h1>

            <div class="note">
              ${safeText}
            </div>

          </main>
        </body>

        </html>
      `);


      noteWindow.document.close();

      return;
    }


    // FILE
    if (
      type === "file"
    ) {
      const previewWindow =
        window.open(
          "",
          "_blank"
        );


      if (
        !previewWindow
      ) {
        alert(
          "Please allow pop-ups to view this file."
        );

        return;
      }


      previewWindow.document.write(`
        <!doctype html>

        <html>

        <head>
          <title>Loading...</title>
        </head>

        <body
          style="
            background:#080808;
            color:white;
            font-family:Arial,sans-serif;
            padding:30px;
          "
        >
          Loading resource...
        </body>

        </html>
      `);


      try {
        button.disabled =
          true;


        button.textContent =
          "Opening...";


        const response =
          await fetch(
            `${API_BASE}/library/${itemId}/file`,
            {
              headers: {
                Authorization:
                  `Bearer ${TOKEN}`
              }
            }
          );


        if (
          response.status === 401
        ) {
          previewWindow.close();


          throw new Error(
            "Authentication was rejected by the backend."
          );
        }


        if (
          !response.ok
        ) {
          let message =
            "Could not open file.";


          try {
            const data =
              await response.json();


            message =
              data.detail ||
              data.message ||
              message;

          } catch (error) {
            // Ignore JSON parsing failure.
          }


          previewWindow.close();


          throw new Error(
            message
          );
        }


        const blob =
          await response.blob();


        const objectUrl =
          URL.createObjectURL(
            blob
          );


        previewWindow.location.href =
          objectUrl;


        setTimeout(
          () => {
            URL.revokeObjectURL(
              objectUrl
            );
          },
          60000
        );


      } catch (error) {
        console.error(
          "View resource error:",
          error
        );


        try {
          previewWindow.close();

        } catch (closeError) {
          // Ignore.
        }


        alert(
          error.message ||
          "Could not view resource."
        );


      } finally {
        button.disabled =
          false;


        button.textContent =
          originalText;
      }


      return;
    }


    alert(
      "This resource cannot be previewed."
    );
  }


  // =====================================================
  // USE IN CHAT
  // =====================================================

  async function useInChat(
    libraryItemId,
    title,
    button
  ) {
    if (
      usingInChat
    ) {
      return;
    }


    usingInChat =
      true;


    const oldText =
      button.textContent;


    button.disabled =
      true;


    button.textContent =
      "Opening...";


    setStatus(
      "Preparing resource for chat..."
    );


    try {

      // IMPORTANT:
      // Chat uses localStorage, so Library must too.
      let conversationId =
        Number(
          localStorage.getItem(
            ACTIVE_CHAT_KEY
          )
        );


      // Verify the existing conversation.
      if (
        conversationId > 0
      ) {
        try {
          await apiFetch(
            `/conversations/${conversationId}/messages`
          );

        } catch (error) {
          console.warn(
            "Saved conversation is no longer available:",
            error
          );


          conversationId =
            0;


          localStorage.removeItem(
            ACTIVE_CHAT_KEY
          );
        }
      }


      // Create a new conversation if needed.
      if (
        !conversationId
      ) {
        let conversationTitle =
          `Analyze ${title}`;


        if (
          conversationTitle.length >
          60
        ) {
          conversationTitle =
            conversationTitle.slice(
              0,
              57
            ) + "...";
        }


        const conversation =
          await apiFetch(
            "/conversations",
            {
              method:
                "POST",

              body:
                JSON.stringify({
                  title:
                    conversationTitle
                })
            }
          );


        conversationId =
          Number(
            conversation
              ?.conversation_id
          );


        if (
          !conversationId
        ) {
          throw new Error(
            "Could not create conversation."
          );
        }
      }


      // Save active chat persistently.
      localStorage.setItem(
        ACTIVE_CHAT_KEY,
        String(
          conversationId
        )
      );


      // Attach resource.
      await apiFetch(
        `/conversations/${conversationId}/library`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              library_item_id:
                Number(
                  libraryItemId
                )
            })
        }
      );


      setStatus(
        "Resource attached. Opening Chat..."
      );


      window.location.href =
        "chat.html";


    } catch (error) {
      console.error(
        "Use in Chat error:",
        error
      );


      setStatus(
        error.message ||
        "Could not attach resource.",
        true
      );


      alert(
        error.message ||
        "Could not attach resource."
      );


      usingInChat =
        false;


      button.disabled =
        false;


      button.textContent =
        oldText;
    }
  }


  // =====================================================
  // DELETE RESOURCE
  // =====================================================

  async function deleteLibraryItem(
    libraryItemId,
    title
  ) {
    const confirmed =
      window.confirm(
        `Delete "${title}" from your Library?`
      );


    if (
      !confirmed
    ) {
      return;
    }


    try {
      setStatus(
        "Deleting resource..."
      );


      await apiFetch(
        `/library/${libraryItemId}`,
        {
          method:
            "DELETE"
        }
      );


      libraryItems =
        libraryItems.filter(
          item =>
            getItemId(
              item
            ) !==
            Number(
              libraryItemId
            )
        );


      renderLibrary();


      setStatus(
        "Resource deleted."
      );


    } catch (error) {
      console.error(
        "Delete resource error:",
        error
      );


      setStatus(
        error.message ||
        "Could not delete resource.",
        true
      );
    }
  }


  // =====================================================
  // SEARCH
  // =====================================================

  searchInput?.addEventListener(
    "input",
    () => {
      searchTerm =
        searchInput.value ||
        "";


      renderLibrary();
    }
  );


  // =====================================================
  // START
  // =====================================================

  async function start() {
    updateResourceType();


    await loadLibrary();
  }


  start();

})();