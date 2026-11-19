(() => {
  "use strict";

  function nextTheme(current, systemDark) {
    const system = systemDark ? "dark" : "light";
    const opposite = systemDark ? "light" : "dark";
    if (current === "system") return opposite;
    return current === opposite ? system : "system";
  }

  function bindLanguageMenu(trigger, menu, onSelect) {
    const region = trigger.parentElement;
    const options = [...menu.querySelectorAll('[role="menuitemradio"]')];
    const selected = () => options.find(option => option.getAttribute("aria-checked") === "true") || options[0];
    let mode;
    let timer;

    function focus(option) {
      options.forEach(item => { item.tabIndex = item === option ? 0 : -1; });
      option.focus();
    }

    function close(restoreFocus = false) {
      clearTimeout(timer);
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      mode = undefined;
      if (restoreFocus) trigger.focus();
    }

    function open(nextMode, option = selected()) {
      if (trigger.disabled) return;
      clearTimeout(timer);
      mode = nextMode;
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      if (mode === "click") focus(option);
      else options.forEach(item => { item.tabIndex = -1; });
    }

    trigger.addEventListener("click", () => {
      if (mode === "click") close();
      else open("click");
    });
    trigger.addEventListener("keydown", event => {
      if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
      event.preventDefault();
      open("click", event.key === "ArrowUp" ? options.at(-1) : selected());
    });
    region.addEventListener("pointerenter", event => {
      if (event.pointerType !== "mouse") return;
      clearTimeout(timer);
      if (!mode) open("hover");
    });
    region.addEventListener("pointerleave", event => {
      if (event.pointerType === "mouse" && mode === "hover") timer = setTimeout(close, 250);
    });
    region.addEventListener("focusout", event => {
      if (!region.contains(event.relatedTarget)) close();
    });
    menu.addEventListener("click", event => {
      const option = event.target.closest('[role="menuitemradio"]');
      if (!option) return;
      close(true);
      onSelect(option);
    });
    document.addEventListener("pointerdown", event => {
      if (mode && !region.contains(event.target)) close();
    });
    document.addEventListener("keydown", event => {
      if (!mode) return;
      if (event.key === "Escape") {
        event.preventDefault();
        close(region.contains(document.activeElement));
        return;
      }
      if (!menu.contains(event.target)) return;
      const index = options.indexOf(document.activeElement);
      const keys = {Home: 0, End: options.length - 1, ArrowUp: index - 1, ArrowDown: index + 1};
      if (!Object.hasOwn(keys, event.key)) return;
      event.preventDefault();
      focus(options[(keys[event.key] + options.length) % options.length]);
    });
  }

  globalThis.FocusPreferences = Object.freeze({nextTheme, bindLanguageMenu});
})();
