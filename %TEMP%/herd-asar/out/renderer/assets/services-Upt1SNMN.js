import { d as defineComponent, a as ref, j as computed, k as watch, b as onMounted, K as nextTick, x as onUnmounted, o as openBlock, c as createElementBlock, e as createBaseVNode, F as Fragment, y as withDirectives, L as vModelSelect, s as renderList, h as createTextVNode, t as toDisplayString, f as createCommentVNode, g as createVNode, l as createBlock, w as withCtx, p as createStaticVNode, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { L as LightButton } from "./LightButton-ClEtlTs9.js";
import { _ as _sfc_main$2 } from "./UiInput.vue_vue_type_script_setup_true_lang-P0XHcdXO.js";
import { _ as _sfc_main$1 } from "./UiCheckbox.vue_vue_type_script_setup_true_lang-GOwQWYxP.js";
import { L as Loading } from "./Loading-B6H_jlkQ.js";
import "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1 = { class: "select-none h-full w-full text-sm text-black dark:text-white relative" };
const _hoisted_2 = /* @__PURE__ */ createBaseVNode("div", {
  class: "absolute inset-0 h-8 w-full",
  style: { "-webkit-app-region": "drag" }
}, null, -1);
const _hoisted_3 = { class: "flex w-full h-full overflow-hidden" };
const _hoisted_4 = { class: "flex flex-col w-full bg-white dark:bg-gray-900" };
const _hoisted_5 = { class: "border-b border-gray-200 dark:border-gray-600 mb-4 p-6" };
const _hoisted_6 = {
  key: 0,
  class: "text-xl font-bold"
};
const _hoisted_7 = {
  key: 1,
  class: "text-xl font-bold"
};
const _hoisted_8 = { class: "px-6 pt-4 flex flex-wrap space-y-2" };
const _hoisted_9 = /* @__PURE__ */ createBaseVNode("label", { class: "w-1/3 flex items-center" }, "Category:", -1);
const _hoisted_10 = /* @__PURE__ */ createStaticVNode('<option value="database">Database</option><option value="cache">Cache</option><option value="queue">Queue</option><option value="broadcasting">Broadcasting</option><option value="search">Search</option><option value="storage">Storage</option>', 6);
const _hoisted_16 = [
  _hoisted_10
];
const _hoisted_17 = /* @__PURE__ */ createBaseVNode("label", { class: "w-1/3 flex items-center" }, "Service:", -1);
const _hoisted_18 = ["disabled"];
const _hoisted_19 = ["value"];
const _hoisted_20 = { class: "text-sm" };
const _hoisted_21 = /* @__PURE__ */ createBaseVNode("label", { class: "w-1/3 flex items-center" }, null, -1);
const _hoisted_22 = { class: "w-2/3 flex items-center space-x-2" };
const _hoisted_23 = /* @__PURE__ */ createBaseVNode("label", { for: "showLatestVersions" }, "Only show latest versions", -1);
const _hoisted_24 = /* @__PURE__ */ createBaseVNode("label", { class: "w-1/3 flex items-center" }, "Name:", -1);
const _hoisted_25 = /* @__PURE__ */ createBaseVNode("label", { class: "w-1/3 flex items-center" }, "Port:", -1);
const _hoisted_26 = /* @__PURE__ */ createBaseVNode("label", { class: "w-1/3 flex items-center" }, null, -1);
const _hoisted_27 = { class: "flex items-center space-x-2" };
const _hoisted_28 = /* @__PURE__ */ createBaseVNode("label", { for: "autostart" }, "Automatically start with Herd", -1);
const _hoisted_29 = {
  key: 1,
  for: "securedProxy",
  class: "w-1/3 flex items-center"
};
const _hoisted_30 = {
  key: 2,
  class: "flex items-center space-x-2"
};
const _hoisted_31 = /* @__PURE__ */ createBaseVNode("label", { for: "securedProxy" }, "Serve over HTTPS", -1);
const _hoisted_32 = {
  key: 0,
  class: "text-red-700 font-medium pt-4 px-6"
};
const _hoisted_33 = /* @__PURE__ */ createBaseVNode("div", { class: "flex-1" }, null, -1);
const _hoisted_34 = { class: "border-t border-gray-200 dark:border-gray-600 px-6 py-3 bg-gray-50 dark:bg-gray-800 flex items-center justify-end space-x-4" };
const _hoisted_35 = {
  key: 0,
  class: "flex-1 items-center space-x-2 w-full"
};
const _hoisted_36 = {
  key: 0,
  class: "flex space-x-2 items-center"
};
const _hoisted_37 = /* @__PURE__ */ createBaseVNode("span", { class: "" }, "Downloading binaries", -1);
const _hoisted_38 = ["value"];
const _hoisted_39 = {
  key: 1,
  class: "flex items-center w-full"
};
const _hoisted_40 = /* @__PURE__ */ createBaseVNode("span", { class: "flex" }, "Preparing Service", -1);
const _hoisted_41 = /* @__PURE__ */ createBaseVNode("span", null, "Save", -1);
const _hoisted_42 = /* @__PURE__ */ createBaseVNode("span", null, "Get Herd Pro", -1);
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Services",
  setup(__props) {
    const storedService = ref({
      id: void 0,
      name: "",
      port: "",
      type: "mysql",
      autostart: true,
      source: "",
      version: "",
      options: {}
    });
    const hasValidLicense = ref(false);
    const category = ref("database");
    const availableServices = ref([]);
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = ref(urlParams.get("service") || "");
    const saving = ref(false);
    const savingError = ref("");
    const downloadProgress = ref(0);
    const selectedService = ref(null);
    const showLatestVersions = ref(true);
    let removeOnDownloadProgressListener = null;
    const filteredAvailableServices = computed(() => {
      return availableServices.value.filter((availableService) => availableService.categories.includes(category.value));
    });
    const securableServiceSelected = computed(() => {
      return selectedService.value && (selectedService.value.type === "reverb" || selectedService.value.type === "minio" || selectedService.value.type === "rustfs");
    });
    watch(showLatestVersions, async (value) => {
      availableServices.value = await window.api.services.getAvailableServices(value);
    });
    watch(category, (value) => {
      selectedService.value = filteredAvailableServices.value[0];
    });
    watch(selectedService, (service) => {
      storedService.value.name = service.label;
      storedService.value.port = service.port;
      storedService.value.type = service.type;
      storedService.value.version = service.version;
      storedService.value.source = service.downloadUrl;
      if (service.type === "reverb" || service.type === "minio" || service.type === "rustfs") {
        storedService.value.options.securedProxy = false;
      } else {
        storedService.value.options = {};
      }
    });
    const openCheckout = () => {
      window.api.openURL("https://herd.laravel.com/herd-pro?ref=services");
    };
    const save = async () => {
      if (!hasValidLicense.value) {
        return;
      }
      savingError.value = "";
      window.api.services.setWindowClosable(false);
      saving.value = true;
      try {
        await window.api.services.saveServiceInstance(JSON.parse(JSON.stringify(storedService.value)));
      } catch (error) {
        window.api.services.setWindowClosable(true);
        savingError.value = error;
        saving.value = false;
        return;
      }
      window.api.services.setWindowClosable(true);
      saving.value = false;
      window.close();
    };
    onMounted(async () => {
      hasValidLicense.value = await window.api.licensing.hasValidLicense();
      storedService.value = await window.api.services.getServiceConfig(serviceId.value) ?? {
        "port": "3306"
      };
      availableServices.value = await window.api.services.getAvailableServices();
      nextTick(() => {
        if (storedService.value.id === void 0) {
          selectedService.value = filteredAvailableServices.value[0];
        }
      });
      removeOnDownloadProgressListener = window.api.services.onDownloadProgress((_, payload) => {
        downloadProgress.value = parseFloat(payload.percentage);
      });
    });
    onUnmounted(() => {
      if (removeOnDownloadProgressListener) {
        removeOnDownloadProgressListener();
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _hoisted_2,
        createBaseVNode("div", _hoisted_3, [
          createBaseVNode("div", _hoisted_4, [
            createBaseVNode("div", _hoisted_5, [
              storedService.value.id !== void 0 ? (openBlock(), createElementBlock("span", _hoisted_6, "Edit your service")) : (openBlock(), createElementBlock("span", _hoisted_7, "Create a new service"))
            ]),
            createBaseVNode("div", _hoisted_8, [
              storedService.value.id === void 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                _hoisted_9,
                withDirectives(createBaseVNode("select", {
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => category.value = $event),
                  class: "w-2/3 rounded-md px-2 py-1 text-onboarding-gray border-b border-gray-200 dark:text-gray-100 dark:placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:border-gray-600 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-600"
                }, _hoisted_16, 512), [
                  [vModelSelect, category.value]
                ]),
                _hoisted_17,
                withDirectives(createBaseVNode("select", {
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => selectedService.value = $event),
                  disabled: storedService.value.id !== void 0,
                  class: "w-2/3 rounded-md px-2 py-1 text-onboarding-gray border-b border-gray-200 dark:text-gray-100 dark:placeholder-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:focus:border-gray-600 focus:border-gray-200 focus:ring-1 focus:ring-gray-200 dark:focus:ring-gray-600"
                }, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(filteredAvailableServices.value, (availableService) => {
                    return openBlock(), createElementBlock("option", { value: availableService }, [
                      createBaseVNode("span", _hoisted_20, [
                        createTextVNode(toDisplayString(availableService.label) + " (" + toDisplayString(availableService.version) + ") ", 1),
                        !availableService.isAvailable ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                          createTextVNode("*")
                        ], 64)) : createCommentVNode("", true)
                      ])
                    ], 8, _hoisted_19);
                  }), 256))
                ], 8, _hoisted_18), [
                  [vModelSelect, selectedService.value]
                ]),
                _hoisted_21,
                createBaseVNode("div", _hoisted_22, [
                  createVNode(_sfc_main$1, {
                    id: "showLatestVersions",
                    "model-value": showLatestVersions.value,
                    modelValue: showLatestVersions.value,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => showLatestVersions.value = $event)
                  }, null, 8, ["model-value", "modelValue"]),
                  _hoisted_23
                ])
              ], 64)) : createCommentVNode("", true),
              _hoisted_24,
              createVNode(_sfc_main$2, {
                autocomplete: "off",
                spellcheck: "false",
                class: "w-2/3 text-sm placeholder:opacity-50",
                placeholder: selectedService.value?.label || "",
                modelValue: storedService.value.name,
                "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => storedService.value.name = $event)
              }, null, 8, ["placeholder", "modelValue"]),
              _hoisted_25,
              createVNode(_sfc_main$2, {
                autocomplete: "off",
                spellcheck: "false",
                type: "number",
                class: "w-2/3 text-sm placeholder:opacity-50",
                placeholder: selectedService.value?.port || "",
                modelValue: storedService.value.port,
                "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => storedService.value.port = $event)
              }, null, 8, ["placeholder", "modelValue"]),
              _hoisted_26,
              createBaseVNode("div", _hoisted_27, [
                createVNode(_sfc_main$1, {
                  id: "autostart",
                  "model-value": storedService.value.autostart,
                  modelValue: storedService.value.autostart,
                  "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => storedService.value.autostart = $event)
                }, null, 8, ["model-value", "modelValue"]),
                _hoisted_28
              ]),
              securableServiceSelected.value ? (openBlock(), createElementBlock("label", _hoisted_29)) : createCommentVNode("", true),
              securableServiceSelected.value ? (openBlock(), createElementBlock("div", _hoisted_30, [
                createVNode(_sfc_main$1, {
                  id: "securedProxy",
                  "model-value": storedService.value.options.securedProxy,
                  modelValue: storedService.value.options.securedProxy,
                  "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => storedService.value.options.securedProxy = $event)
                }, null, 8, ["model-value", "modelValue"]),
                _hoisted_31
              ])) : createCommentVNode("", true)
            ]),
            savingError.value != "" ? (openBlock(), createElementBlock("div", _hoisted_32, " Herd was unable to setup the service. Please check your log files and try again. ")) : createCommentVNode("", true),
            _hoisted_33,
            createBaseVNode("div", _hoisted_34, [
              saving.value ? (openBlock(), createElementBlock("div", _hoisted_35, [
                downloadProgress.value > 0 && downloadProgress.value != 100 ? (openBlock(), createElementBlock("div", _hoisted_36, [
                  _hoisted_37,
                  createBaseVNode("progress", {
                    class: "flex-1",
                    value: downloadProgress.value,
                    max: "100"
                  }, null, 8, _hoisted_38)
                ])) : (openBlock(), createElementBlock("div", _hoisted_39, [
                  _hoisted_40,
                  createVNode(Loading, { class: "flex-1 max-w-xs mx-auto" })
                ]))
              ])) : createCommentVNode("", true),
              hasValidLicense.value ? (openBlock(), createBlock(LightButton, {
                key: 1,
                onClick: save,
                disabled: !storedService.value.name || !storedService.value.type || !storedService.value.port || saving.value,
                class: "disabled:opacity-50"
              }, {
                default: withCtx(() => [
                  _hoisted_41
                ]),
                _: 1
              }, 8, ["disabled"])) : (openBlock(), createBlock(LightButton, {
                key: 2,
                onClick: openCheckout,
                class: "!bg-laravel-red !text-white"
              }, {
                default: withCtx(() => [
                  _hoisted_42
                ]),
                _: 1
              }))
            ])
          ])
        ])
      ]);
    };
  }
});
createApp(_sfc_main).mount("#app");
