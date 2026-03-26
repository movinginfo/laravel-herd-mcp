import { d as defineComponent, o as openBlock, c as createElementBlock, r as renderSlot, e as createBaseVNode } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1$1 = ["value", "disabled"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "UiSelect",
  props: {
    modelValue: [String, Object, Number, Boolean],
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    function updateValue(value) {
      emit("update:modelValue", value);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("select", {
        value: props.modelValue,
        onInput: _cache[0] || (_cache[0] = ($event) => updateValue($event.target.value)),
        disabled: props.disabled,
        class: "border border-gray-200 dark:border-gray-600 dark:bg-gray-700 text-gray-700 dark:text-white rounded-md h-8 text-sm pr-8 py-1 shadow focus:border-gray-200 dark:focus:border-gray-600 focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-600 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-300"
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 40, _hoisted_1$1);
    };
  }
});
const _sfc_main = {};
const _hoisted_1 = {
  version: "1.0",
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 196.000000 196.000000",
  preserveAspectRatio: "xMidYMid meet"
};
const _hoisted_2 = /* @__PURE__ */ createBaseVNode("g", {
  transform: "translate(0.000000,196.000000) scale(0.100000,-0.100000)",
  fill: "currentColor",
  stroke: "none"
}, [
  /* @__PURE__ */ createBaseVNode("path", { d: "M341 1602 c-17 -32 -42 -145 -34 -152 4 -4 37 -13 73 -19 147 -25\r\n229 -67 244 -126 6 -23 -125 -552 -156 -629 -29 -72 -88 -113 -202 -142 -36\r\n-9 -70 -21 -75 -28 -10 -12 -41 -125 -41 -150 0 -14 32 -16 305 -16 l305 0 13\r\n23 c8 12 36 105 62 207 25 102 53 195 61 208 14 22 18 22 219 22 204 0 206 0\r\n215 23 11 24 60 219 60 236 0 8 -64 11 -199 11 -152 0 -201 3 -209 13 -9 10\r\n-4 41 17 120 16 58 32 111 36 116 4 7 103 11 298 11 161 0 297 4 303 8 20 13\r\n175 263 169 272 -4 6 -283 10 -730 10 -683 0 -725 -1 -734 -18z" })
], -1);
const _hoisted_3 = [
  _hoisted_2
];
function _sfc_render(_ctx, _cache) {
  return openBlock(), createElementBlock("svg", _hoisted_1, _hoisted_3);
}
const Forge = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  Forge as F,
  _sfc_main$1 as _
};
