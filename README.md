# CKTSage

Open `index.html` in a modern browser. The landing page includes an interactive circuit editor and a smooth prompt-to-chat transition. The cktsage chat UI lives in its own files: `chat.html`, `chat.css`, and `chat.js`.

## Circuit editor
- Add battery, resistor, LED, switch, and ground components.
- Drag parts to position them.
- Click two terminal dots to add a wire; click a wire and use **Delete selected** to remove it.
- Select a component and use **Delete selected** to remove it and its attached wires.
- Run the educational DC approximation to estimate current in a basic battery-resistor-LED series circuit.

The simulation is intentionally simplified, not a full SPICE engine or hardware safety tool. It assumes ideal wires and a fixed LED forward drop, and does not model temperature, component curves, parasitics, or real battery behavior.

## Chat integration
The landing page sends the submitted prompt to `chat.html?prompt=...`. `chat.js` provides the separate chat UI, but the assistant reply function is a placeholder until you connect a backend/model API. Do not put private API keys in browser JavaScript.


The chat sidebar is retractable on desktop and mobile, uses a translucent glass treatment, and includes working new-chat, recent-chat, send, prompt handoff, and delete controls for circuit parts/wires. The chat model backend remains a placeholder until a server API is connected.


Visual theme update: unified matte-black and graphite surfaces, restrained thunder-yellow accents, a soft yellow pointer aura, a smaller rounded prompt composer, focus glow while typing, and stronger layered shadows for depth.

## Login page
- Open `login.html` for the separate sign-in / create-account screen.
- The main page and chat page link to the login screen.
- This is a front-end demo only: form validation and demo session state are local to the browser. It does not create secure accounts, authenticate passwords, or send password-reset emails. Connect a server-side authentication provider before using it with real accounts.

The sign-in/create-account tabs now use a sliding active indicator and a subtle fade/slide transition when switching modes.


## Backend API integration
- `api.js` centralizes requests to your backend and keeps the API base URL in one place.
- `login.js` sends real register/login requests and no longer treats browser-only demo state as authentication.
- `chat.js` sends prompts to the configured backend endpoint.
- Read `API_SETUP.md` before using this: the provided `/docs` URL was not reachable from the build environment, so route names and response fields are configurable defaults and must be matched to your actual OpenAPI schema. Circuit/library API helper methods are included; page-level persistence requires mapping your API schema to the editor data model.
