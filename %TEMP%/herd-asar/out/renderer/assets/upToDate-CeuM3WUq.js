import { d as defineComponent, a as ref, b as onMounted, o as openBlock, c as createElementBlock, e as createBaseVNode, h as createTextVNode, t as toDisplayString, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { _ as _imports_0 } from "./icon-Hqenk61d.js";
const _hoisted_1 = { class: "select-none h-full w-full text-sm text-black dark:text-white dark:bg-gray-900 relative" };
const _hoisted_2 = /* @__PURE__ */ createBaseVNode("div", {
  class: "absolute inset-0 h-8 w-full",
  style: { "-webkit-app-region": "drag" }
}, null, -1);
const _hoisted_3 = { class: "flex flex-col w-full h-full overflow-hidden items-center justify-center p-8" };
const _hoisted_4 = /* @__PURE__ */ createBaseVNode("img", {
  src: _imports_0,
  class: "h-24"
}, null, -1);
const _hoisted_5 = { class: "text-center mt-6" };
const _hoisted_6 = /* @__PURE__ */ createBaseVNode("h1", { class: "font-bold text-lg mb-2" }, "You're up-to-date!", -1);
const _hoisted_7 = { class: "text-gray-600 dark:text-gray-300" };
const _hoisted_8 = { class: "font-medium" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "UpToDate",
  setup(__props) {
    const version = ref("");
    onMounted(async () => {
      version.value = await window.api.app.version();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _hoisted_2,
        createBaseVNode("div", _hoisted_3, [
          _hoisted_4,
          createBaseVNode("div", _hoisted_5, [
            _hoisted_6,
            createBaseVNode("p", _hoisted_7, [
              createTextVNode(" Herd "),
              createBaseVNode("span", _hoisted_8, toDisplayString(version.value), 1),
              createTextVNode(" is currently the latest version available. ")
            ])
          ])
        ])
      ]);
    };
  }
});
createApp(_sfc_main).mount("#app");
