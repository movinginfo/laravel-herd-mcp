import { d as defineComponent, a as ref, M as reactive, b as onMounted, k as watch, j as computed, o as openBlock, c as createElementBlock, e as createBaseVNode, t as toDisplayString, u as unref, h as createTextVNode, F as Fragment, s as renderList, g as createVNode, w as withCtx, f as createCommentVNode, l as createBlock, n as normalizeClass, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { x as xt } from "./style-OiAxle0Y.js";
import { L as Loading } from "./Loading-B6H_jlkQ.js";
import { a as getHumanReadableProviderName } from "./helper-rqO8ojNt.js";
import { _ as _sfc_main$2 } from "./UiInput.vue_vue_type_script_setup_true_lang-P0XHcdXO.js";
import { L as LightButton } from "./LightButton-ClEtlTs9.js";
import { _ as _sfc_main$3 } from "./Forge-DHNxl4hC.js";
import { _ as _sfc_main$1 } from "./Box.vue_vue_type_script_setup_true_lang-BsHZ1uVF.js";
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
const _hoisted_7 = { key: 0 };
const _hoisted_8 = {
  key: 0,
  class: "px-10 pb-8 flex-1 items-center justify-center flex"
};
const _hoisted_9 = { class: "px-6 pb-8 flex justify-center items-center w-full" };
const _hoisted_10 = { class: "px-10 pb-8 flex-1 items-center justify-center flex" };
const _hoisted_11 = {
  key: 0,
  class: "grid grid-cols-8 gap-y-2 gap-x-4 items-center w-full"
};
const _hoisted_12 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Project Path:", -1);
const _hoisted_13 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Laravel Forge Account:", -1);
const _hoisted_14 = /* @__PURE__ */ createBaseVNode("option", {
  value: "",
  disabled: ""
}, "Select account", -1);
const _hoisted_15 = ["value"];
const _hoisted_16 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Server:", -1);
const _hoisted_17 = {
  key: 1,
  class: "col-span-5 h-[32px] flex items-center justify-center"
};
const _hoisted_18 = /* @__PURE__ */ createBaseVNode("option", {
  value: "",
  disabled: ""
}, "Select server", -1);
const _hoisted_19 = ["value"];
const _hoisted_20 = /* @__PURE__ */ createBaseVNode("label", { class: "text-right col-span-3 flex-1" }, "Site:", -1);
const _hoisted_21 = {
  key: 3,
  class: "col-span-5 h-[32px] flex items-center justify-center"
};
const _hoisted_22 = /* @__PURE__ */ createBaseVNode("option", {
  value: "",
  disabled: ""
}, "Select site", -1);
const _hoisted_23 = ["value"];
const _hoisted_24 = {
  key: 2,
  class: "text-center text-red-600 dark:text-red-500 py-4 mx-auto"
};
const _hoisted_25 = { class: "border-t border-gray-200 dark:border-gray-600 px-6 py-3 bg-gray-50 dark:bg-gray-800 justify-end flex items-center space-x-4" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "LinkRemoteSite",
  setup(__props) {
    const urlParams = new URLSearchParams(window.location.search);
    const sitePath = urlParams.get("sitePath");
    const selectedProvider = ref("");
    const step = ref(0);
    const availableProviders = [
      {
        label: "Laravel Forge",
        id: "forge"
      }
    ];
    const forgeConnections = ref([]);
    const servers = ref([]);
    const sites = ref([]);
    const loading = ref(true);
    const loadingServers = ref(false);
    const loadingSites = ref(false);
    const linkingError = ref("");
    const hasRemoteIntegrations = ref(false);
    const selectedServer = ref(null);
    const selectedSite = ref(null);
    const forgeSiteConfiguration = reactive({
      sitePath,
      forgeSiteName: null,
      integrationUuid: null,
      serverId: null,
      siteId: null
    });
    onMounted(async () => {
      hasRemoteIntegrations.value = await window.api.integrations.exists();
    });
    watch(() => step.value, async (newValue) => {
      if (newValue === 1) {
        if (selectedProvider.value === "forge") {
          forgeSiteConfiguration.sitePath = sitePath;
          await loadConnections();
        }
      }
    });
    const loadConnections = async () => {
      loading.value = true;
      forgeConnections.value = await window.api.integrations.forge.all();
      if (forgeConnections.value.length === 0) {
        linkingError.value = "You need to connect your Laravel Forge account first before you can link a remote site.";
      } else if (forgeConnections.value.length === 1) {
        forgeSiteConfiguration.integrationUuid = forgeConnections.value[0]?.uuid;
      }
      loading.value = false;
    };
    const loadServers = async () => {
      console.debug("Loading servers");
      loadingServers.value = true;
      forgeSiteConfiguration.serverId = null;
      selectedServer.value = null;
      servers.value = await window.api.forge.listServers();
      if (servers.value.length === void 0 || servers.value.length === 0) {
        linkingError.value = "No servers found";
        loadingServers.value = false;
        return;
      }
      forgeSiteConfiguration.serverId = servers.value[0].id;
      loadingServers.value = false;
    };
    const loadSites = async () => {
      loadingSites.value = true;
      forgeSiteConfiguration.siteId = null;
      selectedSite.value = null;
      sites.value = await window.api.forge.listSites(forgeSiteConfiguration.serverId);
      if (sites.value.length === void 0 || sites.value.length === 0) {
        linkingError.value = "No sites found";
      }
      loadingSites.value = false;
    };
    watch(() => forgeSiteConfiguration.integrationUuid, async (newValue) => {
      if (newValue) {
        await window.api.forge.setConnection(newValue, true);
        await loadServers();
      }
    });
    watch(() => forgeSiteConfiguration.serverId, async (newValue) => {
      if (newValue) {
        selectedServer.value = servers.value.find((server) => server.id.toString() === newValue.toString());
        await loadSites();
      }
    });
    watch(() => forgeSiteConfiguration.siteId, (newValue) => {
      if (newValue) {
        selectedSite.value = sites.value.find((site) => site.id.toString() === newValue);
        forgeSiteConfiguration.forgeSiteName = selectedSite.value.name;
      }
    });
    const prettyPhpVersion = (version) => {
      return version?.replace("php", "").split("").join(".");
    };
    const close = () => {
      window.close();
    };
    const save = async () => {
      loading.value = true;
      await window.api.integrations.forge.addConfiguration({
        sitePath: forgeSiteConfiguration.sitePath,
        forgeSiteName: forgeSiteConfiguration.forgeSiteName,
        serverId: typeof forgeSiteConfiguration.serverId === "string" ? parseInt(forgeSiteConfiguration.serverId) : forgeSiteConfiguration.serverId,
        siteId: typeof forgeSiteConfiguration.siteId === "string" ? parseInt(forgeSiteConfiguration.siteId) : forgeSiteConfiguration.siteId
      });
      window.close();
    };
    const canProceed = computed(() => {
      return forgeSiteConfiguration.sitePath && forgeSiteConfiguration.serverId && forgeSiteConfiguration.siteId;
    });
    const openSettings = () => {
      window.api.openSettings("integrations");
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        _hoisted_2,
        createBaseVNode("div", _hoisted_3, [
          createBaseVNode("div", _hoisted_4, [
            createBaseVNode("div", _hoisted_5, [
              createBaseVNode("span", _hoisted_6, " Link " + toDisplayString(selectedProvider.value ? unref(getHumanReadableProviderName)(selectedProvider.value) : "Remote") + " Site ", 1)
            ]),
            !hasRemoteIntegrations.value ? (openBlock(), createElementBlock("div", _hoisted_7, [
              createBaseVNode("div", { class: "px-10 py-8 flex-1 items-center justify-center flex" }, [
                createBaseVNode("p", { class: "text-center mx-auto text-base" }, [
                  createTextVNode(" You have no remote integrations set up. Please set up a remote integration in the "),
                  createBaseVNode("a", {
                    onClick: openSettings,
                    class: "underline text-red-500"
                  }, "Settings"),
                  createTextVNode(" first. ")
                ])
              ])
            ])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
              selectedProvider.value === "" || step.value === 0 ? (openBlock(), createElementBlock("div", _hoisted_8, [
                createBaseVNode("div", _hoisted_9, [
                  (openBlock(), createElementBlock(Fragment, null, renderList(availableProviders, (template) => {
                    return createVNode(_sfc_main$1, {
                      key: template.id,
                      selected: template.id === selectedProvider.value,
                      icon: template.id,
                      class: "w-1/2",
                      onDblclick: ($event) => {
                        selectedProvider.value = template.id;
                        step.value++;
                      },
                      onClick: ($event) => selectedProvider.value = template.id
                    }, {
                      default: withCtx(() => [
                        createTextVNode(toDisplayString(template.label), 1)
                      ]),
                      _: 2
                    }, 1032, ["selected", "icon", "onDblclick", "onClick"]);
                  }), 64))
                ])
              ])) : createCommentVNode("", true),
              selectedProvider.value === "forge" && step.value === 1 ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                createBaseVNode("div", _hoisted_10, [
                  !loading.value ? (openBlock(), createElementBlock("div", _hoisted_11, [
                    _hoisted_12,
                    createVNode(_sfc_main$2, {
                      readonly: "",
                      disabled: "",
                      modelValue: forgeSiteConfiguration.sitePath,
                      "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => forgeSiteConfiguration.sitePath = $event),
                      class: "col-span-5"
                    }, null, 8, ["modelValue"]),
                    forgeConnections.value.length > 1 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      _hoisted_13,
                      createVNode(_sfc_main$3, {
                        modelValue: forgeSiteConfiguration.integrationUuid,
                        "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => forgeSiteConfiguration.integrationUuid = $event),
                        class: "col-span-5"
                      }, {
                        default: withCtx(() => [
                          _hoisted_14,
                          (openBlock(true), createElementBlock(Fragment, null, renderList(forgeConnections.value, (connection) => {
                            return openBlock(), createElementBlock("option", {
                              key: connection.uuid,
                              value: connection.uuid
                            }, toDisplayString(connection.userEmail), 9, _hoisted_15);
                          }), 128))
                        ]),
                        _: 1
                      }, 8, ["modelValue"])
                    ], 64)) : createCommentVNode("", true),
                    _hoisted_16,
                    loadingServers.value ? (openBlock(), createElementBlock("div", _hoisted_17, [
                      createVNode(Loading, { class: "" })
                    ])) : (openBlock(), createBlock(_sfc_main$3, {
                      key: 2,
                      modelValue: forgeSiteConfiguration.serverId,
                      "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => forgeSiteConfiguration.serverId = $event),
                      disabled: !forgeSiteConfiguration.integrationUuid || servers.value.length === 0,
                      class: "col-span-5"
                    }, {
                      default: withCtx(() => [
                        _hoisted_18,
                        (openBlock(true), createElementBlock(Fragment, null, renderList(servers.value, (server) => {
                          return openBlock(), createElementBlock("option", {
                            key: server.id,
                            value: server.id
                          }, toDisplayString(server.name) + " (" + toDisplayString(server.ip_address) + ") ", 9, _hoisted_19);
                        }), 128))
                      ]),
                      _: 1
                    }, 8, ["modelValue", "disabled"])),
                    _hoisted_20,
                    loadingSites.value ? (openBlock(), createElementBlock("div", _hoisted_21, [
                      createVNode(Loading, { class: "" })
                    ])) : (openBlock(), createBlock(_sfc_main$3, {
                      key: 4,
                      modelValue: forgeSiteConfiguration.siteId,
                      "onUpdate:modelValue": _cache[3] || (_cache[3] = ($event) => forgeSiteConfiguration.siteId = $event),
                      disabled: !forgeSiteConfiguration.integrationUuid || servers.value.length === 0,
                      class: "col-span-5"
                    }, {
                      default: withCtx(() => [
                        _hoisted_22,
                        (openBlock(true), createElementBlock(Fragment, null, renderList(sites.value, (site) => {
                          return openBlock(), createElementBlock("option", {
                            key: site.id,
                            value: site.id
                          }, toDisplayString(site.name), 9, _hoisted_23);
                        }), 128))
                      ]),
                      _: 1
                    }, 8, ["modelValue", "disabled"]))
                  ])) : createCommentVNode("", true),
                  loading.value ? (openBlock(), createBlock(Loading, { key: 1 })) : createCommentVNode("", true)
                ]),
                !loading.value ? (openBlock(), createElementBlock("p", {
                  key: 0,
                  class: normalizeClass(["py-4 text-center mx-auto", { "opacity-100": selectedServer.value && selectedSite.value, "opacity-0": !(selectedServer.value && selectedSite.value) }])
                }, [
                  createTextVNode(" You are about to link your application at "),
                  createBaseVNode("strong", null, toDisplayString(forgeSiteConfiguration.sitePath), 1),
                  createTextVNode(" to the Laravel Forge site "),
                  createBaseVNode("strong", null, toDisplayString(selectedSite.value?.name) + " (PHP " + toDisplayString(prettyPhpVersion(selectedSite.value?.php_version)) + ")", 1),
                  createTextVNode(" on server "),
                  createBaseVNode("strong", null, toDisplayString(selectedServer.value?.name) + " (" + toDisplayString(selectedServer.value?.ip_address) + ")", 1),
                  createTextVNode(". ")
                ], 2)) : createCommentVNode("", true)
              ], 64)) : createCommentVNode("", true),
              linkingError.value ? (openBlock(), createElementBlock("p", _hoisted_24, toDisplayString(linkingError.value), 1)) : createCommentVNode("", true),
              createBaseVNode("div", _hoisted_25, [
                createVNode(LightButton, { onClick: close }, {
                  default: withCtx(() => [
                    createTextVNode(" Cancel ")
                  ]),
                  _: 1
                }),
                step.value === 1 && selectedProvider.value !== "" ? (openBlock(), createBlock(LightButton, {
                  key: 0,
                  disabled: !canProceed.value,
                  class: normalizeClass({
                    "opacity-50 cursor-not-allowed": !canProceed.value
                  }),
                  onClick: save
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Connect ")
                  ]),
                  _: 1
                }, 8, ["disabled", "class"])) : createCommentVNode("", true),
                step.value === 0 ? (openBlock(), createBlock(LightButton, {
                  key: 1,
                  disabled: selectedProvider.value === "",
                  class: normalizeClass({
                    "opacity-50 cursor-not-allowed": selectedProvider.value === ""
                  }),
                  onClick: _cache[4] || (_cache[4] = ($event) => step.value++)
                }, {
                  default: withCtx(() => [
                    createTextVNode(" Next ")
                  ]),
                  _: 1
                }, 8, ["disabled", "class"])) : createCommentVNode("", true)
              ])
            ], 64))
          ])
        ])
      ]);
    };
  }
});
createApp(_sfc_main).use(xt, {
  themes: {
    winui: {
      $extend: "tooltip",
      triggers: ["click", "hover", "focus"]
    }
  }
}).mount("#app");
