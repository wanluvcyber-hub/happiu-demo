(function () {
  const STICKERS = {
    hi:     { ico: "🐘", label: "สวัสดีครับ/ค่ะ!", sub: "ช้างน้อยมอนอทักทาย", bg: "linear-gradient(135deg,#fff0df,#ffe0be)", ink: "#9a3412" },
    ready:  { ico: "✅", label: "พร้อมเข้ากะ!",    sub: "จัดเต็มไม่สายแน่นอน", bg: "linear-gradient(135deg,#e2faef,#c2f3dc)", ink: "#065f46" },
    thanks: { ico: "🌸", label: "ขอบคุณมากครับ!",  sub: "ดอกเสลา มอนอ",        bg: "linear-gradient(135deg,#f3eaff,#e5d4ff)", ink: "#5b21b6" },
    coffee: { ico: "☕", label: "พักเติมพลังแป๊บ",  sub: "คาเฟ่หน้ามอ",         bg: "linear-gradient(135deg,#fff5d6,#ffe5a3)", ink: "#92400e" },
    omw:    { ico: "🛵", label: "กำลังรีบไปครับ!",  sub: "ถึงหน้ามอใน 5 นาที",   bg: "linear-gradient(135deg,#e6f2ff,#cde4ff)", ink: "#1e40af" },
    fire:   { ico: "🔥", label: "ลุยเต็มที่!",      sub: "ไฟแรงพร้อมทำงาน",     bg: "linear-gradient(135deg,#ffece2,#ffd0ba)", ink: "#b91c1c" },
    study:  { ico: "📚", label: "ติดสอบแป๊บนะ",    sub: "โหมดนิสิต มน.",        bg: "linear-gradient(135deg,#eef2ff,#dbe4ff)", ink: "#3730a3" },
    ok:     { ico: "🎉", label: "รับทราบเรียบร้อย!", sub: "เจอกันตามนัดครับ",    bg: "linear-gradient(135deg,#ecfdf5,#fef3c7)", ink: "#047857" }
  };

  const TABS = [
    { id: "stickers", label: "สติ๊กเกอร์" },
    { id: "faces", label: "หน้ายิ้ม", items: ["😊","😄","😁","😆","🥰","😍","🤩","😎","🥳","🤗","😇","🥹","😅","😂","🤣","😉","😌","🫡","🙌","👏","👍","👌","🤝","🙏"] },
    { id: "work",  label: "ทำงาน",    items: ["💼","💻","📱","📅","⏰","✅","📌","📝","📊","🎓","📚","✏️","☕","🧋","🍔","🛵","🏪","🏛️","💸","💰","🧾","🏆","⭐","🔥"] },
    { id: "cute",  label: "มอนอ",     items: ["🐘","🌸","💜","🧡","✨","🌟","💫","🎉","🎊","🎈","❤️","💛","💚","💙","🤍","🫶","✌️","🤟","🐾","🐱","🐶","🌈","🍀","🎵"] }
  ];

  const QUICK = ["👋","😊","🙏","👍","🔥","🐘","🌸"];
  let activeTab = "stickers";

  function burst(anchorEl, char) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = anchorEl ? anchorEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 100, width: 20 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top;
    const chars = [char || "✨", "✨", "🌸"];
    chars.forEach((c, i) => {
      const el = document.createElement("span");
      el.className = "chat-burst-particle";
      el.textContent = c;
      el.style.left = (cx + (i - 1) * 14) + "px";
      el.style.top = cy + "px";
      el.style.setProperty("--bx", ((i - 1) * 28 + (Math.random() * 14 - 7)).toFixed(0) + "px");
      el.style.setProperty("--by", (-58 - Math.random() * 34).toFixed(0) + "px");
      el.style.setProperty("--br", ((i - 1) * 22).toFixed(0) + "deg");
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 900);
    });
  }

  function renderPanelBody(tabId) {
    if (tabId === "stickers") {
      return '<div class="chat-sticker-grid">' + Object.entries(STICKERS).map(([id, st]) =>
        '<button type="button" class="chat-sticker-pick" data-chat-sticker="' + id + '" style="background:' + st.bg + '">' +
          '<span class="st-ico" aria-hidden="true">' + st.ico + '</span>' +
          '<span class="st-lbl" style="color:' + st.ink + '">' + st.label + '<span class="st-sub">' + st.sub + '</span></span>' +
        '</button>'
      ).join("") + '</div>';
    }
    const tab = TABS.find(t => t.id === tabId) || TABS[1];
    return '<div class="chat-emoji-grid">' + tab.items.map(em =>
      '<button type="button" class="chat-emoji-item" data-chat-emoji="' + em + '" aria-label="แทรกอีโมจิ ' + em + '">' + em + '</button>'
    ).join("") + '</div>';
  }

  function isJumboEmoji(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed || trimmed.length > 16) return false;
    const stripped = trimmed.replace(/[\s\uFE0F\u200D]/g, "");
    if (!stripped) return false;
    return !/[A-Za-z0-9\u0E00-\u0E7F]/.test(stripped) && [...stripped].length <= 5;
  }

  window.__happiuChatEmoji = {
    renderQuickBar() {
      return '<div class="chat-quick-emojis" aria-label="สติ๊กเกอร์และอีโมจิส่งด่วน">' +
        '<span class="quick-label">ส่งด่วน:</span>' +
        QUICK.map(em => '<button type="button" class="chat-quick-btn" data-chat-quick-send="' + em + '" title="กดเพื่อส่ง ' + em + ' ทันที">' + em + '</button>').join("") +
        '<button type="button" class="chat-quick-btn is-sticker-shortcut" data-chat-sticker="hi" title="ส่งสติ๊กเกอร์สวัสดีทันที">🐘 สวัสดี</button>' +
        '<button type="button" class="chat-quick-btn is-sticker-shortcut" data-chat-sticker="ready" title="ส่งสติ๊กเกอร์พร้อมทำงานทันที">✅ พร้อมเข้างาน</button>' +
        '<button type="button" class="chat-quick-btn is-sticker-shortcut" data-open-stickers>ทั้งหมด</button>' +
      '</div>';
    },
    renderPicker() {
      return '<details class="chat-emoji-menu">' +
        '<summary class="chat-emoji-trigger" aria-label="เลือกอีโมจิและสติ๊กเกอร์" title="อีโมจิและสติ๊กเกอร์">😊</summary>' +
        '<div class="chat-emoji-popup" role="dialog" aria-label="ชุดอีโมจิและสติ๊กเกอร์ HappiU">' +
          '<div class="chat-emoji-tabs" role="tablist">' +
            TABS.map(t => '<button type="button" class="chat-emoji-tab" role="tab" data-emoji-tab="' + t.id + '" aria-selected="' + (t.id === activeTab) + '">' + t.label + '</button>').join("") +
          '</div>' +
          '<div data-emoji-body>' + renderPanelBody(activeTab) + '</div>' +
        '</div>' +
      '</details>';
    },
    renderBubble(text, fallbackChatText) {
      const m = String(text || "").trim().match(/^\[sticker:([a-z-]+)\]$/);
      if (m && STICKERS[m[1]]) {
        const st = STICKERS[m[1]];
        return '<div class="chat-sticker-bubble" style="background:' + st.bg + ';color:' + st.ink + '">' +
          '<span class="st-art" aria-hidden="true">' + st.ico + '</span>' +
          '<span class="st-text"><strong>' + st.label + '</strong><span>' + st.sub + '</span></span>' +
        '</div>';
      }
      if (isJumboEmoji(text)) {
        return '<p class="chat-message-text is-jumbo-emoji">' + fallbackChatText(text) + '</p>';
      }
      return '<p class="chat-message-text">' + fallbackChatText(text) + '</p>';
    }
  };

  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest("[data-emoji-tab]");
    if (tabBtn) {
      activeTab = tabBtn.getAttribute("data-emoji-tab");
      const popup = tabBtn.closest(".chat-emoji-popup");
      if (popup) {
        popup.querySelectorAll("[data-emoji-tab]").forEach(b => b.setAttribute("aria-selected", b === tabBtn ? "true" : "false"));
        const body = popup.querySelector("[data-emoji-body]");
        if (body) body.innerHTML = renderPanelBody(activeTab);
      }
      return;
    }

    const openSt = e.target.closest("[data-open-stickers]");
    if (openSt) {
      const form = openSt.closest("form.chat-composer");
      const menu = form && form.querySelector(".chat-emoji-menu");
      if (menu) {
        activeTab = "stickers";
        menu.open = !menu.open;
        if (menu.open) {
          menu.querySelectorAll("[data-emoji-tab]").forEach(b => b.setAttribute("aria-selected", b.getAttribute("data-emoji-tab") === "stickers" ? "true" : "false"));
          const body = menu.querySelector("[data-emoji-body]");
          if (body) body.innerHTML = renderPanelBody("stickers");
        }
      }
      return;
    }

    const quickSendBtn = e.target.closest("[data-chat-quick-send]");
    if (quickSendBtn) {
      const em = quickSendBtn.getAttribute("data-chat-quick-send");
      const form = quickSendBtn.closest("form.chat-composer");
      const ta = form && form.querySelector('textarea[name="message"]');
      burst(quickSendBtn, em);
      if (ta && form && em) {
        ta.value = em;
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
      }
      return;
    }

    const emBtn = e.target.closest("[data-chat-emoji]");
    if (emBtn) {
      const em = emBtn.getAttribute("data-chat-emoji");
      const form = emBtn.closest("form.chat-composer");
      const ta = form && form.querySelector('textarea[name="message"]');
      if (ta) {
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        ta.value = ta.value.slice(0, start) + em + ta.value.slice(end);
        const pos = start + em.length;
        ta.focus();
        if (ta.setSelectionRange) ta.setSelectionRange(pos, pos);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
      burst(emBtn, em);
      return;
    }

    const stBtn = e.target.closest("[data-chat-sticker]");
    if (stBtn) {
      const id = stBtn.getAttribute("data-chat-sticker");
      const st = STICKERS[id];
      const form = stBtn.closest("form.chat-composer");
      const ta = form && form.querySelector('textarea[name="message"]');
      const menu = form && form.querySelector(".chat-emoji-menu");
      if (menu) menu.open = false;
      burst(stBtn, st ? st.ico : "🐘");
      if (ta && form) {
        ta.value = "[sticker:" + id + "]";
        if (typeof form.requestSubmit === "function") {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
        }
      }
      return;
    }

    const openMenu = document.querySelector(".chat-emoji-menu[open]");
    if (openMenu && !openMenu.contains(e.target) && !e.target.closest("[data-open-stickers]")) {
      openMenu.open = false;
    }
  });
})();
