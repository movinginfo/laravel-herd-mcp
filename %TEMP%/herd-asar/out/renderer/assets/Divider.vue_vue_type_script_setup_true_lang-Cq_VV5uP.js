import { d as defineComponent, o as openBlock, c as createElementBlock, n as normalizeClass } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
const _imports_1 = "" + new URL("../Blurs.png", import.meta.url).href;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Divider",
  props: {
    margin: {
      type: String,
      required: false,
      default: "my-8"
    }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("hr", {
        class: normalizeClass(["border-gray-200 dark:border-gray-700", __props.margin])
      }, null, 2);
    };
  }
});
export {
  _imports_1 as _,
  _sfc_main as a
};
