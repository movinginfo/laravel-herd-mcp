import { d as defineComponent, o as openBlock, c as createElementBlock, r as renderSlot, e as createBaseVNode } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
const _hoisted_1 = ["type"];
const _hoisted_2 = /* @__PURE__ */ createBaseVNode("span", {
  style: { "font-size": "8px" },
  class: "font-icon text-white bg-black rounded-full text-xs ml-4 h-4 w-4 inline-flex justify-center items-center active:bg-opacity-70"
}, "", -1);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "OnboardingButton",
  props: {
    type: {
      type: String,
      default: "button",
      required: false
    }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("button", {
        type: __props.type,
        class: "bg-laravel-red text-white p-3 rounded-md text-sm flex items-center justify-center active:bg-opacity-70"
      }, [
        renderSlot(_ctx.$slots, "default"),
        _hoisted_2
      ], 8, _hoisted_1);
    };
  }
});
export {
  _sfc_main as _
};
