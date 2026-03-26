import { d as defineComponent, o as openBlock, c as createElementBlock } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
const _hoisted_1 = ["type", "value"];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "UiInput",
  props: {
    type: {
      type: String,
      default: "text",
      required: false
    },
    modelValue: {
      default: ""
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
      return openBlock(), createElementBlock("input", {
        type: __props.type,
        value: props.modelValue,
        onInput: _cache[0] || (_cache[0] = ($event) => updateValue($event.target.value)),
        class: "rounded-md px-2 py-1 text-onboarding-gray border-b border-gray-200 dark:text-gray-100 dark:placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:border-gray-600 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-600 disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-300"
      }, null, 40, _hoisted_1);
    };
  }
});
export {
  _sfc_main as _
};
