(function () {
  var w = window;
  var d = document;
  var appContainer, toggleButton, iframe;
  let bootConfig = {};
  var initialized = false;
  var launcherStackContainer = null;
  let pendingTriggerTimeouts = [];

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
    secondary_color: "#007aff",
    custom_launcher_selector: null,
    hide_default_launcher: false,
    is_light_primary_color: false,
    is_mobile: isMobileLayout(),
    alignment: "right",
    vertical_padding: 20,
    horizontal_padding: 20,
    triggers: [],
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
    if (event.data.type === "triggers") {
      const newTriggers = event.data.triggers || [];

      // 🔥 Clear any existing trigger timers
      pendingTriggerTimeouts.forEach((id) => clearTimeout(id));
      pendingTriggerTimeouts = [];

      // 🔄 Reset triggers and DOM
      config.triggers = [];
      if (launcherStackContainer) launcherStackContainer.remove();

      if (newTriggers.length === 0) return;

      newTriggers.forEach((t) => {
        const delayMs = (t.delay || 0) * 1000;

        const timeoutId = setTimeout(() => {
          config.triggers.push(t);
          showLauncherMessageStack();
          animateLastCard();

          if (t.delay && t.delay > 0) {
            iframe?.contentWindow?.postMessage(
              {
                type: "newTriggerAdded",
                data: { triggerId: t.uuid },
              },
              appUrl
            );
          }
        }, delayMs);

        // ✅ Save this timeout so we can cancel it if needed later
        pendingTriggerTimeouts.push(timeoutId);
      });
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
      // const fillColor = config.is_light_primary_color ? "black" : "white";
      const fillColor = "white";
      toggleButton.innerHTML = `
            <div style="opacity: 100; display: flex; align-items: center; justify-content: center; position: absolute; top: 0; left: 0; width: 48px; height: 48px; user-select: none;">
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M18.601 8.39897C18.269 8.06702 17.7309 8.06702 17.3989 8.39897L12 13.7979L6.60099 8.39897C6.26904 8.06702 5.73086 8.06702 5.39891 8.39897C5.06696 8.73091 5.06696 9.2691 5.39891 9.60105L11.3989 15.601C11.7309 15.933 12.269 15.933 12.601 15.601L18.601 9.60105C18.9329 9.26910 18.9329 8.73091 18.601 8.39897Z" fill="${fillColor}"></path>
                </svg>
            </div>`;
    } else {
      const displayStyle = config.isLoaded ? "flex" : "none";

      if (config.icon) {
        // If there is a custom icon, use an <img> tag
        toggleButton.innerHTML = `
            <div style="opacity: 1; display: ${displayStyle}; align-items: center; justify-content: center; position: absolute; top: 0; left: 0; width: 48px; height: 48px; user-select: none;">
                <img src="${config.icon}" width="40" height="40" alt="Icon" />
            </div>`;
      } else {
        // Otherwise
        toggleButton.innerHTML = `
            <div style="opacity: 100; display: ${displayStyle}; align-items: center; justify-content: center; position: absolute; top: 0; left: 0; width: 48px; height: 48px; user-select: none;">
                <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path fill="white" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path>
                </svg>
            </div>`;
      }
    }
  }

  function getColor() {
    return config.is_light_primary_color
      ? config.secondary_color
      : config.primary_color;
  }

  function lightenColor(hex, percent) {
    // strip “#”, convert to integer
    const num = parseInt(hex.replace(/^#/, ""), 16);
    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;

    // move each channel toward 255 by `percent`
    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

    // reassemble to “#rrggbb”
    const out = (r << 16) | (g << 8) | b;
    return `#${out.toString(16).padStart(6, "0")}`;
  }

  function renderSimpleHTML(blocks) {
    const margin = "8px";

    return blocks
      .map((block, index) => {
        const isLast = index === blocks.length - 1;
        const style = isLast ? "" : ` style="margin-bottom: ${margin};"`;

        switch (block.type) {
          case "paragraph":
            return `<p${style}>${block.text}</p>`;
          case "heading":
            return `<h1${style}>${block.text}</h1>`;
          case "subheading":
            return `<h2${style}>${block.text}</h2>`;
          default:
            return "";
        }
      })
      .join("");
  }

  // after your existing functions but before showLauncherMessageStack
  function animateLastCard() {
    // const stack = document.getElementById("chat-launcher-message-stack");
    if (!launcherStackContainer) return;
    const cards = launcherStackContainer.querySelectorAll(".chat-message-card");
    const card = cards[cards.length - 1];
    // set initial “hidden” state
    card.style.opacity = "0";
    card.style.transform = "translateY(10px)";
    // play a one‐off fade+slide animation
    const anim = card.animate(
      [
        { opacity: 0, transform: "translateY(10px)" },
        { opacity: 1, transform: "translateY(0)" },
      ],
      { duration: 300, easing: "ease" }
    );
    anim.onfinish = () => {
      // clear the inline styles so card goes back to normal CSS
      card.style.opacity = "";
      card.style.transform = "";
    };
  }

  function showLauncherMessageStack() {
    if (config.isOpen) return;

    const { triggers = [] } = config;
    if (!toggleButton || triggers.length === 0) return;

    const defaultBg = getColor();
    const hoverBg = lightenColor(defaultBg, 40);

    // --- teardown old ---
    // const old = document.getElementById("chat-launcher-message-stack");
    if (launcherStackContainer) launcherStackContainer.remove();

    // --- build containers ---
    launcherStackContainer = document.createElement("div");
    launcherStackContainer.id = "chat-launcher-message-stack";
    launcherStackContainer.style.cssText = `
      position: fixed;
      z-index: 2147483001;
      bottom: ${config.vertical_padding + 58}px;
      ${
        config.alignment === "right"
          ? `right: ${config.horizontal_padding}px`
          : `left: ${config.horizontal_padding}px`
      };
      width: 300px;
      pointer-events: auto;
    `;

    // clip wrapper: controls max-height
    const clip = document.createElement("div");
    clip.style.cssText = `
      overflow: hidden;
      transition: max-height 0.3s ease;
    `;

    launcherStackContainer.appendChild(clip);
    document.body.appendChild(launcherStackContainer);

    // --- create cards ---
    const cards = triggers.map((t, i) => {
      const { author } = t;
      const card = document.createElement("div");
      card.className = "chat-message-card";

      card.style.cssText = `
        position: relative;
        z-index: ${2147483000 + 1};
        background: white;
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        display: flex;
        flex-direction: column;
        /* allow margins to animate */
        transition: margin-top 0.3s ease, margin-bottom 0.3s ease;
      `;

      // message row
      const msg = document.createElement("div");
      msg.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 10px;
        margin-bottom: ${t.reply_buttons?.length ? "10px" : "0"};
      `;

      const safeHTML = renderSimpleHTML(t.blocks);

      if (author.avatar) {
        // use the image if provided
        msg.innerHTML = `
          <img
            src="${author.avatar}"
            alt="${author.display_name}"
            style="
              width:32px;
              height:32px;
              border-radius:50%;
              object-fit:cover;
            "
          />
          <div style="flex:1">
            <div style="font-size:12px;font-weight:400;color:#666666;margin-bottom:2px;">
              ${author.display_name}
            </div>
            <div style="font-size:14px;color:#222222">
              ${safeHTML}
            </div>
          </div>
        `;
      } else {
        // fallback to initial circle
        msg.innerHTML = `
          <div style="
            width:32px; height:32px; border-radius:50%;
            background: ${defaultBg}; display:flex; align-items:center;
            justify-content:center; color:white; font-weight:bold;
            font-size:14px;
          ">
            ${author.initial}
          </div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:400;color:#666666;margin-bottom:2px;">
              ${author.display_name}
            </div>
            <div style="font-size:14px;color:#222222">
              ${safeHTML}
            </div>
          </div>
        `;
      }
      card.appendChild(msg);

      // vertically stacked, right‑aligned buttons
      if (t.reply_buttons?.length) {
        const act = document.createElement("div");
        act.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          margin-left: 42px;
          margin-top: 4px;
        `;
        t.reply_buttons.forEach((a) => {
          const btn = document.createElement("button");
          btn.textContent = a.text || a.label || "Action";
          btn.style.cssText = `
            background: ${defaultBg};
            color: #ffffff;
            border: none;
            border-radius: 16px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s ease;
            align-self: flex-end;
          `;
          btn.onmouseenter = () => (btn.style.backgroundColor = hoverBg);
          btn.onmouseleave = () => (btn.style.backgroundColor = defaultBg);
          btn.onclick = (ev) => {
            ev.stopPropagation();
            iframe.contentWindow.postMessage(
              {
                type: "showNewMessage",
                data: { triggerId: t.uuid, message: a.text },
              },
              appUrl
            );
            toggleAppVisibility(true);

            // ✅ Remove trigger from config
            config.triggers = config.triggers.filter(
              (other) => other.uuid !== t.uuid
            );

            // ✅ Remove card stack from DOM
            launcherStackContainer?.remove();
          };
          act.appendChild(btn);
        });
        card.appendChild(act);
      }

      card.onclick = () => {
        iframe.contentWindow.postMessage(
          { type: "showNewMessage", data: { triggerId: t.uuid } },
          appUrl
        );
        toggleAppVisibility(true);
        config.triggers = config.triggers.filter(
          (other) => other.uuid !== t.uuid
        );
        launcherStackContainer.remove();
      };

      clip.appendChild(card);
      return card;
    });

    // --- measure & initialize stacking ---
    requestAnimationFrame(() => {
      const n = cards.length;
      if (n === 0) return;

      // parameters
      const peekOffset = 12; // how much of each older card peeks out
      const gap = 8; // gap between cards when expanded

      // measure each card’s full height
      const heights = cards.map((c) => c.getBoundingClientRect().height);
      const lastH = heights[n - 1];
      const fullContentH = heights.reduce((a, b) => a + b, 0);

      // collapsed container height = last card + peeks
      const collapsedH = lastH + peekOffset * (n - 1);
      // expanded container height = sum(heights) + gaps
      const expandedH = fullContentH + gap * (n - 1);

      // precompute the “stacked” margin-tops
      const collapsedMT = heights.map((h, i) => {
        if (i === 0) return "0px";
        // lift card[i] up so that only `peekOffset` of its predecessor shows
        return `-${heights[i - 1] - peekOffset}px`;
      });

      // 1) Temporarily disable transitions
      clip.style.transition = "none";
      cards.forEach((card) => {
        card.style.transition = "none";
      });

      // apply the collapsed margins
      cards.forEach((card, i) => {
        card.style.marginTop = collapsedMT[i];
        // no bottom gap in collapsed mode
        card.style.marginBottom = "0px";
      });

      // clamp the wrapper
      clip.style.maxHeight = `${collapsedH}px`;

      // 3) Force reflow, then restore transitions for hover only
      void clip.offsetHeight;
      clip.style.transition = "max-height 0.3s ease";
      cards.forEach((card) => {
        card.style.transition = "margin-top 0.3s ease, margin-bottom 0.3s ease";
      });

      // --- hover handlers for animate open/close ---
      launcherStackContainer.addEventListener("mouseenter", () => {
        // expand height
        clip.style.maxHeight = `${expandedH}px`;
        // reset stacking margins → a normal vertical list
        cards.forEach((card, i) => {
          card.style.marginTop = "0px";
          card.style.marginBottom = i < n - 1 ? `${gap}px` : "0px";
        });
      });

      launcherStackContainer.addEventListener("mouseleave", () => {
        // collapse height
        clip.style.maxHeight = `${collapsedH}px`;
        // reapply the stacked peek
        cards.forEach((card, i) => {
          card.style.marginTop = collapsedMT[i];
          card.style.marginBottom = "0px";
        });
      });
    });
  }

  function getPageData() {
    return {
      page_url: window.location.href,
      page_title: document.title,
      page_description: document.description,
      page_referer: document.referrer,
    };
  }

  function trackUrlChange(callback) {
    // Patch pushState and replaceState
    ["pushState", "replaceState"].forEach((method) => {
      const original = history[method];
      history[method] = function () {
        const result = original.apply(this, arguments);
        const event = new Event(method);
        window.dispatchEvent(event);
        return result;
      };
    });

    // Listen for all types of navigation events
    window.addEventListener("pushState", () => callback(getPageData()));
    window.addEventListener("replaceState", () => callback(getPageData()));
    window.addEventListener("popstate", () => callback(getPageData()));
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
          page_data: getPageData(),
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

    trackUrlChange((data) => {
      iframe.contentWindow.postMessage({ type: "urlChange", data }, appUrl);
    });
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

    const color = getColor();

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
          background-color: ${color};
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

    if (isOpen) {
      if (launcherStackContainer) launcherStackContainer.remove();
    } else {
      showLauncherMessageStack();
    }
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
