const storageKey = "dailyOrganizerData_v1";

const legacyTabLabels = {
  boyfriend: "Boyfriend Time",
  office: "Office",
  improve: "Extra Work to Improve",
  exercise: "Exercising",
  reading: "Reading / Writing Books",
  leetcode: "LeetCode",
};

const sectionPalette = [
  { bg: "#ffe8d3", border: "#e9c2a1", accent: "#f07c4a" },
  { bg: "#dff3e7", border: "#bdd9cb", accent: "#3a9d8f" },
  { bg: "#f9edc5", border: "#e3d5a7", accent: "#f0b24a" },
  { bg: "#e0f0ff", border: "#c1d7eb", accent: "#4b87c2" },
  { bg: "#f6d8cf", border: "#e3b9ad", accent: "#e45b4f" },
  { bg: "#e6ecd6", border: "#cad3b4", accent: "#5cad64" },
  { bg: "#efe3ff", border: "#d0c0ef", accent: "#8b6cd9" },
  { bg: "#ffe6ef", border: "#e8c1d4", accent: "#d35f8d" },
  { bg: "#e5f5fb", border: "#c2dfe9", accent: "#5aa5c1" },
  { bg: "#fff0d9", border: "#e7d1b1", accent: "#e28f33" },
  { bg: "#e8f1ff", border: "#c7d6f2", accent: "#6a7fd1" },
  { bg: "#f6efe2", border: "#e0d1b7", accent: "#b08b4f" },
  { bg: "#e7f7f0", border: "#c5e3d6", accent: "#3f9a7a" },
  { bg: "#fff3e3", border: "#ead0b6", accent: "#d97a4b" },
];

const sectionIdeas = [
  `Travel with bf ${String.fromCodePoint(0x2764, 0xfe0f)}`,
  "Office",
  "Leetcode",
  "Freelancing",
  "Uni work",
  "Projects",
  "Exercise",
  "Reading",
  "Toastmasters",
];

const ideaPalette = [
  { bg: "#ffe3d4", border: "#efb79a", text: "#b55735" },
  { bg: "#dff5e9", border: "#bfe1cf", text: "#2f7d6b" },
  { bg: "#e3edff", border: "#c3d4f2", text: "#3c5ea6" },
  { bg: "#fff1cc", border: "#e6d19c", text: "#a06b24" },
  { bg: "#f6dbe4", border: "#e1b6c6", text: "#a24a6f" },
  { bg: "#e7f0da", border: "#c8d7b2", text: "#5f7a3a" },
  { bg: "#f7ead9", border: "#e2c7a8", text: "#8a5d2c" },
  { bg: "#dff4f4", border: "#b9dedd", text: "#2f7f84" },
  { bg: "#e8e9ff", border: "#c6c9f2", text: "#5c63b8" },
];

const emojiOptions = [
  0x2728,
  0x1f4bc,
  0x1f4bb,
  0x1f4da,
  0x1f4c5,
  0x1f4c8,
  0x1f4dd,
  0x1f4cc,
  0x1f3af,
  0x1f4a1,
  0x1f3a7,
  0x1f3c3,
  0x1f4aa,
  0x1f9e0,
  0x1f380,
  0x1f381,
  0x1f389,
  0x1f525,
  0x1f4b0,
  0x1f3c6,
  0x1f308,
  0x1f339,
  [0x2764, 0xfe0f],
];

const elements = {
  datePicker: document.getElementById("datePicker"),
  dayLabel: document.getElementById("dayLabel"),
  dayStats: document.getElementById("dayStats"),
  saveState: document.getElementById("saveState"),
  todayBtn: document.getElementById("todayBtn"),
  addEventBtn: document.getElementById("addEventBtn"),
  eventsList: document.getElementById("eventsList"),
  addSectionBtn: document.getElementById("addSectionBtn"),
  sectionIdeas: document.getElementById("sectionIdeas"),
  sectionsList: document.getElementById("sectionsList"),
  addWalletBtn: document.getElementById("addWalletBtn"),
  walletList: document.getElementById("walletList"),
  walletTotal: document.getElementById("walletTotal"),
  historyList: document.getElementById("historyList"),
  confirmOverlay: document.getElementById("confirmOverlay"),
  confirmMessage: document.getElementById("confirmMessage"),
  confirmOkBtn: document.getElementById("confirmOkBtn"),
  confirmCancelBtn: document.getElementById("confirmCancelBtn"),
};

const state = {
  data: loadData(),
  currentDate: getTodayISO(),
};

let saveTimer = null;
let statusTimer = null;
let confirmResolver = null;
let openEmojiPanel = null;

init();

function init() {
  ensureDay(state.currentDate);
  elements.datePicker.value = state.currentDate;

  elements.todayBtn.addEventListener("click", () => {
    setCurrentDate(getTodayISO());
  });

  elements.datePicker.addEventListener("change", (event) => {
    setCurrentDate(event.target.value);
  });

  elements.addEventBtn.addEventListener("click", () => addEvent());
  elements.addSectionBtn.addEventListener("click", () => addSection());
  elements.addWalletBtn.addEventListener("click", () => addWalletEntry());

  setupConfirmModal();
  setupEmojiPicker();
  renderSectionIdeas();
  renderDay();
}

function loadData() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function persistData() {
  localStorage.setItem(storageKey, JSON.stringify(state.data));
}

function getTodayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function ensureDay(date) {
  let needsSave = false;

  if (!state.data[date]) {
    state.data[date] = {
      events: [],
      sections: [],
      lastUpdated: Date.now(),
    };
    needsSave = true;
  }

  const day = state.data[date];
  if (!Array.isArray(day.events)) {
    day.events = [];
    needsSave = true;
  }
  if (!Array.isArray(day.sections)) {
    day.sections = [];
    needsSave = true;
  }
  if (!Array.isArray(day.wallet)) {
    day.wallet = [];
    needsSave = true;
  }

  if (day.categories && !day.sections.length) {
    const migrated = migrateLegacyCategories(day.categories);
    if (migrated.length) {
      day.sections = migrated;
      needsSave = true;
    }
    delete day.categories;
  }

  day.sections = day.sections.filter((section) => section && typeof section === "object");
  day.sections.forEach((section) => {
    if (!section.id) {
      section.id = newId();
      needsSave = true;
    }
    if (!Array.isArray(section.tasks)) {
      section.tasks = [];
      needsSave = true;
    }
    section.tasks = section.tasks.filter((task) => task && typeof task === "object");
    section.tasks.forEach((task) => {
      if (!task.id) {
        task.id = newId();
        needsSave = true;
      }
      if (typeof task.text !== "string") {
        task.text = task.text ? String(task.text) : "";
        needsSave = true;
      }
      if (typeof task.done !== "boolean") {
        task.done = !!task.done;
        needsSave = true;
      }
    });
  });

  day.wallet = day.wallet.filter((entry) => entry && typeof entry === "object");
  day.wallet.forEach((entry) => {
    if (!entry.id) {
      entry.id = newId();
      needsSave = true;
    }
    if (typeof entry.source !== "string") {
      entry.source = entry.source ? String(entry.source) : "";
      needsSave = true;
    }
    if (entry.amount !== "" && typeof entry.amount !== "number") {
      const parsed = parseFloat(entry.amount);
      entry.amount = Number.isFinite(parsed) ? parsed : "";
      needsSave = true;
    }
  });

  if (needsSave) {
    persistData();
  }
}

function migrateLegacyCategories(categories) {
  if (!categories || typeof categories !== "object") return [];
  const migrated = [];
  Object.keys(categories).forEach((key) => {
    const notes = Array.isArray(categories[key]) ? categories[key] : [];
    if (!notes.length) return;
    const tasks = notes
      .map((note) => ({
        id: note.id || newId(),
        text: (note.text || "").trim(),
        done: false,
      }))
      .filter((task) => task.text);
    if (!tasks.length) return;
    migrated.push({
      id: newId(),
      title: legacyTabLabels[key] || "Section",
      color: pickSectionColor(),
      tasks,
    });
  });
  return migrated;
}

function setCurrentDate(date) {
  if (!date) return;
  ensureDay(date);
  state.currentDate = date;
  elements.datePicker.value = date;
  renderDay();
}

function renderDay() {
  const day = state.data[state.currentDate];
  updateDayLabel();
  updateDayStats(day);
  renderEvents(day.events);
  renderSections(day.sections);
  renderWallet(day.wallet);
  renderHistory();
}

function updateDayLabel() {
  const label = formatDate(state.currentDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  elements.dayLabel.textContent = label;
}

function updateDayStats(day) {
  const taskStats = countTasks(day.sections);
  const totalEvents = day.events.length;
  elements.dayStats.textContent = `${totalEvents} events, ${taskStats.total} tasks, ${taskStats.done} done`;
}

function renderEvents(events) {
  elements.eventsList.innerHTML = "";
  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Add an event to build your timeline.";
    elements.eventsList.appendChild(empty);
    return;
  }

  events.forEach((event, index) => {
    const item = document.createElement("div");
    item.className = "event-item";
    item.dataset.id = event.id;
    item.style.setProperty("--i", index);

    const timeInput = document.createElement("input");
    timeInput.className = "event-time";
    timeInput.type = "time";
    timeInput.value = event.time || "";
    timeInput.addEventListener("input", (evt) => {
      event.time = evt.target.value;
      queueSave();
    });

    const textInput = document.createElement("textarea");
    textInput.className = "event-text";
    textInput.placeholder = "What is happening?";
    textInput.value = event.text || "";
    textInput.addEventListener("input", (evt) => {
      event.text = evt.target.value;
      queueSave();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn event-delete";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", "Delete event");
    deleteBtn.textContent = "x";
    deleteBtn.addEventListener("click", async () => {
      await removeEvent(event.id);
    });

    item.append(timeInput, textInput, deleteBtn);
    elements.eventsList.appendChild(item);
  });
}

function renderSections(sections) {
  elements.sectionsList.innerHTML = "";
  closeEmojiPanel();
  if (!sections.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Create a section to start planning your day.";
    elements.sectionsList.appendChild(empty);
    return;
  }

  let needsSave = false;

  sections.forEach((section, index) => {
    if (ensureSectionColor(section)) {
      needsSave = true;
    }

    const card = document.createElement("article");
    card.className = "section-card";
    card.dataset.id = section.id;
    card.style.setProperty("--section-accent", section.color.accent);
    card.style.setProperty("--section-bg", section.color.bg);
    card.style.setProperty("--section-border", section.color.border);
    card.style.setProperty("--i", index);

    const header = document.createElement("div");
    header.className = "section-header";

    const titleRow = document.createElement("div");
    titleRow.className = "section-title-row";

    const titleInput = document.createElement("input");
    titleInput.className = "section-title";
    titleInput.type = "text";
    titleInput.placeholder = "Section title";
    titleInput.value = section.title || "";
    titleInput.addEventListener("input", (event) => {
      section.title = event.target.value;
      queueSave();
    });

    const emojiBtn = document.createElement("button");
    emojiBtn.className = "emoji-trigger";
    emojiBtn.type = "button";
    emojiBtn.setAttribute("aria-label", "Add emoji");

    const emojiPanel = document.createElement("div");
    emojiPanel.className = "emoji-panel";
    emojiPanel.setAttribute("role", "menu");
    emojiPanel.setAttribute("aria-hidden", "true");
    emojiPanel.id = `emoji-panel-${section.id}`;

    emojiBtn.setAttribute("aria-controls", emojiPanel.id);
    emojiBtn.setAttribute("aria-expanded", "false");
    emojiBtn.dataset.emojiTrigger = emojiPanel.id;

    const colorInput = document.createElement("input");
    colorInput.className = "section-color";
    colorInput.type = "color";
    colorInput.setAttribute("aria-label", "Pick section color");
    colorInput.value =
      section.color?.accent || sectionPalette[0].accent || "#f07c4a";
    colorInput.addEventListener("input", (event) => {
      const nextColor = deriveSectionColor(event.target.value);
      section.color = nextColor;
      card.style.setProperty("--section-accent", nextColor.accent);
      card.style.setProperty("--section-bg", nextColor.bg);
      card.style.setProperty("--section-border", nextColor.border);
      queueSave();
    });

    emojiOptions.forEach((emoji) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "emoji-option";
      option.textContent = emojiToString(emoji);
      option.addEventListener("click", (event) => {
        event.stopPropagation();
        insertEmoji(titleInput, option.textContent);
        closeEmojiPanel();
      });
      emojiPanel.appendChild(option);
    });

    emojiBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleEmojiPanel(emojiPanel);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn small";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", "Delete section");
    deleteBtn.textContent = "x";
    deleteBtn.addEventListener("click", async () => {
      await removeSection(section.id);
    });

    titleRow.append(titleInput, emojiBtn, colorInput, emojiPanel);
    header.append(titleRow, deleteBtn);

    const tasksList = document.createElement("div");
    tasksList.className = "tasks-list";

    if (!section.tasks.length) {
      const empty = document.createElement("div");
      empty.className = "section-empty";
      empty.textContent = "No tasks yet.";
      tasksList.appendChild(empty);
    } else {
      section.tasks.forEach((task) => {
        const taskItem = document.createElement("div");
        taskItem.className = "task-item";
        taskItem.dataset.id = task.id;
        if (task.done) {
          taskItem.classList.add("done");
        }

        const checkbox = document.createElement("input");
        checkbox.className = "task-check";
        checkbox.type = "checkbox";
        checkbox.checked = !!task.done;
        checkbox.addEventListener("change", () => {
          task.done = checkbox.checked;
          taskItem.classList.toggle("done", task.done);
          updateDayStats(state.data[state.currentDate]);
          renderHistory();
          queueSave();
        });

        const text = document.createElement("textarea");
        text.className = "task-text";
        text.placeholder = "Write a task or note";
        text.value = task.text || "";
        text.addEventListener("input", (event) => {
          task.text = event.target.value;
          queueSave();
        });

        const taskDelete = document.createElement("button");
        taskDelete.className = "icon-btn small";
        taskDelete.type = "button";
        taskDelete.setAttribute("aria-label", "Delete task");
        taskDelete.textContent = "x";
        taskDelete.addEventListener("click", async () => {
          await removeTask(section.id, task.id);
        });

        taskItem.append(checkbox, text, taskDelete);
        tasksList.appendChild(taskItem);
      });
    }

    const actions = document.createElement("div");
    actions.className = "section-actions";

    const addTaskBtn = document.createElement("button");
    addTaskBtn.className = "ghost-btn add-task-btn";
    addTaskBtn.type = "button";
    addTaskBtn.textContent = "Add task";
    addTaskBtn.addEventListener("click", () => addTask(section.id));

    actions.appendChild(addTaskBtn);

    card.append(header, tasksList, actions);
    elements.sectionsList.appendChild(card);
  });

  if (needsSave) {
    persistData();
  }
}

function renderSectionIdeas() {
  if (!elements.sectionIdeas) return;
  elements.sectionIdeas.innerHTML = "";
  sectionIdeas.forEach((idea, index) => {
    const color = ideaPalette[index % ideaPalette.length];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "idea-btn";
    button.textContent = idea;
    if (color) {
      button.style.setProperty("--idea-bg", color.bg);
      button.style.setProperty("--idea-border", color.border);
      button.style.setProperty("--idea-text", color.text);
    }
    button.addEventListener("click", () => addSection(idea));
    elements.sectionIdeas.appendChild(button);
  });
}

function renderWallet(entries) {
  elements.walletList.innerHTML = "";
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Log income for the day.";
    elements.walletList.appendChild(empty);
    updateWalletTotal(entries);
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "wallet-item";
    row.dataset.id = entry.id;

    const sourceInput = document.createElement("input");
    sourceInput.className = "wallet-input";
    sourceInput.type = "text";
    sourceInput.placeholder = "Source";
    sourceInput.value = entry.source || "";
    sourceInput.addEventListener("input", (event) => {
      entry.source = event.target.value;
      queueSave();
    });

    const amountInput = document.createElement("input");
    amountInput.className = "wallet-amount";
    amountInput.type = "number";
    amountInput.step = "0.01";
    amountInput.min = "0";
    amountInput.placeholder = "0.00";
    amountInput.value = entry.amount === "" ? "" : entry.amount ?? "";
    amountInput.addEventListener("input", (event) => {
      const value = event.target.value;
      entry.amount = value === "" ? "" : Number(value);
      updateWalletTotal(entries);
      queueSave();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn small";
    deleteBtn.type = "button";
    deleteBtn.setAttribute("aria-label", "Delete income");
    deleteBtn.textContent = "x";
    deleteBtn.addEventListener("click", async () => {
      await removeWalletEntry(entry.id);
    });

    row.append(sourceInput, amountInput, deleteBtn);
    elements.walletList.appendChild(row);
  });

  updateWalletTotal(entries);
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  const entries = Object.keys(state.data).sort((a, b) => b.localeCompare(a));

  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Your saved days will appear here.";
    elements.historyList.appendChild(empty);
    return;
  }

  entries.forEach((date) => {
    ensureDay(date);
    const day = state.data[date];
    const taskStats = countTasks(day.sections);
    const card = document.createElement("div");
    card.className = "history-item";
    if (date === state.currentDate) {
      card.classList.add("active");
    }

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "history-open";
    openBtn.innerHTML = `
      <div class="history-date">${formatDate(date, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })}</div>
      <div class="history-meta">${day.events.length} events, ${taskStats.total} tasks, ${taskStats.done} done</div>
    `;
    openBtn.addEventListener("click", () => setCurrentDate(date));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-btn small history-delete";
    deleteBtn.setAttribute("aria-label", "Delete saved day");
    deleteBtn.textContent = "x";
    deleteBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      await removeDay(date);
    });

    card.append(openBtn, deleteBtn);
    elements.historyList.appendChild(card);
  });
}

function addSection(title) {
  const day = state.data[state.currentDate];
  const section = {
    id: newId(),
    title: title || "",
    color: pickSectionColor(),
    tasks: [],
  };
  day.sections.unshift(section);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
  focusSectionTitle(section.id);
}

async function removeSection(sectionId) {
  if (!(await confirmDeletion("Delete this section and all its tasks?"))) return;
  const day = state.data[state.currentDate];
  day.sections = day.sections.filter((section) => section.id !== sectionId);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
}

function addTask(sectionId) {
  const day = state.data[state.currentDate];
  const section = day.sections.find((entry) => entry.id === sectionId);
  if (!section) return;
  const task = {
    id: newId(),
    text: "",
    done: false,
  };
  section.tasks.unshift(task);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
  focusTask(task.id);
}

async function removeTask(sectionId, taskId) {
  if (!(await confirmDeletion("Delete this task?"))) return;
  const day = state.data[state.currentDate];
  const section = day.sections.find((entry) => entry.id === sectionId);
  if (!section) return;
  section.tasks = section.tasks.filter((task) => task.id !== taskId);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
}

function addEvent() {
  const day = state.data[state.currentDate];
  const event = {
    id: newId(),
    time: "",
    text: "",
  };
  day.events.unshift(event);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
  focusEvent(event.id);
}

function addWalletEntry() {
  const day = state.data[state.currentDate];
  const entry = {
    id: newId(),
    source: "",
    amount: "",
  };
  day.wallet.unshift(entry);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
  focusWalletEntry(entry.id);
}

async function removeWalletEntry(entryId) {
  if (!(await confirmDeletion("Delete this income entry?"))) return;
  const day = state.data[state.currentDate];
  day.wallet = day.wallet.filter((entry) => entry.id !== entryId);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
}

async function removeEvent(eventId) {
  if (!(await confirmDeletion("Delete this event?"))) return;
  const day = state.data[state.currentDate];
  day.events = day.events.filter((event) => event.id !== eventId);
  day.lastUpdated = Date.now();
  persistData();
  renderDay();
}

async function removeDay(date) {
  if (!(await confirmDeletion("Delete this saved day? This cannot be undone."))) return;
  delete state.data[date];
  persistData();
  if (date === state.currentDate) {
    const remaining = Object.keys(state.data).sort((a, b) => b.localeCompare(a));
    const nextDate = remaining[0] || getTodayISO();
    setCurrentDate(nextDate);
  } else {
    renderDay();
  }
}

function focusSectionTitle(sectionId) {
  const target = elements.sectionsList.querySelector(`[data-id="${sectionId}"]`);
  if (!target) return;
  const input = target.querySelector(".section-title");
  if (input) {
    setTimeout(() => input.focus(), 0);
  }
}

function focusTask(taskId) {
  const target = elements.sectionsList.querySelector(
    `.task-item[data-id="${taskId}"]`
  );
  if (!target) return;
  const textarea = target.querySelector(".task-text");
  if (textarea) {
    setTimeout(() => textarea.focus(), 0);
  }
}

function focusEvent(eventId) {
  const target = elements.eventsList.querySelector(`[data-id="${eventId}"]`);
  if (!target) return;
  const textarea = target.querySelector(".event-text");
  if (textarea) {
    setTimeout(() => textarea.focus(), 0);
  }
}

function focusWalletEntry(entryId) {
  const target = elements.walletList.querySelector(`[data-id="${entryId}"]`);
  if (!target) return;
  const input = target.querySelector(".wallet-input");
  if (input) {
    setTimeout(() => input.focus(), 0);
  }
}

function queueSave() {
  setSaveState("Saving...");
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const day = state.data[state.currentDate];
    day.lastUpdated = Date.now();
    persistData();
    updateDayStats(day);
    renderHistory();
    setSaveState("Saved");
  }, 300);
}

function setSaveState(message) {
  elements.saveState.textContent = message;
  if (statusTimer) {
    clearTimeout(statusTimer);
  }
  if (message !== "Saved") {
    statusTimer = setTimeout(() => {
      elements.saveState.textContent = "Saved";
    }, 1500);
  }
}

function setupConfirmModal() {
  if (!elements.confirmOverlay) return;
  elements.confirmOkBtn.addEventListener("click", () => closeConfirm(true));
  elements.confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
  elements.confirmOverlay.addEventListener("click", (event) => {
    if (event.target === elements.confirmOverlay) {
      closeConfirm(false);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && confirmResolver) {
      closeConfirm(false);
    }
  });
}

function setupEmojiPicker() {
  document.addEventListener("click", (event) => {
    if (!openEmojiPanel) return;
    if (openEmojiPanel.contains(event.target)) return;
    if (event.target.closest(".emoji-trigger")) return;
    closeEmojiPanel();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && openEmojiPanel) {
      closeEmojiPanel();
    }
  });
}

function confirmDeletion(message) {
  if (!elements.confirmOverlay) {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    confirmResolver = resolve;
    elements.confirmMessage.textContent = message;
    elements.confirmOverlay.classList.add("active");
    elements.confirmOverlay.setAttribute("aria-hidden", "false");
    setTimeout(() => {
      elements.confirmOkBtn.focus();
    }, 0);
  });
}

function closeConfirm(result) {
  if (!confirmResolver) return;
  const resolve = confirmResolver;
  confirmResolver = null;
  elements.confirmOverlay.classList.remove("active");
  elements.confirmOverlay.setAttribute("aria-hidden", "true");
  resolve(result);
}

function toggleEmojiPanel(panel) {
  if (openEmojiPanel && openEmojiPanel !== panel) {
    closeEmojiPanel();
  }
  const isOpen = panel.classList.contains("active");
  if (isOpen) {
    closeEmojiPanel();
    return;
  }
  panel.classList.add("active");
  panel.setAttribute("aria-hidden", "false");
  setEmojiTriggerState(panel, true);
  openEmojiPanel = panel;
}

function closeEmojiPanel() {
  if (!openEmojiPanel) return;
  openEmojiPanel.classList.remove("active");
  openEmojiPanel.setAttribute("aria-hidden", "true");
  setEmojiTriggerState(openEmojiPanel, false);
  openEmojiPanel = null;
}

function setEmojiTriggerState(panel, expanded) {
  const trigger = document.querySelector(
    `[data-emoji-trigger="${panel.id}"]`
  );
  if (trigger) {
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
  }
}

function insertEmoji(input, emoji) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const value = input.value;
  input.value = `${value.slice(0, start)}${emoji}${value.slice(end)}`;
  const nextPos = start + emoji.length;
  input.setSelectionRange(nextPos, nextPos);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.focus();
}

function emojiToString(emoji) {
  if (Array.isArray(emoji)) {
    return String.fromCodePoint(...emoji);
  }
  return String.fromCodePoint(emoji);
}

function countTasks(sections = []) {
  return sections.reduce(
    (acc, section) => {
      const tasks = Array.isArray(section.tasks) ? section.tasks : [];
      acc.total += tasks.length;
      acc.done += tasks.filter((task) => task.done).length;
      return acc;
    },
    { total: 0, done: 0 }
  );
}

function getWalletTotal(entries = []) {
  return entries.reduce((sum, entry) => {
    const amount = typeof entry.amount === "number" ? entry.amount : parseFloat(entry.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function updateWalletTotal(entries = []) {
  if (!elements.walletTotal) return;
  const total = getWalletTotal(entries);
  elements.walletTotal.textContent = `Total: ${formatMoney(total)}`;
}

function formatMoney(amount) {
  return `LKR ${amount.toFixed(2)}`;
}

function formatDate(date, options) {
  const dt = new Date(`${date}T00:00:00`);
  return dt.toLocaleDateString(undefined, options);
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function pickSectionColor() {
  const pick = sectionPalette[Math.floor(Math.random() * sectionPalette.length)];
  return { ...pick };
}

function ensureSectionColor(section) {
  if (!section.color || !section.color.accent) {
    section.color = pickSectionColor();
    return true;
  }
  if (!section.color.bg || !section.color.border) {
    section.color = deriveSectionColor(section.color.accent);
    return true;
  }
  return false;
}

function deriveSectionColor(accent) {
  const rgb = hexToRgb(accent);
  if (!rgb) return pickSectionColor();
  const bg = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.78);
  const border = mixRgb(rgb, { r: 255, g: 255, b: 255 }, 0.58);
  return {
    accent: rgbToHex(rgb),
    bg: rgbToHex(bg),
    border: rgbToHex(border),
  };
}

function mixRgb(base, target, amount) {
  return {
    r: clampChannel(base.r + (target.r - base.r) * amount),
    g: clampChannel(base.g + (target.g - base.g) * amount),
    b: clampChannel(base.b + (target.b - base.b) * amount),
  };
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hexToRgb(hex) {
  if (typeof hex !== "string") return null;
  let value = hex.trim().replace("#", "");
  if (value.length === 3) {
    value = value
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (value.length !== 6) return null;
  const num = parseInt(value, 16);
  if (Number.isNaN(num)) return null;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHex(rgb) {
  const toHex = (value) => clampChannel(value).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}
