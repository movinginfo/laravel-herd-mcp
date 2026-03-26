import { d as defineComponent, a as ref, M as reactive, j as computed, b as onMounted, x as onUnmounted, o as openBlock, c as createElementBlock, e as createBaseVNode, F as Fragment, h as createTextVNode, s as renderList, g as createVNode, w as withCtx, t as toDisplayString, f as createCommentVNode, n as normalizeClass, l as createBlock, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { L as Loading } from "./Loading-B6H_jlkQ.js";
import { L as LightButton } from "./LightButton-ClEtlTs9.js";
import { _ as _sfc_main$1 } from "./Box.vue_vue_type_script_setup_true_lang-BsHZ1uVF.js";
import { _ as _sfc_main$2 } from "./UiInput.vue_vue_type_script_setup_true_lang-P0XHcdXO.js";
import { _ as _sfc_main$3 } from "./Forge-DHNxl4hC.js";
import { _ as _sfc_main$4 } from "./UiCheckbox.vue_vue_type_script_setup_true_lang-GOwQWYxP.js";
import "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1 = { class: "select-none h-full w-full text-sm text-black dark:text-white relative" };
const _hoisted_2 = /* @__PURE__ */ createBaseVNode("div", {
  class: "absolute inset-0 h-8 w-full",
  style: { "-webkit-app-region": "drag" }
}, null, -1);
const _hoisted_3 = { class: "flex w-full h-full overflow-hidden" };
const _hoisted_4 = { class: "flex flex-col w-full bg-white dark:bg-gray-900" };
const _hoisted_5 = { class: "border-b border-gray-200 dark:border-gray-600 mb-4 p-6" };
const _hoisted_6 = { class: "text-xl font-bold" };
const _hoisted_7 = { class: "px-6 pb-8 flex-1 items-center grid grid-cols-2 gap-4" };
const _hoisted_8 = {
  key: 0,
  class: "text-center text-red-600 dark:text-red-500 pb-4"
};
const _hoisted_9 = {
  key: 1,
  class: "w-full max-w-[100%] text-center text-gray-600 dark:text-gray-200 pb-4"
};
const _hoisted_10 = {
  key: 0,
  class: "px-6 pb-8 flex-1 items-center grid grid-cols-3 gap-x-4"
};
const _hoisted_11 = {
  key: 2,
  class: "px-10 pb-8 flex-1 items-center justify-center flex"
};
const _hoisted_12 = { class: "grid grid-cols-8 gap-y-2 gap-x-4 items-center w-full" };
const _hoisted_13 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Project Path:", -1);
const _hoisted_14 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Project Name:", -1);
const _hoisted_15 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "PHP:", -1);
const _hoisted_16 = ["value"];
const _hoisted_17 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "HTTPS:", -1);
const _hoisted_18 = { class: "py-1 items-center flex col-span-5" };
const _hoisted_19 = {
  key: 0,
  class: "text-center text-red-600 dark:text-red-500 py-4 col-span-8"
};
const _hoisted_20 = {
  key: 3,
  class: "px-10 pb-8 flex-1 items-center justify-center flex"
};
const _hoisted_21 = { class: "grid grid-cols-8 gap-y-2 gap-x-4 items-center w-full" };
const _hoisted_22 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Project Name:", -1);
const _hoisted_23 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Authentication Provider:", -1);
const _hoisted_24 = /* @__PURE__ */ createBaseVNode("option", { value: "none" }, "None", -1);
const _hoisted_25 = /* @__PURE__ */ createBaseVNode("option", { value: "laravel" }, "Laravel's built-in authentication", -1);
const _hoisted_26 = /* @__PURE__ */ createBaseVNode("option", { value: "workos" }, "WorkOS (Requires WorkOS account)", -1);
const _hoisted_27 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Would you like to use Laravel Volt?", -1);
const _hoisted_28 = /* @__PURE__ */ createBaseVNode("option", { value: "true" }, "Yes", -1);
const _hoisted_29 = /* @__PURE__ */ createBaseVNode("option", { value: "false" }, "No", -1);
const _hoisted_30 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Testing Framework:", -1);
const _hoisted_31 = /* @__PURE__ */ createBaseVNode("option", { value: "pest" }, "Pest", -1);
const _hoisted_32 = /* @__PURE__ */ createBaseVNode("option", { value: "phpunit" }, "PHPUnit", -1);
const _hoisted_33 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Install Laravel Boost:", -1);
const _hoisted_34 = { class: "py-1 items-center flex col-span-5" };
const _hoisted_35 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Starter Kit Package Name:", -1);
const _hoisted_36 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Initialize a git repository:", -1);
const _hoisted_37 = { class: "py-1 items-center flex col-span-5" };
const _hoisted_38 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Target Location:", -1);
const _hoisted_39 = ["value"];
const _hoisted_40 = /* @__PURE__ */ createBaseVNode("span", { class: "text-right col-span-8 flex-1 text-onboarding-gray dark:text-gray-100 inline-block" }, "Your project will be created in this folder.", -1);
const _hoisted_41 = {
  key: 2,
  class: "text-center text-red-600 dark:text-red-500 py-4 col-span-8"
};
const _hoisted_42 = {
  key: 1,
  class: "flex flex-col items-center justify-center flex-1 overflow-auto px-6"
};
const _hoisted_43 = /* @__PURE__ */ createBaseVNode("span", { class: "text-onboarding-gray dark:text-gray-100 inline-block py-4" }, "Creating your project…", -1);
const _hoisted_44 = { class: "bg-white dark:bg-gray-900 w-full" };
const _hoisted_45 = ["textContent"];
const _hoisted_46 = {
  key: 2,
  class: "flex flex-col items-center justify-center flex-1 overflow-auto px-6"
};
const _hoisted_47 = /* @__PURE__ */ createBaseVNode("span", { class: "text-onboarding-gray dark:text-gray-100 inline-block py-4" }, "There was an error creating your application.", -1);
const _hoisted_48 = { class: "bg-white dark:bg-gray-900 w-full" };
const _hoisted_49 = ["textContent"];
const _hoisted_50 = { class: "flex flex-col items-center justify-center text-center flex-1 overflow-auto px-6" };
const _hoisted_51 = /* @__PURE__ */ createBaseVNode("p", { class: "text-onboarding-gray dark:text-white" }, [
  /* @__PURE__ */ createTextVNode(" Your application was created successfully."),
  /* @__PURE__ */ createBaseVNode("br"),
  /* @__PURE__ */ createTextVNode(" Build something amazing!")
], -1);
const _hoisted_52 = ["textContent"];
const _hoisted_53 = { class: "flex justify-end" };
const _hoisted_54 = { key: 0 };
const _hoisted_55 = { key: 1 };
const _hoisted_56 = { class: "border-t border-gray-200 dark:border-gray-600 px-6 py-3 bg-gray-50 dark:bg-gray-800 justify-end flex items-center space-x-4" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SiteWizard",
  setup(__props) {
    const step = ref(0);
    const isBusy = ref(false);
    const selectingFolder = ref(false);
    const isFinished = ref(false);
    const hasError = ref(false);
    const showOutput = ref(false);
    const output = ref("");
    const valetConfig = ref(null);
    const phpVersions = ref([]);
    const sites = ref([]);
    const wizardError = ref("");
    const defaultPhpVersion = ref("8.4");
    const installOutput = ref();
    const urlParams = new URLSearchParams(window.location.search);
    const defaultStarterKit = ref(urlParams.get("defaultStarterKit") || "");
    const defaultName = ref(urlParams.get("defaultName") || "");
    let removeOnSiteWizardOutputListener = null;
    const availableStartOptions = [
      {
        label: "New Laravel project",
        id: "new"
      },
      {
        label: "Link existing project",
        id: "link-existing"
      }
    ];
    const availableTemplates = [
      {
        label: "No starter kit",
        id: "none"
      },
      {
        label: "React",
        id: "react"
      },
      {
        label: "Vue",
        id: "vue"
      },
      {
        label: "Svelte",
        id: "svelte"
      },
      {
        label: "Livewire",
        id: "livewire"
      },
      {
        label: "Custom starter kit",
        id: "custom"
      }
    ];
    const wizardData = reactive({
      selectedStartOption: "new",
      selectedStarterKit: "none",
      customStarterKit: "",
      name: "",
      authProvider: "laravel",
      useVolt: "true",
      testingFramework: "pest",
      boost: true,
      git: false,
      targetFolder: "",
      existingSite: {
        path: "",
        site: "",
        phpVersion: "",
        secured: false
      }
    });
    const canProceed = computed(() => {
      if (isBusy.value) {
        return false;
      }
      if (wizardData.selectedStartOption === "link-existing" && selectingFolder.value) {
        return false;
      }
      if (step.value == 0 || step.value == 1) {
        return true;
      }
      if (wizardData.selectedStartOption === "link-existing") {
        return wizardData.existingSite.path.length > 0 && wizardData.existingSite.site.length > 0;
      }
      return wizardData.name.length > 0;
    });
    const createSite = () => {
      if (sites.value.find((site) => site.site === wizardData.name)) {
        wizardError.value = "There is already a site with the same name in Herd.";
        return;
      }
      wizardData.name = cleanUpSiteName(wizardData.name);
      window.api.app.createSite(JSON.parse(JSON.stringify(wizardData)));
      isBusy.value = true;
    };
    const addSite = () => {
      if (sites.value.find((site) => site.site === wizardData.existingSite.site)) {
        wizardError.value = "The selected folder was already added to Herd.";
        return;
      }
      wizardData.existingSite.site = cleanUpSiteName(wizardData.existingSite.site);
      window.api.app.addSite(JSON.parse(JSON.stringify(wizardData.existingSite)));
      isBusy.value = true;
    };
    const openURL = () => {
      let siteName = wizardData.name;
      if (wizardData.selectedStartOption === "link-existing") {
        siteName = wizardData.existingSite.site;
      }
      window.api.openURL(`http://${siteName}.test`);
    };
    const close = () => {
      window.close();
    };
    const next = async () => {
      sites.value = await window.api.sites.fetchSites();
      if (wizardData.selectedStartOption === "link-existing" && step.value === 0) {
        selectingFolder.value = true;
        wizardError.value = "";
        const sitePath = await window.api.sites.addExistingSite();
        selectingFolder.value = false;
        if (sitePath === null) {
          wizardError.value = "No folder was selected.";
          return;
        }
        wizardData.existingSite.path = sitePath;
        wizardData.existingSite.site = sitePath.split("\\").pop();
        wizardData.existingSite.site = cleanUpSiteName(wizardData.existingSite.site);
        wizardData.existingSite.secured = await window.api.sites.isSecuredSite(wizardData.existingSite.site);
        wizardData.existingSite.phpVersion = await window.api.sites.readComposerPhpVersion(wizardData.existingSite.path);
        if (wizardData.existingSite.phpVersion === "" || phpVersions.value.indexOf(wizardData.existingSite.phpVersion) === -1) {
          wizardData.existingSite.phpVersion = defaultPhpVersion.value;
        }
      }
      step.value++;
    };
    const cleanUpSiteName = (siteName) => {
      return siteName.replace(/ /g, "-").replace(/[^a-z0-9_.]+/gi, "-").toLowerCase();
    };
    function handleKeydown(event) {
      if (step.value === 0) {
        let currentStartOptionIndex = availableStartOptions.findIndex((option) => option.id === wizardData.selectedStartOption);
        if (event.key === "ArrowRight") {
          wizardData.selectedStartOption = availableStartOptions[currentStartOptionIndex + 1] ? availableStartOptions[currentStartOptionIndex + 1].id : availableStartOptions[0].id;
        }
        if (event.key === "ArrowLeft") {
          wizardData.selectedStartOption = availableStartOptions[currentStartOptionIndex - 1] ? availableStartOptions[currentStartOptionIndex - 1].id : availableStartOptions[availableStartOptions.length - 1].id;
        }
        if (event.key === "Enter") {
          next();
        }
        if (event.key === "Escape") {
          close();
        }
      }
      if (step.value === 1) {
        let currentTemplateIndex = availableTemplates.findIndex((template) => template.id === wizardData.selectedStarterKit);
        if (event.key === "ArrowRight") {
          wizardData.selectedStarterKit = availableTemplates[currentTemplateIndex + 1] ? availableTemplates[currentTemplateIndex + 1].id : availableTemplates[0].id;
        }
        if (event.key === "ArrowLeft") {
          wizardData.selectedStarterKit = availableTemplates[currentTemplateIndex - 1] ? availableTemplates[currentTemplateIndex - 1].id : availableTemplates[availableTemplates.length - 1].id;
        }
        if (event.key === "Enter") {
          next();
        }
        if (event.key === "Escape") {
          step.value--;
        }
      }
      if (step.value === 2) {
        if (event.key === "Escape") {
          step.value--;
        }
      }
    }
    onMounted(async () => {
      wizardData.selectedStartOption = "new";
      valetConfig.value = await window.api.valet.config();
      if (valetConfig.value.paths.length > 0) {
        wizardData.targetFolder = valetConfig.value.paths[valetConfig.value.paths.length - 1];
      } else {
        wizardData.targetFolder = "";
      }
      phpVersions.value = await window.api.herd.installedPHPVersions();
      defaultPhpVersion.value = await window.api.herd.activePHPVersion();
      removeOnSiteWizardOutputListener = window.api.app.onSiteWizardOutput(async (_, data) => {
        if (data.type == "stdout" || data.type == "stderr") {
          output.value += data.data;
        }
        if (data.type == "close") {
          isFinished.value = true;
          isBusy.value = false;
          if (hasError.value === false) {
            if (wizardData.selectedStartOption === "link-existing") {
              await window.api.app.siteWizardCreatedSite(wizardData.existingSite.site);
            } else {
              await window.api.app.siteWizardCreatedSite(wizardData.name);
            }
          }
        }
        if (data.type == "error") {
          hasError.value = true;
          isBusy.value = false;
          isFinished.value = true;
        }
        if (installOutput.value) {
          installOutput.value.scrollTop = installOutput.value.scrollHeight;
        }
      });
      document.addEventListener("keydown", handleKeydown);
      if (defaultStarterKit.value !== "") {
        wizardData.selectedStartOption = "new";
        wizardData.selectedStarterKit = "custom";
        wizardData.customStarterKit = defaultStarterKit.value;
        wizardData.name = defaultName.value;
        step.value = 2;
      }
    });
    onUnmounted(() => {
      if (removeOnSiteWizardOutputListener !== null) {
        removeOnSiteWizardOutputListener();
      }
      document.removeEventListener("keydown", handleKeydown);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _hoisted_2,
        createBaseVNode("div", _hoisted_3, [
          createBaseVNode("div", _hoisted_4, [
            createBaseVNode("div", _hoisted_5, [
              createBaseVNode("span", _hoisted_6, [
                wizardData.selectedStartOption === "new" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(" Create New Site ")
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(" Add Site ")
                ], 64))
              ])
            ]),
            !isBusy.value && !isFinished.value && !hasError.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              step.value == 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createBaseVNode("div", _hoisted_7, [
                  (openBlock(), createElementBlock(Fragment, null, renderList(availableStartOptions, (template) => {
                    return createVNode(_sfc_main$1, {
                      key: template.id,
                      selected: template.id === wizardData.selectedStartOption,
                      icon: template.id,
                      onDblclick: next,
                      onClick: ($event) => wizardData.selectedStartOption = template.id
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(template.label), 1)
                      ]),
                      _: 2
                    }, 1032, ["selected", "icon", "onClick"]);
                  }), 64))
                ]),
                wizardError.value ? (openBlock(), createElementBlock("p", _hoisted_8, toDisplayString(wizardError.value), 1)) : (openBlock(), createElementBlock("p", _hoisted_9, [
                  wizardData.selectedStartOption === "new" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    createTextVNode(" Start a fresh Laravel project. ")
                  ], 64)) : wizardData.selectedStartOption === "link-existing" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    createTextVNode(" Link an existing PHP project. Herd supports many PHP frameworks and CMS. ")
                  ], 64)) : createCommentVNode("", true)
                ]))
              ], 64)) : createCommentVNode("", true),
              step.value == 1 ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                wizardData.selectedStartOption === "new" ? (openBlock(), createElementBlock("div", _hoisted_10, [
                  (openBlock(), createElementBlock(Fragment, null, renderList(availableTemplates, (template) => {
                    return createVNode(_sfc_main$1, {
                      key: template.id,
                      selected: template.id === wizardData.selectedStarterKit,
                      icon: template.id,
                      onDblclick: _cache[0] || (_cache[0] = ($event) => step.value++),
                      onClick: ($event) => wizardData.selectedStarterKit = template.id
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(template.label), 1)
                      ]),
                      _: 2
                    }, 1032, ["selected", "icon", "onClick"]);
                  }), 64))
                ])) : createCommentVNode("", true)
              ], 64)) : createCommentVNode("", true),
              wizardData.selectedStartOption === "link-existing" && wizardData.existingSite.site !== "" && step.value > 0 ? (openBlock(), createElementBlock("div", _hoisted_11, [
                createBaseVNode("div", _hoisted_12, [
                  _hoisted_13,
                  createVNode(_sfc_main$2, {
                    readonly: "",
                    disabled: "",
                    modelValue: wizardData.existingSite.path,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => wizardData.existingSite.path = $event),
                    class: "col-span-5"
                  }, null, 8, ["modelValue"]),
                  _hoisted_14,
                  createVNode(_sfc_main$2, {
                    modelValue: wizardData.existingSite.site,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => wizardData.existingSite.site = $event),
                    class: "col-span-5"
                  }, null, 8, ["modelValue"]),
                  _hoisted_15,
                  createVNode(_sfc_main$3, {
                    modelValue: wizardData.existingSite.phpVersion,
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => wizardData.existingSite.phpVersion = $event),
                    class: "col-span-5"
                  }, {
                    default: withCtx(() => [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(phpVersions.value, (version) => {
                        return openBlock(), createElementBlock("option", {
                          key: version.version,
                          value: version.version
                        }, toDisplayString(version.version), 9, _hoisted_16);
                      }), 128))
                    ]),
                    _: 1
                  }, 8, ["modelValue"]),
                  _hoisted_17,
                  createBaseVNode("div", _hoisted_18, [
                    createVNode(_sfc_main$4, {
                      modelValue: wizardData.existingSite.secured,
                      "onUpdate:modelValue": _cache[4] || (_cache[4] = ($event) => wizardData.existingSite.secured = $event)
                    }, null, 8, ["modelValue"])
                  ]),
                  wizardError.value ? (openBlock(), createElementBlock("p", _hoisted_19, toDisplayString(wizardError.value), 1)) : createCommentVNode("", true)
                ])
              ])) : createCommentVNode("", true),
              step.value == 2 ? (openBlock(), createElementBlock("div", _hoisted_20, [
                createBaseVNode("div", _hoisted_21, [
                  _hoisted_22,
                  createVNode(_sfc_main$2, {
                    modelValue: wizardData.name,
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = ($event) => wizardData.name = $event),
                    class: "col-span-5"
                  }, null, 8, ["modelValue"]),
                  wizardData.selectedStarterKit !== "custom" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                    wizardData.selectedStarterKit !== "none" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      _hoisted_23,
                      createVNode(_sfc_main$3, {
                        modelValue: wizardData.authProvider,
                        "onUpdate:modelValue": _cache[6] || (_cache[6] = ($event) => wizardData.authProvider = $event),
                        class: "col-span-5"
                      }, {
                        default: withCtx(() => [
                          _hoisted_24,
                          _hoisted_25,
                          _hoisted_26
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ], 64)) : createCommentVNode("", true),
                    wizardData.selectedStarterKit === "livewire" && (wizardData.authProvider === "laravel" || wizardData.authProvider === "workos") ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                      _hoisted_27,
                      createVNode(_sfc_main$3, {
                        modelValue: wizardData.useVolt,
                        "onUpdate:modelValue": _cache[7] || (_cache[7] = ($event) => wizardData.useVolt = $event),
                        class: "col-span-5"
                      }, {
                        default: withCtx(() => [
                          _hoisted_28,
                          _hoisted_29
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ], 64)) : createCommentVNode("", true),
                    _hoisted_30,
                    createVNode(_sfc_main$3, {
                      modelValue: wizardData.testingFramework,
                      "onUpdate:modelValue": _cache[8] || (_cache[8] = ($event) => wizardData.testingFramework = $event),
                      class: "col-span-5"
                    }, {
                      default: withCtx(() => [
                        _hoisted_31,
                        _hoisted_32
                      ]),
                      _: 1
                    }, 8, ["modelValue"]),
                    _hoisted_33,
                    createBaseVNode("div", _hoisted_34, [
                      createVNode(_sfc_main$4, {
                        modelValue: wizardData.boost,
                        "onUpdate:modelValue": _cache[9] || (_cache[9] = ($event) => wizardData.boost = $event)
                      }, null, 8, ["modelValue"])
                    ])
                  ], 64)) : createCommentVNode("", true),
                  wizardData.selectedStarterKit === "custom" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                    _hoisted_35,
                    createVNode(_sfc_main$2, {
                      modelValue: wizardData.customStarterKit,
                      "onUpdate:modelValue": _cache[10] || (_cache[10] = ($event) => wizardData.customStarterKit = $event),
                      placeholder: "vendor/package-name",
                      class: "col-span-5"
                    }, null, 8, ["modelValue"])
                  ], 64)) : createCommentVNode("", true),
                  _hoisted_36,
                  createBaseVNode("div", _hoisted_37, [
                    createVNode(_sfc_main$4, {
                      modelValue: wizardData.git,
                      "onUpdate:modelValue": _cache[11] || (_cache[11] = ($event) => wizardData.git = $event)
                    }, null, 8, ["modelValue"])
                  ]),
                  _hoisted_38,
                  createVNode(_sfc_main$3, {
                    modelValue: wizardData.targetFolder,
                    "onUpdate:modelValue": _cache[12] || (_cache[12] = ($event) => wizardData.targetFolder = $event),
                    class: "col-span-5"
                  }, {
                    default: withCtx(() => [
                      (openBlock(true), createElementBlock(Fragment, null, renderList(valetConfig.value?.paths || [], (path) => {
                        return openBlock(), createElementBlock("option", {
                          key: path,
                          value: path
                        }, toDisplayString(path), 9, _hoisted_39);
                      }), 128))
                    ]),
                    _: 1
                  }, 8, ["modelValue"]),
                  _hoisted_40,
                  wizardError.value ? (openBlock(), createElementBlock("p", _hoisted_41, toDisplayString(wizardError.value), 1)) : createCommentVNode("", true)
                ])
              ])) : createCommentVNode("", true)
            ], 64)) : createCommentVNode("", true),
            !hasError.value && isBusy.value ? (openBlock(), createElementBlock("div", _hoisted_42, [
              createVNode(Loading),
              _hoisted_43,
              createBaseVNode("div", _hoisted_44, [
                output.value.length > 0 ? (openBlock(), createElementBlock("pre", {
                  key: 0,
                  ref_key: "installOutput",
                  ref: installOutput,
                  style: { "height": "200px", "overflow-y": "auto" },
                  class: "select-text rounded-md bg-gray-100 dark:bg-gray-800 p-1 text-xs mt-4 w-full my-8",
                  textContent: toDisplayString(output.value)
                }, null, 8, _hoisted_45)) : createCommentVNode("", true)
              ])
            ])) : createCommentVNode("", true),
            hasError.value && !isBusy.value ? (openBlock(), createElementBlock("div", _hoisted_46, [
              _hoisted_47,
              createBaseVNode("div", _hoisted_48, [
                output.value.length > 0 ? (openBlock(), createElementBlock("pre", {
                  key: 0,
                  style: { "max-height": "200px", "overflow-y": "auto" },
                  class: "select-text rounded-md bg-gray-100 dark:bg-gray-800 p-1 text-xs mt-4 w-full my-8",
                  textContent: toDisplayString(output.value)
                }, null, 8, _hoisted_49)) : createCommentVNode("", true)
              ])
            ])) : createCommentVNode("", true),
            !hasError.value && isFinished.value ? (openBlock(), createElementBlock(Fragment, { key: 3 }, [
              createBaseVNode("div", _hoisted_50, [
                _hoisted_51,
                output.value.length > 0 && showOutput.value ? (openBlock(), createElementBlock("pre", {
                  key: 0,
                  style: { "max-height": "200px", "overflow-y": "auto" },
                  class: "text-left select-text rounded-md bg-gray-100 dark:bg-gray-800 p-1 text-xs mt-4 w-full mt-8",
                  textContent: toDisplayString(output.value)
                }, null, 8, _hoisted_52)) : createCommentVNode("", true)
              ]),
              createBaseVNode("div", _hoisted_53, [
                createBaseVNode("button", {
                  onClick: _cache[13] || (_cache[13] = ($event) => showOutput.value = !showOutput.value),
                  class: "p-4 text-gray-400 dark:text-gray-200 text-xs focus:outline-none"
                }, [
                  !showOutput.value ? (openBlock(), createElementBlock("span", _hoisted_54, "Show")) : (openBlock(), createElementBlock("span", _hoisted_55, "Hide")),
                  createTextVNode(" console output ")
                ])
              ])
            ], 64)) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_56, [
              !isFinished.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                createVNode(LightButton, {
                  disabled: step.value === 0 || isBusy.value,
                  class: normalizeClass({
                    "opacity-50 cursor-not-allowed": step.value === 0 || isBusy.value
                  }),
                  onClick: _cache[14] || (_cache[14] = ($event) => step.value--)
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Previous ")
                  ]),
                  _: 1
                }, 8, ["disabled", "class"]),
                step.value === 0 || step.value === 1 && wizardData.selectedStartOption === "new" ? (openBlock(), createBlock(LightButton, {
                  key: 0,
                  disabled: !canProceed.value,
                  class: normalizeClass({
                    "opacity-50 cursor-not-allowed": !canProceed.value
                  }),
                  onClick: next
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Next ")
                  ]),
                  _: 1
                }, 8, ["disabled", "class"])) : createCommentVNode("", true),
                wizardData.selectedStartOption === "new" && step.value === 2 ? (openBlock(), createBlock(LightButton, {
                  key: 1,
                  disabled: !canProceed.value,
                  class: normalizeClass({
                    "opacity-50 cursor-not-allowed": !canProceed.value
                  }),
                  onClick: createSite
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Next ")
                  ]),
                  _: 1
                }, 8, ["disabled", "class"])) : createCommentVNode("", true),
                wizardData.selectedStartOption === "link-existing" && step.value === 1 ? (openBlock(), createBlock(LightButton, {
                  key: 2,
                  disabled: !canProceed.value,
                  class: normalizeClass({
                    "opacity-50 cursor-not-allowed": !canProceed.value
                  }),
                  onClick: addSite
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Next ")
                  ]),
                  _: 1
                }, 8, ["disabled", "class"])) : createCommentVNode("", true)
              ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createVNode(LightButton, { onClick: openURL }, {
                  default: withCtx(() => [
                    createTextVNode(" Open in Browser ")
                  ]),
                  _: 1
                }),
                createVNode(LightButton, { onClick: close }, {
                  default: withCtx(() => [
                    createTextVNode(" Close ")
                  ]),
                  _: 1
                })
              ], 64))
            ])
          ])
        ])
      ]);
    };
  }
});
createApp(_sfc_main).mount("#app");
