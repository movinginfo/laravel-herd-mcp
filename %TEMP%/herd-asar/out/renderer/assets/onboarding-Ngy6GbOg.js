import { d as defineComponent, o as openBlock, c as createElementBlock, r as renderSlot, a as ref, b as onMounted, e as createBaseVNode, n as normalizeClass, f as createCommentVNode, t as toDisplayString, g as createVNode, w as withCtx, h as createTextVNode, i as withModifiers, F as Fragment, j as computed, k as watch, l as createBlock, m as withKeys, u as unref, T as Teleport, p as createStaticVNode, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { _ as _imports_0 } from "./SplashBackground-D3YZ7lsO.js";
import { _ as _sfc_main$4 } from "./OnboardingButton.vue_vue_type_script_setup_true_lang-7GK2-5kP.js";
import { _ as _sfc_main$6 } from "./UiCheckbox.vue_vue_type_script_setup_true_lang-GOwQWYxP.js";
import { _ as _sfc_main$5 } from "./UiInput.vue_vue_type_script_setup_true_lang-P0XHcdXO.js";
import { L as Loading } from "./Loading-B6H_jlkQ.js";
import { m, A as Analytics, _ as _sfc_main$7 } from "./Analytics-DNkv507E.js";
import "./_plugin-vue_export-helper-1tPrXgE0.js";
const _hoisted_1$3 = ["type"];
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "LightOnboardingButton",
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
        class: "bg-white dark:bg-gray-900 text-black dark:text-white p-2 dark:border-gray-800 dark:focus:border-gray-700 dark:hover:bg-gray-800 dark:focus:ring-gray-700 rounded-md text-sm flex items-center justify-center active:bg-opacity-70 border-onboarding-gray border-2"
      }, [
        renderSlot(_ctx.$slots, "default")
      ], 8, _hoisted_1$3);
    };
  }
});
const _hoisted_1$2 = { class: "flex flex-col items-center justify-center z-10 relative" };
const _hoisted_2$2 = /* @__PURE__ */ createBaseVNode("h1", { class: "font-bold text-5xl text-black dark:text-white mb-8" }, "Choose Your Sites Folder", -1);
const _hoisted_3$2 = /* @__PURE__ */ createBaseVNode("p", { class: "text-onboarding-gray dark:text-gray-200 text-sm text-center leading-relaxed max-w-lg mb-8" }, [
  /* @__PURE__ */ createTextVNode(" Select a folder where your PHP projects will be automatically served. All projects in this folder will be accessible via "),
  /* @__PURE__ */ createBaseVNode("span", { class: "font-mono" }, "directory-name.test"),
  /* @__PURE__ */ createTextVNode(". ")
], -1);
const _hoisted_4$2 = { class: "space-y-4 w-full max-w-md" };
const _hoisted_5$1 = { class: "flex items-start space-x-3" };
const _hoisted_6$1 = { class: "flex-shrink-0 mt-1" };
const _hoisted_7$1 = {
  key: 0,
  class: "w-2 h-2 bg-white rounded-full"
};
const _hoisted_8$1 = /* @__PURE__ */ createBaseVNode("div", { class: "flex-1" }, [
  /* @__PURE__ */ createBaseVNode("h3", { class: "font-medium text-black dark:text-white" }, "Use default folder"),
  /* @__PURE__ */ createBaseVNode("p", { class: "text-sm text-onboarding-gray dark:text-gray-300 font-mono" }, " %USERPROFILE%\\Herd "),
  /* @__PURE__ */ createBaseVNode("p", { class: "text-xs text-onboarding-gray dark:text-gray-300 mt-1" }, " Recommended for new users ")
], -1);
const _hoisted_9$1 = { class: "flex items-start space-x-3" };
const _hoisted_10$1 = { class: "flex-shrink-0 mt-1" };
const _hoisted_11$1 = {
  key: 0,
  class: "w-2 h-2 bg-white rounded-full"
};
const _hoisted_12$1 = { class: "flex-1" };
const _hoisted_13$1 = /* @__PURE__ */ createBaseVNode("h3", { class: "font-medium text-black dark:text-white" }, "Choose custom folder", -1);
const _hoisted_14$1 = {
  key: 0,
  class: "mt-2 space-y-2"
};
const _hoisted_15$1 = { class: "flex items-center justify-between space-x-2" };
const _hoisted_16$1 = {
  key: 0,
  class: "text-onboarding-gray dark:text-gray-300 text-sm"
};
const _hoisted_17$1 = {
  key: 1,
  class: "text-onboarding-gray dark:text-gray-300 text-sm font-mono"
};
const _hoisted_18$1 = {
  key: 0,
  class: "flex items-center space-x-1 text-xs"
};
const _hoisted_19$1 = /* @__PURE__ */ createBaseVNode("div", { class: "w-3 h-3 border border-gray-400 border-t-onboarding-red rounded-full animate-spin" }, null, -1);
const _hoisted_20$1 = /* @__PURE__ */ createBaseVNode("span", { class: "text-onboarding-gray dark:text-gray-300" }, "Detecting sites...", -1);
const _hoisted_21$1 = {
  key: 0,
  class: "text-onboarding-gray dark:text-gray-300"
};
const _hoisted_22$1 = {
  key: 1,
  class: "text-sm text-onboarding-gray dark:text-gray-300"
};
const _hoisted_23$1 = /* @__PURE__ */ createBaseVNode("span", null, "Continue", -1);
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "SitesPathSelection",
  emits: ["continue"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    const useDefaultPath = ref(true);
    const customSitesPath = ref("");
    const isDetectingSites = ref(false);
    const detectionResult = ref(null);
    const selectDefaultPath = () => {
      useDefaultPath.value = true;
      customSitesPath.value = "";
      detectionResult.value = null;
    };
    const selectCustomPath = () => {
      useDefaultPath.value = false;
    };
    const browseForFolder = async () => {
      try {
        const result = await window.api.system.showOpenDialog({
          properties: ["openDirectory"],
          title: "Select Sites Folder"
        });
        if (!result.canceled && result.filePaths.length > 0) {
          customSitesPath.value = result.filePaths[0];
          detectSitesInPath(customSitesPath.value);
        }
      } catch (error) {
        console.error("Error selecting folder:", error);
      }
    };
    const detectSitesInPath = async (path) => {
      if (!path)
        return;
      isDetectingSites.value = true;
      detectionResult.value = null;
      try {
        const result = await window.api.sites.detectSitesInPath(path);
        detectionResult.value = result.count;
      } catch (error) {
        console.error("Error detecting sites:", error);
        detectionResult.value = 0;
      } finally {
        isDetectingSites.value = false;
      }
    };
    const handleContinue = async () => {
      console.log(useDefaultPath.value, customSitesPath.value);
      if (!useDefaultPath.value && !customSitesPath.value) {
        await window.api.system.showMessageBox({
          type: "warning",
          title: "Please select a folder",
          message: "You must select a folder for your sites when choosing the custom option.",
          buttons: ["OK"]
        });
        return;
      }
      if (!useDefaultPath.value && customSitesPath.value) {
        await window.api.store.set("herd_sites_path", customSitesPath.value);
        window.api.valet.savePath(customSitesPath.value);
      } else {
        await window.api.store.delete("herd_sites_path");
      }
      emit("continue");
    };
    onMounted(() => {
      m(Analytics.showOnboardingSitesPathView);
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        _hoisted_2$2,
        _hoisted_3$2,
        createBaseVNode("div", _hoisted_4$2, [
          createBaseVNode("div", {
            class: normalizeClass([
              "p-4 border rounded-lg cursor-pointer transition-all duration-200",
              useDefaultPath.value ? "border-onboarding-red bg-onboarding-red/5" : "border-gray-300 hover:border-gray-400"
            ]),
            onClick: selectDefaultPath
          }, [
            createBaseVNode("div", _hoisted_5$1, [
              createBaseVNode("div", _hoisted_6$1, [
                createBaseVNode("div", {
                  class: normalizeClass([
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    useDefaultPath.value ? "border-onboarding-red bg-onboarding-red" : "border-gray-400"
                  ])
                }, [
                  useDefaultPath.value ? (openBlock(), createElementBlock("div", _hoisted_7$1)) : createCommentVNode("", true)
                ], 2)
              ]),
              _hoisted_8$1
            ])
          ], 2),
          createBaseVNode("div", {
            class: normalizeClass([
              "p-4 border rounded-lg cursor-pointer transition-all duration-200",
              !useDefaultPath.value ? "border-onboarding-red bg-onboarding-red/5" : "border-gray-300 hover:border-gray-400"
            ]),
            onClick: selectCustomPath
          }, [
            createBaseVNode("div", _hoisted_9$1, [
              createBaseVNode("div", _hoisted_10$1, [
                createBaseVNode("div", {
                  class: normalizeClass([
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    !useDefaultPath.value ? "border-onboarding-red bg-onboarding-red" : "border-gray-400"
                  ])
                }, [
                  !useDefaultPath.value ? (openBlock(), createElementBlock("div", _hoisted_11$1)) : createCommentVNode("", true)
                ], 2)
              ]),
              createBaseVNode("div", _hoisted_12$1, [
                _hoisted_13$1,
                !useDefaultPath.value ? (openBlock(), createElementBlock("div", _hoisted_14$1, [
                  createBaseVNode("div", _hoisted_15$1, [
                    !customSitesPath.value ? (openBlock(), createElementBlock("span", _hoisted_16$1, " No folder selected ")) : (openBlock(), createElementBlock("span", _hoisted_17$1, toDisplayString(customSitesPath.value), 1)),
                    createVNode(_sfc_main$3, {
                      class: "h-8 w-24",
                      onClick: withModifiers(browseForFolder, ["stop"])
                    }, {
                      default: withCtx(() => [
                        createTextVNode(" Browse... ")
                      ]),
                      _: 1
                    })
                  ]),
                  customSitesPath.value && detectionResult.value !== null ? (openBlock(), createElementBlock("div", _hoisted_18$1, [
                    isDetectingSites.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      _hoisted_19$1,
                      _hoisted_20$1
                    ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                      detectionResult.value > 0 ? (openBlock(), createElementBlock("span", _hoisted_21$1, toDisplayString(`${detectionResult.value} project${detectionResult.value === 1 ? "" : "s"} detected`), 1)) : createCommentVNode("", true)
                    ], 64))
                  ])) : createCommentVNode("", true)
                ])) : (openBlock(), createElementBlock("p", _hoisted_22$1, " Select your own project folder "))
              ])
            ])
          ], 2)
        ]),
        createVNode(_sfc_main$4, {
          class: "mt-8",
          onClick: handleContinue
        }, {
          default: withCtx(() => [
            _hoisted_23$1
          ]),
          _: 1
        })
      ]);
    };
  }
});
const _hoisted_1$1 = ["src"];
const _hoisted_2$1 = { class: "flex flex-col items-start" };
const _hoisted_3$1 = { class: "font-bold group-hover:underline text-black dark:text-white" };
const _hoisted_4$1 = { class: "text-sm leading-6 text-[#565454] dark:text-gray-200 mt-0.5" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "OnboardingTeaser",
  props: {
    name: String,
    description: String,
    url: String,
    image: String
  },
  setup(__props) {
    const props = __props;
    const openURL = () => {
      if (props.url === void 0) {
        return;
      }
      window.api.openURL(props.url);
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        class: "flex items-start pb-4 group",
        onClick: _cache[0] || (_cache[0] = ($event) => openURL())
      }, [
        createBaseVNode("img", {
          src: __props.image,
          class: "max-w-[50px] object-fit mr-4"
        }, null, 8, _hoisted_1$1),
        createBaseVNode("div", _hoisted_2$1, [
          createBaseVNode("h2", _hoisted_3$1, toDisplayString(__props.name), 1),
          createBaseVNode("p", _hoisted_4$1, toDisplayString(__props.description), 1)
        ])
      ]);
    };
  }
});
const _hoisted_1 = { class: "h-full w-full relative flex items-center justify-center select-none dark:bg-gray-900 dark" };
const _hoisted_2 = /* @__PURE__ */ createBaseVNode("img", {
  src: _imports_0,
  class: "w-full absolute bottom-0 z-0",
  alt: "logo"
}, null, -1);
const _hoisted_3 = /* @__PURE__ */ createBaseVNode("div", {
  class: "absolute inset-0 h-8 w-full",
  style: { "-webkit-app-region": "drag" }
}, null, -1);
const _hoisted_4 = {
  key: 0,
  class: "flex flex-col items-center justify-center z-10 relative"
};
const _hoisted_5 = /* @__PURE__ */ createBaseVNode("h1", { class: "font-bold text-5xl text-black dark:text-white" }, "Welcome to Herd", -1);
const _hoisted_6 = /* @__PURE__ */ createBaseVNode("p", { class: "pt-4 text-onboarding-gray dark:text-gray-200 text-sm text-center leading-relaxed max-w-sm" }, " To get started, we first need to setup some system preferences. This requires Administrator access.", -1);
const _hoisted_7 = /* @__PURE__ */ createBaseVNode("p", { class: "pt-4 text-onboarding-gray dark:text-gray-200 text-sm text-center leading-relaxed" }, "You will be asked to approve the actions.", -1);
const _hoisted_8 = {
  key: 1,
  class: "rounded-lg p-2 text-onboarding-red bg-onboarding-red/10 text-sm mt-4 font-medium"
};
const _hoisted_9 = /* @__PURE__ */ createBaseVNode("span", null, "Let's get started", -1);
const _hoisted_10 = {
  key: 0,
  class: "flex flex-col items-center justify-center"
};
const _hoisted_11 = { class: "inline-flex items-center justify-center overflow-hidden rounded-full" };
const _hoisted_12 = { class: "w-60 h-60" };
const _hoisted_13 = /* @__PURE__ */ createBaseVNode("circle", {
  class: "text-transparent",
  "stroke-width": "10",
  stroke: "currentColor",
  fill: "transparent",
  r: "60",
  cx: "120",
  cy: "120"
}, null, -1);
const _hoisted_14 = ["stroke-dashoffset"];
const _hoisted_15 = { key: 1 };
const _hoisted_16 = {
  key: 3,
  class: "flex flex-col items-center relative z-10"
};
const _hoisted_17 = /* @__PURE__ */ createBaseVNode("h1", { class: "font-bold text-5xl text-black dark:text-white" }, "Herd Pro", -1);
const _hoisted_18 = /* @__PURE__ */ createBaseVNode("div", { class: "pt-4 text-onboarding-gray dark:text-gray-200 text-sm leading-relaxed max-w-md" }, [
  /* @__PURE__ */ createBaseVNode("div", null, " Already have a license key? Activate Herd Pro to access all additional services, development, and debugging tools. Skip the activation to use the free version. ")
], -1);
const _hoisted_19 = { class: "pt-2 text-onboarding-gray dark:text-gray-200 text-sm leading-relaxed max-w-md w-full" };
const _hoisted_20 = { class: "" };
const _hoisted_21 = { class: "mt-2" };
const _hoisted_22 = { class: "flex justify-center" };
const _hoisted_23 = /* @__PURE__ */ createBaseVNode("span", null, "Activate Herd Pro", -1);
const _hoisted_24 = {
  key: 4,
  class: "z-10"
};
const _hoisted_25 = { class: "flex z-10 justify-center mx-16" };
const _hoisted_26 = { class: "border-r border-gray-400/30 pr-8" };
const _hoisted_27 = /* @__PURE__ */ createStaticVNode('<h1 class="font-bold text-4xl text-black dark:text-white mb-8">Setup completed</h1><p class="text-sm text-onboarding-gray dark:text-gray-200 max-w-md"> You can now access <span class="font-mono font-bold">herd</span>, <span class="font-mono font-bold">php</span>, <span class="font-mono font-bold">composer</span> and <span class="font-mono font-bold">laravel</span> <span>from your command line and open Herd by clicking on its system tray icon.</span><br><br> All PHP projects in <span class="font-mono font-bold">%USERPROFILE%\\Herd</span> will be automatically available in your browser as <span class="font-mono font-bold">directory-name.test</span>.<br><br> Build something amazing. </p>', 2);
const _hoisted_29 = {
  for: "autostart",
  class: "flex items-center mt-4"
};
const _hoisted_30 = /* @__PURE__ */ createBaseVNode("span", { class: "ml-2 text-[11px] text-black dark:text-white" }, "Automatically launch Herd on system startup", -1);
const _hoisted_31 = {
  for: "minimized",
  class: "flex items-center mt-4"
};
const _hoisted_32 = /* @__PURE__ */ createBaseVNode("span", { class: "ml-2 text-[11px] text-black dark:text-white" }, "Launch Herd minimized as system tray application", -1);
const _hoisted_33 = /* @__PURE__ */ createBaseVNode("span", null, "Open the Herd dashboard", -1);
const _hoisted_34 = { class: "pl-8 w-[400px]" };
const _hoisted_35 = /* @__PURE__ */ createBaseVNode("p", { class: "text-xl font-bold text-black dark:text-white pb-4" }, "What's next?", -1);
const _hoisted_36 = { key: 0 };
const _hoisted_37 = {
  key: 1,
  class: "pb-6"
};
const _hoisted_38 = /* @__PURE__ */ createBaseVNode("p", { class: "text-sm text-onboarding-gray dark:text-gray-200 max-w-md pb-2" }, " It looks like you're migrating from a different setup. We've prepared a migration guide for you. ", -1);
const _hoisted_39 = /* @__PURE__ */ createBaseVNode("span", null, "Migrate from XAMPP", -1);
const _hoisted_40 = /* @__PURE__ */ createBaseVNode("span", null, "Migrate from Laragon", -1);
const _hoisted_41 = /* @__PURE__ */ createBaseVNode("p", { class: "text-xl font-bold text-black dark:text-white pb-4" }, "Herd Pro", -1);
const _hoisted_42 = /* @__PURE__ */ createBaseVNode("p", { class: "text-sm text-onboarding-gray dark:text-gray-200 max-w-md" }, " Upgrade to Herd Pro and unlock one click setups for MySQL, PostgreSQL, redis, and more. ", -1);
const _hoisted_43 = /* @__PURE__ */ createBaseVNode("span", null, "Upgrade to Herd Pro", -1);
const defaultPhpVersion = "8.4";
const radius = 60;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Onboarding",
  setup(__props) {
    const isBusy = ref(false);
    const isDownloading = ref(false);
    const showError = ref(false);
    const showSuccess = ref(false);
    const autoStart = ref(false);
    const minimized = ref(false);
    const step = ref(1);
    const downloadingVersionsProgress = ref(0);
    const email = ref("");
    const licenseKey = ref("");
    const isPro = ref(false);
    const showSitesPath = ref(false);
    const errorModal = ref();
    const errorMessage = ref("An error occurred while activating your license. Please try again or reach out to our support.");
    let competitors = [];
    const initializeHerd = async () => {
      console.log("initializeHerd");
      step.value = 2;
      const result = await window.api.initializeHerd();
      if (result.isSuccessful) {
        showSitesPath.value = true;
      } else {
        step.value = 1;
        showError.value = true;
        isBusy.value = false;
      }
    };
    const finalizeHerd = async () => {
      try {
        isBusy.value = true;
        isDownloading.value = true;
        console.log("installPHPVersion");
        await window.api.herd.installPHPVersion(defaultPhpVersion);
        console.log("usePHPVersion");
        await window.api.herd.usePHPVersion(defaultPhpVersion);
        isDownloading.value = false;
        try {
          console.log("install NVM");
          await window.api.herd.installNvm();
        } catch (error) {
          console.log(error);
        }
        console.log("startAllServices");
        await window.api.initializeServices();
        await window.api.startAllServices();
        isBusy.value = false;
        showSuccess.value = true;
      } catch (error) {
        console.log(error);
        showError.value = true;
        isBusy.value = false;
      }
    };
    const skipPro = () => {
      step.value = 4;
      m(Analytics.showOnboardingSuccessView, {
        competitors: competitors.join(", ")
      });
    };
    const toggleAutostart = () => {
      window.api.toggleAutostart(autoStart.value);
    };
    const toggleMinimized = () => {
      window.api.system.toggleMinimized(minimized.value);
    };
    const finishOnboarding = () => {
      window.api.openSettings();
      window.api.system.showMenuBarAppInfoNotification();
      window.close();
    };
    const buy = () => {
      window.api.openURL("https://herd.laravel.com/checkout?ref=herd-onboarding-windows");
    };
    const openMigrationGuide = (competitor) => {
      const guides = {
        "xampp": "https://herd.laravel.com/docs/windows/migration-guides/xampp?ref=onboarding",
        "laragon": "https://herd.laravel.com/docs/windows/migration-guides/laragon?ref=onboarding"
      };
      if (guides[competitor.toLowerCase()]) {
        window.api.openURL(guides[competitor.toLowerCase()]);
      }
    };
    const circumference = 2 * Math.PI * radius;
    const dashOffset = computed(() => {
      return circumference - downloadingVersionsProgress.value / 100 * circumference;
    });
    const sitesPathDisplay = ref("%USERPROFILE%\\Herd");
    const updateSitesPathDisplay = async () => {
      const customPath = await window.api.store.get("herd_sites_path", null);
      if (customPath) {
        sitesPathDisplay.value = customPath;
      } else {
        sitesPathDisplay.value = "%USERPROFILE%\\Herd";
      }
    };
    const activateLicense = async () => {
      const result = await window.api.licensing.activate(email.value, licenseKey.value);
      if (!result.isSuccessful) {
        if (result.message) {
          errorMessage.value = result.message;
        }
        errorModal.value.open = true;
      } else {
        isPro.value = true;
        step.value = 4;
        m(Analytics.showOnboardingSuccessView, {
          competitors: competitors.join(", ")
        });
      }
    };
    const onSitesPathContinue = async () => {
      showSitesPath.value = false;
      await updateSitesPathDisplay();
      await finalizeHerd();
      const hasValidLicense = await window.api.licensing.hasValidLicense();
      if (hasValidLicense) {
        isPro.value = true;
        step.value = 4;
        m(Analytics.showOnboardingSuccessView);
      } else {
        step.value = 3;
        m(Analytics.showOnboardingLicenseView);
      }
    };
    onMounted(async () => {
      m(Analytics.showOnboardingStep1View);
      window.api.herd.onDownloadProgress((_, payload) => {
        downloadingVersionsProgress.value = payload.percentage;
      });
      try {
        const detectedCompetitors = await window.api.herd.detectCompetitors();
        competitors = detectedCompetitors.map((c) => c.toLowerCase());
      } catch (error) {
        console.error("Error detecting competitors:", error);
      }
    });
    watch(step, (newStep) => {
      if (newStep === 4) {
        window.api.createMenubar();
        window.api.setOnboardingClosable(true);
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock(Fragment, null, [
        createBaseVNode("div", _hoisted_1, [
          _hoisted_2,
          _hoisted_3,
          step.value === 1 ? (openBlock(), createElementBlock("div", _hoisted_4, [
            _hoisted_5,
            !showError.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
              _hoisted_6,
              _hoisted_7
            ], 64)) : (openBlock(), createElementBlock("div", _hoisted_8, " Looks like there was an error setting up Herd. Please try again. ")),
            createVNode(_sfc_main$4, {
              onClick: initializeHerd,
              class: "mt-6"
            }, {
              default: withCtx(() => [
                _hoisted_9
              ]),
              _: 1
            })
          ])) : createCommentVNode("", true),
          showSitesPath.value ? (openBlock(), createBlock(_sfc_main$2, {
            key: 1,
            onContinue: onSitesPathContinue
          })) : createCommentVNode("", true),
          step.value === 2 && !showSitesPath.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
            isDownloading.value ? (openBlock(), createElementBlock("div", _hoisted_10, [
              createBaseVNode("div", _hoisted_11, [
                (openBlock(), createElementBlock("svg", _hoisted_12, [
                  _hoisted_13,
                  createBaseVNode("circle", {
                    class: "text-onboarding-red",
                    "stroke-width": "10",
                    "stroke-dasharray": circumference,
                    "stroke-dashoffset": dashOffset.value,
                    "stroke-linecap": "round",
                    stroke: "currentColor",
                    fill: "transparent",
                    r: "60",
                    cx: "120",
                    cy: "120"
                  }, null, 8, _hoisted_14)
                ]))
              ]),
              createBaseVNode("p", { class: "pt-4 text-onboarding-gray dark:text-gray-200 text-sm text-center leading-relaxed" }, "Downloading PHP " + toDisplayString(defaultPhpVersion))
            ])) : (openBlock(), createElementBlock("div", _hoisted_15, [
              createVNode(Loading)
            ]))
          ], 64)) : createCommentVNode("", true),
          step.value === 3 ? (openBlock(), createElementBlock("div", _hoisted_16, [
            _hoisted_17,
            _hoisted_18,
            createBaseVNode("div", _hoisted_19, [
              createBaseVNode("form", {
                class: "flex flex-col pt-4",
                onSubmit: withModifiers(activateLicense, ["prevent"])
              }, [
                createBaseVNode("div", _hoisted_20, [
                  createVNode(_sfc_main$5, {
                    required: "",
                    spellcheck: "false",
                    type: "email",
                    modelValue: email.value,
                    "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => email.value = $event),
                    placeholder: "Email",
                    class: "w-full placeholder:opacity-50"
                  }, null, 8, ["modelValue"])
                ]),
                createBaseVNode("div", _hoisted_21, [
                  createVNode(_sfc_main$5, {
                    type: "text",
                    required: "",
                    spellcheck: "false",
                    onKeyup: withKeys(activateLicense, ["enter"]),
                    modelValue: licenseKey.value,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => licenseKey.value = $event),
                    placeholder: "License Key",
                    class: "w-full placeholder:opacity-50"
                  }, null, 8, ["modelValue"])
                ]),
                createBaseVNode("div", _hoisted_22, [
                  createVNode(_sfc_main$4, {
                    type: "submit",
                    class: "mt-6"
                  }, {
                    default: withCtx(() => [
                      _hoisted_23
                    ]),
                    _: 1
                  })
                ])
              ], 32)
            ]),
            createBaseVNode("button", {
              onClick: skipPro,
              class: "mt-4 text-sm"
            }, "Skip for now")
          ])) : createCommentVNode("", true),
          step.value === 4 ? (openBlock(), createElementBlock("div", _hoisted_24, [
            createBaseVNode("div", _hoisted_25, [
              createBaseVNode("div", _hoisted_26, [
                _hoisted_27,
                createBaseVNode("label", _hoisted_29, [
                  createVNode(_sfc_main$6, {
                    onChange: toggleAutostart,
                    modelValue: autoStart.value,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => autoStart.value = $event),
                    id: "autostart"
                  }, null, 8, ["modelValue"]),
                  _hoisted_30
                ]),
                createBaseVNode("label", _hoisted_31, [
                  createVNode(_sfc_main$6, {
                    onChange: toggleMinimized,
                    modelValue: minimized.value,
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => minimized.value = $event),
                    id: "minimized"
                  }, null, 8, ["modelValue"]),
                  _hoisted_32
                ]),
                createVNode(_sfc_main$4, {
                  onClick: finishOnboarding,
                  class: "mt-6"
                }, {
                  default: withCtx(() => [
                    _hoisted_33
                  ]),
                  _: 1
                })
              ]),
              createBaseVNode("div", _hoisted_34, [
                _hoisted_35,
                !unref(competitors).includes("xampp") && !unref(competitors).includes("laragon") ? (openBlock(), createElementBlock("div", _hoisted_36, [
                  createVNode(_sfc_main$1, {
                    name: "Tinkerwell",
                    image: "https://tinkerwell.app/images/tinkerwell_logo.png",
                    description: 'Supercharged "php artisan tinker", with autocompletion, multi-line editing and more.',
                    url: "https://tinkerwell.app"
                  }),
                  createVNode(_sfc_main$1, {
                    name: "Expose",
                    image: "https://expose.dev/images/expose/logo.svg",
                    description: "Expose local sites and receive WebHooks via secure tunnels through any firewall or VPN.",
                    url: "https://expose.dev"
                  })
                ])) : (openBlock(), createElementBlock("div", _hoisted_37, [
                  _hoisted_38,
                  unref(competitors).includes("xampp") ? (openBlock(), createBlock(_sfc_main$3, {
                    key: 0,
                    onClick: _cache[4] || (_cache[4] = ($event) => openMigrationGuide("xampp")),
                    class: "mt-4 w-full"
                  }, {
                    default: withCtx(() => [
                      _hoisted_39
                    ]),
                    _: 1
                  })) : unref(competitors).includes("laragon") ? (openBlock(), createBlock(_sfc_main$3, {
                    key: 1,
                    onClick: _cache[5] || (_cache[5] = ($event) => openMigrationGuide("laragon")),
                    class: "mt-2 w-full"
                  }, {
                    default: withCtx(() => [
                      _hoisted_40
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ])),
                !isPro.value ? (openBlock(), createElementBlock(Fragment, { key: 2 }, [
                  _hoisted_41,
                  _hoisted_42,
                  createVNode(_sfc_main$3, {
                    onClick: buy,
                    class: "mt-6 w-full"
                  }, {
                    default: withCtx(() => [
                      _hoisted_43
                    ]),
                    _: 1
                  })
                ], 64)) : createCommentVNode("", true)
              ])
            ])
          ])) : createCommentVNode("", true)
        ]),
        (openBlock(), createBlock(Teleport, { to: "body" }, [
          createVNode(_sfc_main$7, {
            ref_key: "errorModal",
            ref: errorModal,
            context: ""
          }, {
            title: withCtx(() => [
              createTextVNode(" Error ")
            ]),
            text: withCtx(() => [
              createTextVNode(toDisplayString(errorMessage.value), 1)
            ]),
            _: 1
          }, 512)
        ]))
      ], 64);
    };
  }
});
createApp(_sfc_main).mount("#app");
