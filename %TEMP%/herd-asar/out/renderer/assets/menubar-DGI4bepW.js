import { d as defineComponent, o as openBlock, c as createElementBlock, e as createBaseVNode, n as normalizeClass, r as renderSlot, a as ref, j as computed, b as onMounted, x as onUnmounted, F as Fragment, h as createTextVNode, g as createVNode, w as withCtx, l as createBlock, f as createCommentVNode, i as withModifiers, s as renderList, t as toDisplayString, y as withDirectives, B as resolveDirective, C as pushScopeId, D as popScopeId, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { D as Divider, _ as _sfc_main$2 } from "./Divider-BUxhQCb8.js";
import { _ as _export_sfc } from "./_plugin-vue_export-helper-1tPrXgE0.js";
import { x as xt } from "./style-OiAxle0Y.js";
const _hoisted_1$1 = {
  type: "button",
  class: "w-full px-3 py-1.5 mb-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-md flex items-center space-x-3 focus:outline-none"
};
const _hoisted_2$1 = ["innerHTML"];
const _hoisted_3$1 = { class: "leading-5 pt-[0.1rem] inline-block" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "NavLink",
  props: {
    currentRoute: String,
    to: String,
    isLocked: {
      type: Boolean,
      default: false,
      required: false
    },
    icon: String,
    iconVisible: {
      type: Boolean,
      default: true,
      required: false
    }
  },
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("button", _hoisted_1$1, [
        createBaseVNode("span", {
          class: normalizeClass(["font-icon text-black dark:text-gray-200", {
            "invisible": !__props.iconVisible
          }]),
          innerHTML: "&#x" + __props.icon + ";"
        }, null, 10, _hoisted_2$1),
        createBaseVNode("span", _hoisted_3$1, [
          renderSlot(_ctx.$slots, "default")
        ])
      ]);
    };
  }
});
const _withScopeId = (n) => (pushScopeId("data-v-9e2f9af1"), n = n(), popScopeId(), n);
const _hoisted_1 = { class: "h-full w-full rounded-lg bg-gray-100 dark:bg-gray-900 shadow-xl border border-gray-400 dark:border-gray-600 overflow-hidden flex flex-col" };
const _hoisted_2 = { class: "px-3 pt-3 flex-1" };
const _hoisted_3 = { class: "font-medium pb-1.5 pl-1" };
const _hoisted_4 = {
  key: 0,
  class: "px-3 pt-3 flex-1"
};
const _hoisted_5 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createBaseVNode("div", { class: "font-medium pb-1.5 pl-1" }, " Quick Access ", -1));
const _hoisted_6 = { class: "flex-1 px-3 py-0 max-h-[600px] overflow-x-auto" };
const _hoisted_7 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createBaseVNode("li", { class: "font-medium pb-1.5 pl-1" }, " Services ", -1));
const _hoisted_8 = { class: "flex py-0 px-3" };
const _hoisted_9 = { class: "flex-1" };
const _hoisted_10 = { class: "h-12 w-full flex items-center justify-end px-1 text-black text-sm" };
const _hoisted_11 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createBaseVNode("span", { class: "font-icon text-black dark:text-gray-200" }, "", -1));
const _hoisted_12 = [
  _hoisted_11
];
const _hoisted_13 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createBaseVNode("span", { class: "font-icon text-black dark:text-gray-200" }, "", -1));
const _hoisted_14 = [
  _hoisted_13
];
const _hoisted_15 = /* @__PURE__ */ _withScopeId(() => /* @__PURE__ */ createBaseVNode("span", { class: "font-icon text-black dark:text-gray-200" }, "", -1));
const _hoisted_16 = [
  _hoisted_15
];
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "MenuBar",
  setup(__props) {
    const installedPHPVersions = ref([]);
    const activePHPVersion = ref("8.4");
    const services = ref([]);
    const defaultServices = ["Mail", "Dumps", "NGINX"];
    const hasValidLicense = ref(false);
    const changingPHPVersion = ref(false);
    const debugServicesVisible = ref(false);
    let removeOnUpdatePHPVersionsListener = null;
    const anyServiceRunning = computed(() => {
      return services.value.some((service) => service.status === "active");
    });
    const startAllServices = () => {
      window.api.startAllServices();
    };
    const stopAllServices = () => {
      window.api.stopAllServices();
    };
    const quit = () => {
      window.api.quit();
    };
    const openLogs = (service) => {
      if (defaultServices.includes(service.name) || service.name.startsWith("PHP-")) {
        window.api.openLogs(service.name);
      } else {
        window.api.openLogsByPid(service.pidFilename);
      }
    };
    const usePHPVersion = async (version) => {
      if (changingPHPVersion.value) {
        return;
      }
      changingPHPVersion.value = true;
      await window.api.herd.usePHPVersion(version);
      setTimeout(() => {
        changingPHPVersion.value = false;
      }, 100);
      activePHPVersion.value = version;
      services.value = await window.api.herd.getServices();
    };
    const openSettings = () => {
      window.api.openSettings();
    };
    const openHerdPath = () => {
      window.api.herd.openPath();
    };
    const checkForUpdates = async () => {
      const result = await window.api.app.checkForUpdates();
      if (!result.updateAvailable) {
        window.api.app.openUpToDate();
      } else {
        window.api.app.openUpdateAvailable();
      }
    };
    const openMails = () => {
      if (hasValidLicense.value) {
        window.api.app.openMails();
      } else {
        window.api.openSettings("mailserver");
      }
    };
    const openDumps = () => {
      window.api.app.openDumps();
    };
    const openLogViewer = () => {
      if (hasValidLicense.value) {
        window.api.app.openLogViewer();
      } else {
        window.api.openSettings("licensing");
      }
    };
    const openSites = () => {
      window.api.app.openSites();
    };
    const openSiteWizard = () => {
      window.api.app.openSiteWizard();
    };
    const openServices = () => {
      window.api.openSettings("services");
    };
    const visibleServices = computed(() => {
      return services.value.filter((service) => {
        return service.isVisible || debugServicesVisible.value === true;
      });
    });
    onMounted(async () => {
      hasValidLicense.value = await window.api.licensing.hasValidLicense();
      activePHPVersion.value = await window.api.herd.activePHPVersion();
      services.value = await window.api.herd.getServices();
      installedPHPVersions.value = await window.api.herd.installedPHPVersions();
      window.api.herd.onUpdateService((_, arg) => {
        console.log("onUpdateService", arg);
        const service = services.value.find((service2) => service2.name === arg.name);
        if (service) {
          service.status = arg.status;
        }
      });
      window.api.herd.onUpdateServices(async () => {
        console.log("onUpdateServices", services);
        services.value = await window.api.herd.getServices();
      });
      removeOnUpdatePHPVersionsListener = window.api.herd.onUpdatePHPVersions(async () => {
        installedPHPVersions.value = await window.api.herd.installedPHPVersions();
      });
      window.api.licensing.onLicenseChanged(async (_, licenseInfo) => {
        hasValidLicense.value = licenseInfo.hasValidLicense;
        services.value = await window.api.herd.getServices();
      });
      window.api.herd.onToggleDebugServicesVisible((_, visible) => {
        debugServicesVisible.value = visible;
      });
    });
    onUnmounted(() => {
      if (removeOnUpdatePHPVersionsListener) {
        removeOnUpdatePHPVersionsListener();
      }
    });
    const showContextMenu = (service) => {
      window.api.herd.showMenuBarContextMenu();
    };
    return (_ctx, _cache) => {
      const _directive_tooltip = resolveDirective("tooltip");
      return openBlock(), createElementBlock("div", {
        onContextmenu: withModifiers(showContextMenu, ["prevent"]),
        class: "select-none h-full w-full pb-4 pr-4 text-xs text-black dark:text-white"
      }, [
        createBaseVNode("div", _hoisted_1, [
          createBaseVNode("div", null, [
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", _hoisted_3, [
                !hasValidLicense.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                  createTextVNode(" Herd Pro ")
                ], 64)) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                  createTextVNode(" Quick Access ")
                ], 64))
              ]),
              createVNode(_sfc_main$1, {
                onClick: openDumps,
                icon: "F156"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Dumps ")
                ]),
                _: 1
              }),
              createVNode(_sfc_main$1, {
                onClick: openMails,
                icon: hasValidLicense.value ? "E715" : "E72E"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Mail ")
                ]),
                _: 1
              }, 8, ["icon"]),
              createVNode(_sfc_main$1, {
                onClick: openLogViewer,
                icon: hasValidLicense.value ? "E8FD" : "E72E"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Log Viewer ")
                ]),
                _: 1
              }, 8, ["icon"]),
              createVNode(_sfc_main$1, {
                onClick: openServices,
                icon: hasValidLicense.value ? "EE94" : "E72E"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Services ")
                ]),
                _: 1
              }, 8, ["icon"]),
              hasValidLicense.value ? (openBlock(), createBlock(_sfc_main$1, {
                key: 0,
                onClick: openSites,
                icon: "E8A1"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Sites ")
                ]),
                _: 1
              })) : createCommentVNode("", true),
              hasValidLicense.value ? (openBlock(), createBlock(_sfc_main$1, {
                key: 1,
                onClick: openSiteWizard,
                icon: "E710"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Create new site ")
                ]),
                _: 1
              })) : createCommentVNode("", true)
            ]),
            !hasValidLicense.value ? (openBlock(), createElementBlock("div", _hoisted_4, [
              _hoisted_5,
              createVNode(_sfc_main$1, {
                onClick: openSites,
                icon: "E8A1"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Sites ")
                ]),
                _: 1
              }),
              createVNode(_sfc_main$1, {
                onClick: openSiteWizard,
                icon: "E710"
              }, {
                default: withCtx(() => [
                  createTextVNode(" Create new site ")
                ]),
                _: 1
              })
            ])) : createCommentVNode("", true)
          ]),
          createVNode(Divider),
          createBaseVNode("div", _hoisted_6, [
            createBaseVNode("ul", null, [
              _hoisted_7,
              createBaseVNode("li", null, [
                !anyServiceRunning.value ? (openBlock(), createBlock(_sfc_main$1, {
                  key: 0,
                  onClick: withModifiers(startAllServices, ["prevent"]),
                  icon: "EDB5"
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Start all services ")
                  ]),
                  _: 1
                })) : createCommentVNode("", true),
                anyServiceRunning.value ? (openBlock(), createBlock(_sfc_main$1, {
                  key: 1,
                  onClick: withModifiers(stopAllServices, ["prevent"]),
                  icon: "EDB4"
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Stop all services ")
                  ]),
                  _: 1
                })) : createCommentVNode("", true)
              ]),
              (openBlock(true), createElementBlock(Fragment, null, renderList(visibleServices.value, (service) => {
                return openBlock(), createBlock(_sfc_main$2, {
                  key: service.name,
                  service,
                  onOpenLogs: ($event) => openLogs(service)
                }, null, 8, ["service", "onOpenLogs"]);
              }), 128))
            ])
          ]),
          createVNode(Divider),
          createBaseVNode("div", _hoisted_8, [
            createBaseVNode("ul", _hoisted_9, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(installedPHPVersions.value, (version) => {
                return openBlock(), createBlock(_sfc_main$1, {
                  key: version.version,
                  onClick: ($event) => usePHPVersion(version.version),
                  icon: "E73E",
                  "icon-visible": activePHPVersion.value === version.version,
                  class: normalizeClass({
                    "opacity-70": changingPHPVersion.value
                  })
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Use PHP " + toDisplayString(version.version), 1)
                  ]),
                  _: 2
                }, 1032, ["onClick", "icon-visible", "class"]);
              }), 128)),
              createVNode(_sfc_main$1, {
                onClick: openHerdPath,
                icon: "E73E",
                "icon-visible": false
              }, {
                default: withCtx(() => [
                  createTextVNode(" Open configuration files ")
                ]),
                _: 1
              })
            ])
          ]),
          createVNode(Divider),
          createBaseVNode("div", _hoisted_10, [
            withDirectives((openBlock(), createElementBlock("button", {
              onClick: openSettings,
              class: "hover:bg-gray-200 dark:hover:bg-gray-800 h-10 w-10 rounded py-2 transition duration-150 focus:ring-1 focus:outline-none focus:ring-gray-300 dark:focus:ring-gray-700"
            }, _hoisted_12)), [
              [_directive_tooltip, {
                content: "Settings",
                theme: "winui"
              }]
            ]),
            withDirectives((openBlock(), createElementBlock("button", {
              onClick: checkForUpdates,
              class: "hover:bg-gray-200 dark:hover:bg-gray-800 h-10 w-10 rounded py-2 transition duration-150"
            }, _hoisted_14)), [
              [_directive_tooltip, {
                content: "Check for updates",
                theme: "winui"
              }]
            ]),
            withDirectives((openBlock(), createElementBlock("button", {
              onClick: quit,
              class: "hover:bg-gray-200 dark:hover:bg-gray-800 h-10 w-10 rounded py-2 transition duration-150"
            }, _hoisted_16)), [
              [_directive_tooltip, {
                content: "Quit",
                theme: "winui"
              }]
            ])
          ])
        ])
      ], 32);
    };
  }
});
const MenuBar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-9e2f9af1"]]);
createApp(MenuBar).use(xt, {
  themes: {
    winui: {
      "$extend": "tooltip",
      triggers: ["click", "hover", "focus"]
    }
  }
}).mount("#app");
