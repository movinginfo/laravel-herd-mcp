import { d as defineComponent, o as openBlock, c as createElementBlock, e as createBaseVNode, n as normalizeClass, t as toDisplayString, f as createCommentVNode } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1$1 = {
  key: 0,
  class: "w-full px-3 py-0.5 mb-1 rounded-md flex items-center justify-between dark:hover:bg-gray-800 hover:bg-gray-200/50"
};
const _hoisted_2 = { class: "flex items-center space-x-3" };
const _hoisted_3 = {
  key: 0,
  class: "leading-5 pt-[0.18rem] inline-block"
};
const _hoisted_4 = { class: "dark:text-gray-100" };
const _hoisted_5 = /* @__PURE__ */ createBaseVNode("span", { class: "font-icon text-black dark:text-white" }, "", -1);
const _hoisted_6 = [
  _hoisted_5
];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "ServiceStatus",
  props: {
    service: Object
  },
  emits: ["open-logs"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    return (_ctx, _cache) => {
      return __props.service.canStart ? (openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("div", {
            class: normalizeClass([{
              "bg-red-500 border-red-400": __props.service.status !== "active",
              "bg-green-500 border-green-400": __props.service.status === "active"
            }, "ml-[3px] mr-px h-2 w-2 border rounded-full"])
          }, null, 2),
          __props.service.canStart ? (openBlock(), createElementBlock("span", _hoisted_3, [
            createBaseVNode("span", _hoisted_4, toDisplayString(__props.service.name), 1)
          ])) : createCommentVNode("", true)
        ]),
        createBaseVNode("button", {
          onClick: _cache[0] || (_cache[0] = ($event) => emit("open-logs")),
          class: "hover:bg-gray-300/20 h-6 w-6 rounded mt-px pt-px transition duration-150"
        }, _hoisted_6)
      ])) : createCommentVNode("", true);
    };
  }
});
const _sfc_main = {};
const _hoisted_1 = { class: "my-2 border-gray-300 dark:border-gray-700" };
function _sfc_render(_ctx, _cache) {
  return openBlock(), createElementBlock("hr", _hoisted_1);
}
const Divider = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  Divider as D,
  _sfc_main$1 as _
};
