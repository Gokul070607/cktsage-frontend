(() => {
  "use strict";

  // =====================================================
  // CKTSAGE AUTH / NAVIGATION
  // =====================================================

  const AUTH_KEY = "cktsage-auth";
  const PENDING_PROMPT_KEY = "cktsage-pending-prompt";

  function getSavedAuth() {
    try {
      return JSON.parse(
        localStorage.getItem(AUTH_KEY) || "null"
      );
    } catch (error) {
      console.error(
        "Could not read saved CKTSage login:",
        error
      );

      return null;
    }
  }

  function isLoggedIn() {
    const auth = getSavedAuth();

    return Boolean(
      auth &&
      auth.access_token
    );
  }

  function openChat() {
    if (isLoggedIn()) {
      window.location.href = "chat.html";
      return;
    }

    window.location.href =
      "login.html?next=" +
      encodeURIComponent("chat.html");
  }


  // =====================================================
  // PROTECTED CHAT LINKS
  // =====================================================

  document
    .querySelectorAll("[data-protected-chat]")
    .forEach(link => {

      link.addEventListener(
        "click",
        event => {

          event.preventDefault();

          openChat();
        }
      );

    });


  // =====================================================
  // POINTER AURA
  // =====================================================

  const aura =
    document.createElement("div");

  aura.id =
    "pointer-aura";

  aura.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.appendChild(
    aura
  );


  if (
    window.matchMedia(
      "(hover: hover) and (pointer: fine)"
    ).matches &&
    !window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {

    let frame = 0;

    let targetX =
      window.innerWidth / 2;

    let targetY =
      window.innerHeight / 2;

    let currentX =
      targetX;

    let currentY =
      targetY;


    window.addEventListener(
      "pointermove",
      event => {

        targetX =
          event.clientX;

        targetY =
          event.clientY;

        document.body.classList.add(
          "pointer-aura-active"
        );


        if (frame) {
          return;
        }


        const animate = () => {

          currentX +=
            (targetX - currentX) *
            0.18;

          currentY +=
            (targetY - currentY) *
            0.18;


          aura.style.setProperty(
            "--aura-x",
            `${currentX}px`
          );

          aura.style.setProperty(
            "--aura-y",
            `${currentY}px`
          );


          if (
            Math.abs(
              targetX - currentX
            ) > 0.5 ||
            Math.abs(
              targetY - currentY
            ) > 0.5
          ) {

            frame =
              window.requestAnimationFrame(
                animate
              );

          } else {

            frame = 0;
          }
        };


        frame =
          window.requestAnimationFrame(
            animate
          );

      },
      {
        passive: true
      }
    );


    window.addEventListener(
      "pointerleave",
      () => {

        document.body.classList.remove(
          "pointer-aura-active"
        );

      }
    );
  }


  // =====================================================
  // INTRO
  // =====================================================

  const body =
    document.body;

  const intro =
    document.getElementById(
      "intro"
    );

  const skip =
    document.getElementById(
      "skip-intro"
    );


  let finished =
    false;


  function finishIntro() {

    if (finished) {
      return;
    }

    finished =
      true;


    intro?.classList.add(
      "is-done"
    );


    body.classList.add(
      "ready"
    );


    body.classList.remove(
      "intro-loading"
    );
  }


  function lightOn() {

    intro?.classList.add(
      "is-on"
    );


    window.setTimeout(
      finishIntro,
      2100
    );
  }


  const reduced =
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;


  if (reduced) {

    intro?.classList.add(
      "is-on"
    );


    window.setTimeout(
      finishIntro,
      350
    );

  } else {

    window.setTimeout(
      lightOn,
      750
    );
  }


  skip?.addEventListener(
    "click",
    finishIntro
  );


  // =====================================================
  // WORKBENCH NAVIGATION
  // =====================================================

  document
    .querySelectorAll(
      'a[href="#circuit-lab"]'
    )
    .forEach(link => {

      link.addEventListener(
        "click",
        event => {

          const target =
            document.getElementById(
              "circuit-lab"
            );


          if (!target) {
            return;
          }


          event.preventDefault();


          finishIntro();


          target.scrollIntoView({
            behavior:
              reduced
                ? "auto"
                : "smooth",

            block:
              "start"
          });


          if (
            history.replaceState
          ) {

            history.replaceState(
              null,
              "",
              "#circuit-lab"
            );
          }
        }
      );

    });


  // =====================================================
  // ASK CKTSAGE
  // =====================================================

  const form =
    document.getElementById(
      "ask-form"
    );

  const input =
    document.getElementById(
      "ask-input"
    );


  form?.addEventListener(
    "submit",
    event => {

      event.preventDefault();


      const question =
        input?.value.trim() ||
        "";


      if (!question) {

        input?.focus();


        if (input) {
          input.placeholder =
            "Type a question to get started…";
        }


        return;
      }


      // =================================================
      // NOT LOGGED IN
      //
      // Keep the question in localStorage, then send the
      // visitor to Login. login.html will return them to
      // chat.html after successful sign-in.
      // =================================================

      if (!isLoggedIn()) {

        localStorage.setItem(
          PENDING_PROMPT_KEY,
          question
        );


        document.body.classList.add(
          "leaving-for-chat"
        );


        let transition =
          document.getElementById(
            "chat-transition"
          );


        if (!transition) {

          transition =
            document.createElement(
              "div"
            );


          transition.id =
            "chat-transition";


          transition.innerHTML =
            '<div class="transition-orb">ϟ</div>' +
            "<p>Sign in to bring your idea to the workbench…</p>";


          document.body.appendChild(
            transition
          );
        }


        requestAnimationFrame(
          () => {

            transition.classList.add(
              "is-visible"
            );

          }
        );


        window.setTimeout(
          () => {

            window.location.href =
              "login.html?next=" +
              encodeURIComponent(
                "chat.html"
              );

          },
          480
        );


        return;
      }


      // =================================================
      // LOGGED IN
      //
      // The existing URL prompt mechanism is retained.
      // chat.js will receive it and send it automatically.
      // =================================================

      document.body.classList.add(
        "leaving-for-chat"
      );


      let transition =
        document.getElementById(
          "chat-transition"
        );


      if (!transition) {

        transition =
          document.createElement(
            "div"
          );


        transition.id =
          "chat-transition";


        transition.innerHTML =
          '<div class="transition-orb">ϟ</div>' +
          "<p>Bringing your idea to the workbench…</p>";


        document.body.appendChild(
          transition
        );
      }


      requestAnimationFrame(
        () => {

          transition.classList.add(
            "is-visible"
          );

        }
      );


      window.setTimeout(
        () => {

          window.location.href =
            "chat.html?prompt=" +
            encodeURIComponent(
              question
            );

        },
        480
      );

    }
  );


  // =====================================================
  // SUGGESTED QUESTIONS
  // =====================================================

  document
    .querySelectorAll(
      "[data-question]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          if (!input) {
            return;
          }


          input.value =
            button.dataset.question ||
            "";


          input.focus();
        }
      );

    });


  // =====================================================
  // FEATURE CARD MOVEMENT
  // =====================================================

  document
    .querySelectorAll(
      ".feature"
    )
    .forEach(card => {

      card.addEventListener(
        "mousemove",
        event => {

          if (
            window.matchMedia(
              "(prefers-reduced-motion: reduce)"
            ).matches
          ) {
            return;
          }


          const rectangle =
            card.getBoundingClientRect();


          const x =
            (
              event.clientX -
              rectangle.left
            ) /
            rectangle.width -
            0.5;


          const y =
            (
              event.clientY -
              rectangle.top
            ) /
            rectangle.height -
            0.5;


          card.style.transform =
            `perspective(700px) ` +
            `rotateY(${x * 2}deg) ` +
            `rotateX(${-y * 2}deg) ` +
            `translateY(-2px)`;
        }
      );


      card.addEventListener(
        "mouseleave",
        () => {

          card.style.transform =
            "";

        }
      );

    });

})();


// =========================================================
// LIGHTWEIGHT EDUCATIONAL CIRCUIT EDITOR
// =========================================================

(() => {

  "use strict";


  const board =
    document.getElementById(
      "circuit-board"
    );


  if (!board) {
    return;
  }


  const svg =
    document.getElementById(
      "wire-layer"
    );


  const parts =
    new Map();


  const wires =
    [];


  let nextId =
    1;


  let selectedPart =
    null;


  let selectedWire =
    null;


  let pendingTerminal =
    null;


  const defaultPositions = {

    battery:
      [7, 14],

    resistor:
      [34, 17],

    led:
      [61, 14],

    ground:
      [78, 55],

    switch:
      [36, 57]

  };


  const definitions = {

    battery: {

      title:
        "Battery",

      graphic:
        "▣",

      value:
        "5 V DC",

      terminals:
        ["+", "−"],

      voltage:
        5
    },


    resistor: {

      title:
        "Resistor",

      graphic:
        "〰",

      value:
        "220 Ω",

      terminals:
        ["A", "B"],

      resistance:
        220
    },


    led: {

      title:
        "LED",

      graphic:
        "◉",

      value:
        "Red · 2 V nominal",

      terminals:
        ["A", "K"],

      drop:
        2
    },


    switch: {

      title:
        "Switch",

      graphic:
        "⏻",

      value:
        "Closed switch",

      terminals:
        ["1", "2"],

      closed:
        true
    },


    ground: {

      title:
        "Ground",

      graphic:
        "⏚",

      value:
        "0 V reference",

      terminals:
        ["GND"],

      ground:
        true
    }

  };


  // =====================================================
  // STATUS
  // =====================================================

  const status =
    (id, value) => {

      const element =
        document.getElementById(
          id
        );


      if (element) {

        element.textContent =
          value;
      }
    };


  // =====================================================
  // ADD PART
  // =====================================================

  function addPart(
    type,
    position
  ) {

    const definition =
      definitions[type];


    if (!definition) {
      return;
    }


    const id =
      "p" +
      nextId++;


    const element =
      document.createElement(
        "div"
      );


    element.className =
      "circuit-part";


    element.dataset.id =
      id;


    const terminals =
      definition.terminals
        .map(
          (terminal, index) =>

            `<button ` +
            `type="button" ` +
            `class="terminal" ` +
            `data-terminal="${index}" ` +
            `aria-label="${definition.title} terminal ${terminal}" ` +
            `title="Terminal ${terminal}">` +
            `</button>`
        )
        .join("");


    element.innerHTML =

      `<div class="part-head">` +

        `<span>${definition.title}</span>` +

        `<span>⠿</span>` +

      `</div>` +

      `<div class="part-graphic">` +
        `${definition.graphic}` +
      `</div>` +

      `<span class="part-value">` +
        `${definition.value}` +
      `</span>` +

      `<div class="terminal-row">` +
        `${terminals}` +
      `</div>`;


    board.appendChild(
      element
    );


    const positionToUse =
      position ||
      defaultPositions[type] ||
      [
        20 +
          Math.random() *
          55,

        20 +
          Math.random() *
          45
      ];


    const item = {

      id,

      type,

      el:
        element,

      x:
        positionToUse[0],

      y:
        positionToUse[1],

      def:
        definition

    };


    parts.set(
      id,
      item
    );


    place(
      item
    );


    selectPart(
      id
    );


    bindPart(
      item
    );


    renderWires();
  }


  // =====================================================
  // PLACE PART
  // =====================================================

  function place(
    item
  ) {

    const maxX =
      Math.max(
        0,
        board.clientWidth -
        item.el.offsetWidth
      );


    const maxY =
      Math.max(
        0,
        board.clientHeight -
        item.el.offsetHeight
      );


    item.x =
      Math.max(
        0,
        Math.min(
          maxX,
          item.x
        )
      );


    item.y =
      Math.max(
        0,
        Math.min(
          maxY,
          item.y
        )
      );


    item.el.style.left =
      item.x +
      "px";


    item.el.style.top =
      item.y +
      "px";
  }


  // =====================================================
  // TERMINAL POSITION
  // =====================================================

  function terminalPoint(
    id,
    index
  ) {

    const item =
      parts.get(
        id
      );


    if (!item) {
      return null;
    }


    const terminal =
      item.el.querySelector(
        `[data-terminal="${index}"]`
      );


    if (!terminal) {
      return null;
    }


    const terminalRect =
      terminal.getBoundingClientRect();


    const boardRect =
      board.getBoundingClientRect();


    return {

      x:
        terminalRect.left +
        terminalRect.width / 2 -
        boardRect.left,

      y:
        terminalRect.top +
        terminalRect.height / 2 -
        boardRect.top

    };
  }


  // =====================================================
  // BIND PART
  // =====================================================

  function bindPart(
    item
  ) {

    item.el.addEventListener(
      "click",
      event => {

        if (
          event.target.closest(
            ".terminal"
          )
        ) {
          return;
        }


        selectPart(
          item.id
        );
      }
    );


    item.el
      .querySelectorAll(
        ".terminal"
      )
      .forEach(
        terminal => {

          terminal.addEventListener(
            "click",
            event => {

              event.stopPropagation();


              selectPart(
                item.id
              );


              const selectedTerminal = {

                part:
                  item.id,

                index:
                  Number(
                    terminal.dataset.terminal
                  )

              };


              if (
                !pendingTerminal
              ) {

                pendingTerminal =
                  selectedTerminal;


                terminal.classList.add(
                  "pending"
                );


                status(
                  "sim-status",
                  "Wire endpoint selected"
                );


                return;
              }


              if (
                pendingTerminal.part ===
                  selectedTerminal.part &&
                pendingTerminal.index ===
                  selectedTerminal.index
              ) {

                pendingTerminal =
                  null;


                terminal.classList.remove(
                  "pending"
                );


                return;
              }


              wires.push({

                id:
                  "w" +
                  nextId++,

                a:
                  pendingTerminal,

                b:
                  selectedTerminal

              });


              board
                .querySelectorAll(
                  ".terminal.pending"
                )
                .forEach(
                  element => {

                    element.classList.remove(
                      "pending"
                    );

                  }
                );


              pendingTerminal =
                null;


              renderWires();


              status(
                "sim-status",
                "Wire connected"
              );


              status(
                "sim-explanation",
                "Connection added. Run simulation to check the circuit."
              );

            }
          );

        }
      );


    const head =
      item.el.querySelector(
        ".part-head"
      );


    head?.addEventListener(
      "pointerdown",
      event => {

        if (
          event.button !==
          0
        ) {
          return;
        }


        event.preventDefault();


        selectPart(
          item.id
        );


        const startX =
          event.clientX;


        const startY =
          event.clientY;


        const originalX =
          item.x;


        const originalY =
          item.y;


        head.setPointerCapture(
          event.pointerId
        );


        const move =
          moveEvent => {

            item.x =
              originalX +
              moveEvent.clientX -
              startX;


            item.y =
              originalY +
              moveEvent.clientY -
              startY;


            place(
              item
            );


            renderWires();
          };


        const up =
          () => {

            head.removeEventListener(
              "pointermove",
              move
            );


            head.removeEventListener(
              "pointerup",
              up
            );
          };


        head.addEventListener(
          "pointermove",
          move
        );


        head.addEventListener(
          "pointerup",
          up
        );

      }
    );
  }


  // =====================================================
  // SELECT PART
  // =====================================================

  function selectPart(
    id
  ) {

    selectedPart =
      id;


    selectedWire =
      null;


    parts.forEach(
      part => {

        part.el.classList.toggle(
          "selected",
          part.id === id
        );

      }
    );


    renderWires();
  }


  // =====================================================
  // RENDER WIRES
  // =====================================================

  function renderWires() {

    if (!svg) {
      return;
    }


    svg.setAttribute(
      "viewBox",
      `0 0 ${board.clientWidth} ${board.clientHeight}`
    );


    svg.innerHTML =
      "";


    wires.forEach(
      wire => {

        const pointA =
          terminalPoint(
            wire.a.part,
            wire.a.index
          );


        const pointB =
          terminalPoint(
            wire.b.part,
            wire.b.index
          );


        if (
          !pointA ||
          !pointB
        ) {
          return;
        }


        const middle =
          (
            pointA.x +
            pointB.x
          ) /
          2;


        const path =
          document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path"
          );


        path.setAttribute(
          "d",
          `M ${pointA.x} ${pointA.y} ` +
          `C ${middle} ${pointA.y}, ` +
          `${middle} ${pointB.y}, ` +
          `${pointB.x} ${pointB.y}`
        );


        path.setAttribute(
          "class",
          "wire-line" +
          (
            selectedWire ===
            wire.id
              ? " selected"
              : ""
          )
        );


        path.style.pointerEvents =
          "stroke";


        path.style.cursor =
          "pointer";


        path.addEventListener(
          "click",
          () => {

            selectedWire =
              wire.id;


            selectedPart =
              null;


            parts.forEach(
              part => {

                part.el.classList.remove(
                  "selected"
                );

              }
            );


            renderWires();


            status(
              "sim-status",
              "Wire selected"
            );
          }
        );


        svg.appendChild(
          path
        );

      }
    );
  }


  // =====================================================
  // DELETE SELECTED
  // =====================================================

  function deleteSelected() {

    if (
      selectedWire
    ) {

      const index =
        wires.findIndex(
          wire =>
            wire.id ===
            selectedWire
        );


      if (
        index >= 0
      ) {

        wires.splice(
          index,
          1
        );
      }


      selectedWire =
        null;


    } else if (
      selectedPart
    ) {

      parts
        .get(
          selectedPart
        )
        ?.el.remove();


      parts.delete(
        selectedPart
      );


      const remainingWires =
        wires.filter(
          wire =>
            wire.a.part !==
              selectedPart &&
            wire.b.part !==
              selectedPart
        );


      wires.splice(
        0,
        wires.length,
        ...remainingWires
      );


      selectedPart =
        null;
    }


    renderWires();


    status(
      "sim-status",
      "Item deleted"
    );


    status(
      "sim-current",
      "— mA"
    );


    status(
      "sim-power",
      "— mW"
    );
  }


  // =====================================================
  // SIMULATE
  // =====================================================

  function simulate() {

    const batteries =
      [...parts.values()]
        .filter(
          part =>
            part.type ===
            "battery"
        );


    const leds =
      [...parts.values()]
        .filter(
          part =>
            part.type ===
            "led"
        );


    const resistors =
      [...parts.values()]
        .filter(
          part =>
            part.type ===
            "resistor"
        );


    const switches =
      [...parts.values()]
        .filter(
          part =>
            part.type ===
            "switch"
        );


    const connections =
      new Map();


    wires.forEach(
      wire => {

        const a =
          `${wire.a.part}:${wire.a.index}`;


        const b =
          `${wire.b.part}:${wire.b.index}`;


        if (
          !connections.has(
            a
          )
        ) {

          connections.set(
            a,
            []
          );
        }


        if (
          !connections.has(
            b
          )
        ) {

          connections.set(
            b,
            []
          );
        }


        connections
          .get(a)
          .push(b);


        connections
          .get(b)
          .push(a);

      }
    );


    function connected(
      a,
      b
    ) {

      const seen =
        new Set(
          [a]
        );


      const queue =
        [a];


      while (
        queue.length
      ) {

        const node =
          queue.shift();


        if (
          node ===
          b
        ) {

          return true;
        }


        (
          connections.get(
            node
          ) ||
          []
        ).forEach(
          value => {

            if (
              !seen.has(
                value
              )
            ) {

              seen.add(
                value
              );


              queue.push(
                value
              );
            }
          }
        );
      }


      return false;
    }


    const battery =
      batteries[0];


    const led =
      leds[0];


    const resistor =
      resistors[0];


    const fail =
      message => {

        status(
          "sim-status",
          "No current"
        );


        status(
          "sim-voltage",
          battery
            ? battery.def.voltage +
              " V"
            : "— V"
        );


        status(
          "sim-current",
          "0 mA"
        );


        status(
          "sim-power",
          "0 mW"
        );


        status(
          "sim-explanation",
          message
        );


        leds.forEach(
          part => {

            part.el.classList.remove(
              "part-led",
              "on"
            );

          }
        );
      };


    if (
      !battery ||
      !led ||
      !resistor
    ) {

      fail(
        "Add a battery, a resistor, and an LED to test a basic series circuit."
      );

      return;
    }


    if (
      switches.some(
        switchPart =>
          !switchPart.def.closed
      )
    ) {

      fail(
        "The switch is open, so the circuit is interrupted."
      );

      return;
    }


    const plus =
      `${battery.id}:0`;


    const minus =
      `${battery.id}:1`;


    const resistorA =
      `${resistor.id}:0`;


    const resistorB =
      `${resistor.id}:1`;


    const ledAnode =
      `${led.id}:0`;


    const ledCathode =
      `${led.id}:1`;


    const forward =
      connected(
        plus,
        resistorA
      ) &&
      connected(
        resistorB,
        ledAnode
      ) &&
      connected(
        ledCathode,
        minus
      );


    const reverse =
      connected(
        plus,
        resistorB
      ) &&
      connected(
        resistorA,
        ledCathode
      ) &&
      connected(
        ledAnode,
        minus
      );


    if (
      !forward &&
      !reverse
    ) {

      fail(
        "No complete series path found. Connect battery + → resistor → LED anode (A) → LED cathode (K) → battery −."
      );

      return;
    }


    if (
      reverse
    ) {

      fail(
        "The LED is reverse-biased in this simple model. Swap its A and K connections."
      );

      return;
    }


    const voltage =
      battery.def.voltage;


    const drop =
      led.def.drop;


    const resistance =
      resistor.def.resistance;


    if (
      voltage <=
      drop
    ) {

      fail(
        "Supply voltage is too low to exceed the LED’s nominal forward drop."
      );

      return;
    }


    const current =
      (
        voltage -
        drop
      ) /
      resistance;


    const power =
      current *
      current *
      resistance;


    status(
      "sim-status",
      "Circuit conducting"
    );


    status(
      "sim-voltage",
      voltage.toFixed(2) +
      " V"
    );


    status(
      "sim-current",
      (
        current *
        1000
      ).toFixed(2) +
      " mA"
    );


    status(
      "sim-power",
      (
        power *
        1000
      ).toFixed(2) +
      " mW"
    );


    led.el.classList.add(
      "part-led",
      "on"
    );


    status(
      "sim-explanation",
      `Estimated series current = ` +
      `(Vs − VLED) / R = ` +
      `(${voltage} − ${drop}) / ${resistance} ` +
      `≈ ${(current * 1000).toFixed(2)} mA. ` +
      `Idealized model; wire resistance, temperature, ` +
      `LED curve, and source limits are omitted.`
    );
  }


  // =====================================================
  // BUTTON EVENTS
  // =====================================================

  document
    .querySelectorAll(
      "[data-add-part]"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            addPart(
              button.dataset.addPart
            );

          }
        );

      }
    );


  document
    .getElementById(
      "delete-selected"
    )
    ?.addEventListener(
      "click",
      deleteSelected
    );


  document
    .getElementById(
      "clear-lab"
    )
    ?.addEventListener(
      "click",
      () => {

        parts.forEach(
          part => {

            part.el.remove();

          }
        );


        parts.clear();


        wires.length =
          0;


        selectedPart =
          null;


        selectedWire =
          null;


        pendingTerminal =
          null;


        renderWires();


        status(
          "sim-status",
          "Board cleared"
        );


        status(
          "sim-voltage",
          "— V"
        );


        status(
          "sim-current",
          "— mA"
        );


        status(
          "sim-power",
          "— mW"
        );

      }
    );


  document
    .getElementById(
      "simulate-lab"
    )
    ?.addEventListener(
      "click",
      simulate
    );


  document
    .getElementById(
      "wire-mode"
    )
    ?.addEventListener(
      "click",
      () => {

        pendingTerminal =
          null;


        board
          .querySelectorAll(
            ".terminal.pending"
          )
          .forEach(
            element => {

              element.classList.remove(
                "pending"
              );

            }
          );


        status(
          "sim-status",
          "Ready to wire"
        );


        status(
          "sim-explanation",
          "Click one terminal dot, then a second terminal dot to add a wire."
        );

      }
    );


  // =====================================================
  // RESIZE
  // =====================================================

  window.addEventListener(
    "resize",
    () => {

      parts.forEach(
        place
      );


      renderWires();
    }
  );


  // =====================================================
  // DEFAULT COMPONENTS
  // =====================================================

  addPart(
    "battery",
    [
      0.06 *
        board.clientWidth,

      0.14 *
        board.clientHeight
    ]
  );


  addPart(
    "resistor",
    [
      0.31 *
        board.clientWidth,

      0.14 *
        board.clientHeight
    ]
  );


  addPart(
    "led",
    [
      0.56 *
        board.clientWidth,

      0.14 *
        board.clientHeight
    ]
  );

})();