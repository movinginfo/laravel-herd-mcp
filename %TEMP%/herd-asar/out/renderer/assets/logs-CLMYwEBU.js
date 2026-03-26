import { d as defineComponent, a as ref, b as onMounted, o as openBlock, c as createElementBlock, t as toDisplayString, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
const _hoisted_1 = { class: "overflow-scroll h-full w-full text-sm text-black dark:bg-gray-900 dark:text-white" };
const _hoisted_2 = {
  key: 0,
  class: "p-4"
};
const _hoisted_3 = {
  key: 1,
  class: "p-4 text-gray-700 dark:text-gray-200"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Logs",
  setup(__props) {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceName = ref(urlParams.get("service") || "unknown");
    const pid = ref(urlParams.get("pid") || "");
    const logs = ref("");
    const hasLogs = ref(false);
    let removeLogUpdateListener = null;
    onMounted(async () => {
      hasLogs.value = false;
      if (pid.value != "") {
        logs.value = await window.api.fetchLogsByPid(pid.value);
        removeLogUpdateListener = window.api.onLogUpdateByPid(pid.value, (_, logEntry) => {
          logs.value = logEntry;
        });
      } else {
        logs.value = await window.api.fetchLogs(serviceName.value);
        removeLogUpdateListener = window.api.onLogUpdate(serviceName.value, (_, logEntry) => {
          logs.value = logEntry;
        });
      }
      hasLogs.value = logs.value && logs.value.length > 0;
      window.addEventListener("close", () => {
        if (removeLogUpdateListener) {
          removeLogUpdateListener();
        }
      });
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        hasLogs.value ? (openBlock(), createElementBlock("pre", _hoisted_2, toDisplayString(logs.value), 1)) : (openBlock(), createElementBlock("pre", _hoisted_3, "No logs found."))
      ]);
    };
  }
});
createApp(_sfc_main).mount("#app");
