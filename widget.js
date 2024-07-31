(function () {
  var w = window;
  var d = document;
  var appContainer, toggleButton, iframe;
  let bootConfig = {};
  var initialized = false;

  const appUrl = "https://frontend.web2chat.ai";

  function isMobileLayout() {
    return window.innerWidth <= 450;
  }

  // Default configuration
  var config = {
    app_id: null,
    height: 704,
    width: 400,
    isOpen: false,
    isExpanded: false,
    isLoaded: false,
    icon: null,
    appUrl: appUrl,
    primary_color: "#007aff",
    custom_launcher_selector: null,
    hide_default_launcher: false,
    is_mobile: isMobileLayout(),
    alignment: "right",
    vertical_padding: 20,
    horizontal_padding: 20,
  };

  const defaultConfigKeys = Object.keys(config);

  w.addEventListener("message", function (event) {
    if (event.origin !== appUrl) return;
    if (event.data.type === "configuration") {
      updateConfig({ ...event.data.config, isLoaded: true });
    }
    if (event.data.type === "visibility") {
      updateConfig({ isExpanded: event.data.expanded || false });
      toggleAppVisibility(event.data.visibility);
    }
    if (event.data.type === "expanded") {
      updateConfig({ isExpanded: event.data.expanded || false });
    }
  });

  function filterUserConfig(config) {
    let filteredConfig = {};
    Object.keys(config).forEach((key) => {
      if (!defaultConfigKeys.includes(key)) {
        filteredConfig[key] = config[key];
      }
    });
    return filteredConfig;
  }

  function checkLayout() {
    const newValue = isMobileLayout();
    if (newValue !== config.is_mobile) {
      config.is_mobile = newValue;
      updateContainer();
    }
  }

  function attachCustomLauncherListeners() {
    // Check if a custom launcher selector is specified
    if (config.custom_launcher_selector) {
      var elements = document.querySelectorAll(config.custom_launcher_selector);
      elements.forEach((element) => {
        element.addEventListener("click", () => {
          iframe.contentWindow.postMessage(
            { type: "showSpace", data: { space: "home" } },
            appUrl
          );
          toggleAppVisibility(true); // Assuming you want to open the chat when these elements are clicked
        });
      });
    }
  }

  function updateToggleButtonContent() {
    if (!toggleButton) return;
    if (config.isOpen) {
      toggleButton.innerHTML = `
          <div style="opacity: 100; display: flex; align-items: center; justify-content: center; position: absolute; top: 0; left: 0; width: 48px; height: 48px; user-select: none;">
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd" clip-rule="evenodd" d="M18.601 8.39897C18.269 8.06702 17.7309 8.06702 17.3989 8.39897L12 13.7979L6.60099 8.39897C6.26904 8.06702 5.73086 8.06702 5.39891 8.39897C5.06696 8.73091 5.06696 9.2691 5.39891 9.60105L11.3989 15.601C11.7309 15.933 12.269 15.933 12.601 15.601L18.601 9.60105C18.9329 9.26910 18.9329 8.73091 18.601 8.39897Z" fill="white"></path>
              </svg>
          </div>`;
    } else {
      if (config.icon) {
        // If there is a custom icon, use an <img> tag
        toggleButton.innerHTML = `
          <div style="opacity: 1; display: flex; align-items: center; justify-content: center; position: absolute; top: 0; left: 0; width: 48px; height: 48px; user-select: none;">
            <img src="${config.icon}" width="40" height="40" alt="Icon" />
          </div>`;
      } else {
        // Otherwise
        toggleButton.innerHTML = `
          <div style="opacity: 100; display: flex; align-items: center; justify-content: center; position: absolute; top: 0; left: 0; width: 48px; height: 48px; user-select: none;">
              <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path>
              </svg>
          </div>`;
      }
    }
  }

  function initializeChat() {
    // if (extraConfig) updateConfig(extraConfig);
    if (initialized) return;
    initialized = true;

    if (!config.app_id) {
      console.warn("AppId is mandatory for booting the Chat widget.");
      return; // Stop initialization if appId is not provided
    }

    // Create the main container div
    appContainer = d.createElement("div");
    d.body.appendChild(appContainer);
    appContainer.style.transform = "scale(0)";
    appContainer.style.opacity = "0";

    // Create the iframe
    iframe = d.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.src = `${config.appUrl}/?app_id=${config.app_id}`;
    appContainer.appendChild(iframe);

    iframe.onload = function () {
      iframe.contentWindow.postMessage(
        {
          type: "initialize",
          config: {
            is_mobile: config.is_mobile,
            hide_default_launcher: config.hide_default_launcher,
          },
          data: filterUserConfig(config),
        },
        appUrl
      );
    };

    // Create the toggle button
    toggleButton = d.createElement("div");
    toggleButton.role = "button";
    toggleButton.tabIndex = 0;
    toggleButton.ariaLabel = "Open Messenger";
    toggleButton.ariaLive = "polite";
    d.body.appendChild(toggleButton);

    // Set initial styles
    updateButtonStyles();
    updateContainer();
    toggleButton.onclick = () => toggleAppVisibility(!config.isOpen);

    attachCustomLauncherListeners();
    updateToggleButtonContent();
  }

  function updateContainer() {
    if (!appContainer) return;

    const bottomOffset = config.hide_default_launcher ? 12 : 60;

    if (config.is_mobile) {
      appContainer.style.cssText = `
        z-index: 2147483001;
        position: fixed;
        transform-origin: ${
          config.alignment === "right" ? "right bottom" : "left bottom"
        };
        height: 100%;
        min-height: 80px;
        width: 100%;
        max-height: none;
        inset: 0px;
        box-shadow: rgba(0, 0, 0, 0.16) 0px 5px 40px;
        border-radius: 0px;
        overflow: hidden;
        transition: width 200ms ease 0s, height 200ms ease 0s, max-height 200ms ease 0s, transform 300ms cubic-bezier(0, 1.2, 1, 1) 0s, opacity 83ms ease-out 0s;
        pointer-events: all;
        transform: scale(${config.isOpen && config.isLoaded ? 1 : 0});
        opacity: ${config.isOpen && config.isLoaded ? 1 : 0};
      `;
    } else {
      appContainer.style.cssText = `
        z-index: 2147483000;
        position: fixed;
        bottom: ${config.vertical_padding + bottomOffset}px;
        ${
          config.alignment === "right"
            ? `right: ${config.horizontal_padding}px`
            : `left: ${config.horizontal_padding}px`
        };
        transform-origin: ${
          config.alignment === "right" ? "right bottom" : "left bottom"
        };
        height: ${
          config.isExpanded
            ? `calc(100% - 104px)`
            : `min(${config.height}px, 100% - 104px)`
        };
        min-height: 80px;
        width: ${config.isExpanded ? 688 : config.width}px;
        max-height: ${config.isExpanded ? `calc(100% - 104px)` : "704px"};
        box-shadow: rgba(0, 0, 0, 0.16) 0px 5px 40px;
        border-radius: 16px;
        overflow: hidden;
        transition: width 200ms ease 0s, height 200ms ease 0s, max-height 200ms ease 0s, transform 300ms cubic-bezier(0, 1.2, 1, 1) 0s, opacity 83ms ease-out 0s;
        pointer-events: all;
        transform: scale(${config.isOpen && config.isLoaded ? 1 : 0});
        opacity: ${config.isOpen && config.isLoaded ? 1 : 0};
      `;
    }
  }

  function updateButtonStyles() {
    if (!toggleButton || config.hide_default_launcher || !config.isLoaded)
      return;
    toggleButton.style.cssText = `
        display: ${config.hide_default_launcher ? "none" : "block"};
        position: fixed;
        bottom: ${config.vertical_padding}px;
        ${
          config.alignment === "right"
            ? `right: ${config.horizontal_padding}px`
            : `left: ${config.horizontal_padding}px`
        };
        padding: 0;
        margin: 0;
        border: none;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background-color: ${config.primary_color};
        cursor: pointer;
        box-sizing: border-box;
        z-index: 2147483000;
        transition: transform 167ms cubic-bezier(0.33, 0, 0, 1);
        box-shadow: 0 1px 6px 0 rgba(0, 0, 0, 0.06), 0 2px 32px 0 rgba(0, 0, 0, 0.16);
      `;
    toggleButton.onmouseover = function () {
      toggleButton.style.transform = "scale(1.1)";
      toggleButton.style.transition =
        "transform 250ms cubic-bezier(0.33, 0, 0, 1)";
    };
    toggleButton.onmouseout = function () {
      toggleButton.style.transform = "scale(1)";
      toggleButton.style.transition =
        "transform 167ms cubic-bezier(0.33, 0, 0, 1)";
    };
  }

  function toggleAppVisibility(isOpen) {
    config.isOpen = isOpen;
    updateContainer();
    updateToggleButtonContent();
  }

  function updateConfig(newConfig = {}) {
    config = { ...config, ...newConfig, ...bootConfig };
    updateContainer();
    updateButtonStyles();
    updateToggleButtonContent();
  }

  function chatCommands(command, args) {
    switch (command) {
      case "boot":
        if (initialized) return;
        // Handle the boot command
        bootConfig = args;
        updateConfig();
        initializeChat();
        break;
      case "show":
        toggleAppVisibility(true);
        break;
      case "hide":
        toggleAppVisibility(false);
        break;
      case "showSpace":
        iframe.contentWindow.postMessage(
          { type: "showSpace", data: { space: args } },
          appUrl
        );
        toggleAppVisibility(true);
        break;
      case "showNewMessage":
        iframe.contentWindow.postMessage(
          { type: "showNewMessage", data: { message: args } },
          appUrl
        );
        toggleAppVisibility(true);
        break;
      case "showArticle":
        iframe.contentWindow.postMessage(
          { type: "showArticle", data: { articleSlug: args } },
          appUrl
        );
        break;
      case "showNews":
        iframe.contentWindow.postMessage(
          { type: "showNews", data: { newsSlug: args } },
          appUrl
        );
        break;
      case "showTicket":
        iframe.contentWindow.postMessage(
          { type: "showTicket", data: { ticketId: args } },
          appUrl
        );
        break;
      case "update":
        iframe.contentWindow.postMessage(
          { type: "update", data: args },
          appUrl
        );
        break;
    }
  }

  if (w.Chat && w.Chat.q) {
    const bootIndex = w.Chat.q.findIndex((item) => item[0] === "boot");
    if (bootIndex !== -1) {
      const bootCommand = w.Chat.q.splice(bootIndex, 1)[0];
      chatCommands.apply(null, bootCommand);
    }

    if (initialized) {
      w.Chat.q
        .reduce((promise, args) => {
          return promise.then(
            () =>
              new Promise((resolve) => {
                setTimeout(() => {
                  chatCommands.apply(null, args);
                  resolve();
                }, 300); // Delay of 300ms between commands
              })
          );
        }, Promise.resolve())
        .then(() => {
          w.Chat.q = [];
        });
    } else {
      console.warn("Boot command not executed. Other commands are skipped.");
    }
  }

  w.Chat = chatCommands;
  window.addEventListener("resize", checkLayout);
})();
