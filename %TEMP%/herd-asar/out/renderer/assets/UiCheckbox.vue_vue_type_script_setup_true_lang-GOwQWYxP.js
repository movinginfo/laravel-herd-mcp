import { d as defineComponent, o as openBlock, c as createElementBlock } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
const _hoisted_1 = ["checked"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "UiCheckbox",
  props: {
    modelValue: Boolean
  },
  emits: ["update:modelValue"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    function updateValue(value) {
      emit("update:modelValue", value);
    }
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("input", {
        type: "checkbox",
        checked: props.modelValue,
        onInput: _cache[0] || (_cache[0] = ($event) => updateValue($event.target.checked)),
        class: "h-4 w-4 rounded border dark:border-gray-600 bg-white/5 text-onboarding-red dark:focus:ring-gray-600 dark:focus:ring-offset-gray-900 focus:ring-gray-200 focus:ring-offset-gray-300 disabled:text-gray-600"
      }, null, 40, _hoisted_1);
    };
  }
});
export {
  _sfc_main as _
};
