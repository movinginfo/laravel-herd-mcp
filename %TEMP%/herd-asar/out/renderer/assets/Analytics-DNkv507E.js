import { d as defineComponent, a as ref, k as watch, o as openBlock, l as createBlock, w as withCtx, c as createElementBlock, g as createVNode, f as createCommentVNode, G as Transition, e as createBaseVNode, r as renderSlot, h as createTextVNode } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
const _hoisted_1 = {
  key: 0,
  class: "relative z-10"
};
const _hoisted_2 = { class: "fixed inset-0 z-20 w-screen overflow-y-auto" };
const _hoisted_3 = { class: "flex min-h-full items-end justify-center text-black p-4 sm:items-center sm:p-0" };
const _hoisted_4 = {
  key: 0,
  class: "bg-white dark:bg-gray-800 dark:text-white rounded-lg shadow-xl overflow-hidden w-full max-w-md mx-auto"
};
const _hoisted_5 = { class: "px-6 pt-6" };
const _hoisted_6 = { class: "text-lg font-medium leading-6" };
const _hoisted_7 = { class: "px-6 pt-5 pb-7" };
const _hoisted_8 = { class: "text-sm leading-5" };
const _hoisted_9 = { class: "p-6 bg-gray-100 dark:bg-gray-800 flex items-center justify-end space-x-2 border-t border-gray-200 dark:border-gray-700" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "ErrorModal",
  props: {
    context: {
      type: String,
      default: "settings",
      required: false
    }
  },
  emits: [
    "close"
  ],
  setup(__props, { expose: __expose, emit: __emit }) {
    const props = __props;
    const open = ref(false);
    const emit2 = __emit;
    function closeAndEmit(event) {
      open.value = false;
      emit2(event);
    }
    __expose({
      open
    });
    watch(open, (value) => {
      if (props.context === "") {
        return;
      }
      if (value) {
        setTimeout(() => {
          window.api.setTitleBarOverlayForModal(props.context, true);
        }, 40);
      } else {
        setTimeout(() => {
          window.api.setTitleBarOverlayForModal(props.context, false);
        }, 45);
      }
    });
    return (_ctx, _cache) => {
      return openBlock(), createBlock(Transition, { name: "fade" }, {
        default: withCtx(() => [
          open.value ? (openBlock(), createElementBlock("div", _hoisted_1, [
            createVNode(Transition, { name: "fade" }, {
              default: withCtx(() => [
                open.value ? (openBlock(), createElementBlock("div", {
                  key: 0,
                  onClick: _cache[0] || (_cache[0] = ($event) => closeAndEmit("close")),
                  class: "fixed inset-0 bg-gray-500 dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75"
                })) : createCommentVNode("", true)
              ]),
              _: 1
            }),
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", _hoisted_3, [
                createVNode(Transition, { name: "slide-fade" }, {
                  default: withCtx(() => [
                    open.value ? (openBlock(), createElementBlock("div", _hoisted_4, [
                      createBaseVNode("div", _hoisted_5, [
                        createBaseVNode("h3", _hoisted_6, [
                          renderSlot(_ctx.$slots, "title", {}, () => [
                            createTextVNode(" Title ")
                          ])
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_7, [
                        createBaseVNode("p", _hoisted_8, [
                          renderSlot(_ctx.$slots, "text", {}, () => [
                            createTextVNode(" Text ")
                          ])
                        ])
                      ]),
                      createBaseVNode("div", _hoisted_9, [
                        createBaseVNode("button", {
                          type: "button",
                          class: "inline-flex w-1/2 justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-white dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600",
                          onClick: _cache[1] || (_cache[1] = ($event) => closeAndEmit("close"))
                        }, [
                          renderSlot(_ctx.$slots, "secondary", {}, () => [
                            createTextVNode(" Close ")
                          ])
                        ])
                      ])
                    ])) : createCommentVNode("", true)
                  ]),
                  _: 3
                })
              ])
            ])
          ])) : createCommentVNode("", true)
        ]),
        _: 3
      });
    };
  }
});
var s = (r, n, t) => new Promise((c, i) => {
  var d = (e) => {
    try {
      a(t.next(e));
    } catch (o) {
      i(o);
    }
  }, p = (e) => {
    try {
      a(t.throw(e));
    } catch (o) {
      i(o);
    }
  }, a = (e) => e.done ? c(e.value) : Promise.resolve(e.value).then(d, p);
  a((t = t.apply(r, n)).next());
});
function m(r, n) {
  return s(this, null, function* () {
    if (typeof window == "undefined") {
      console.error("Aptabase: to track events in the main process you must import 'trackEvent' from '@aptabase/electron/main'.");
      return;
    }
    try {
      yield fetch("aptabase-ipc://trackEvent", { method: "POST", body: JSON.stringify({ eventName: r, props: n }) });
    } catch (t) {
      console.error("Aptabase: Failed to send event", t);
    }
  });
}
class Analytics {
  static appStarted = "app_started";
  static siteLinkWithForge = "site_link_with_forge";
  static siteToolbarClick = "site_toolbar_click";
  static remoteSiteClick = "remote_site_click";
  static generalSiteClick = "general_site_click";
  static closeSitesWindow = "close_sites_window";
  static siteSidebarClick = "site_sidebar_click";
  static activateLicense = "activate_license";
  static deactivateLicense = "deactivate_license";
  static generalSettingsAddFolder = "general_settings_add_folder";
  static generalSettingsRemoveFolder = "general_settings_remove_folder";
  static openGeneralSettings = "open_general_settings";
  static wizardCreateProject = "wizard_create_project";
  static wizardLinkProject = "wizard_link_project";
  static wizardLinkProjectSelectFolder = "wizard_link_project_select_folder";
  static wizardNewProject = "wizard_new_project";
  static wizardLinkProjectView = "wizard_link_project_view";
  static showSiteWizard = "show_site_wizard";
  static installPHP = "install_php";
  static usePHP = "use_php";
  static openPHPSettings = "open_php_settings";
  static openNodeSettings = "open_node_settings";
  static openExposeSettings = "open_expose_settings";
  static openShortcutsSettings = "open_shortcuts_settings";
  static openMailSettings = "open_mail_settings";
  static openLicenseSettings = "open_license_settings";
  static openDumpSettings = "open_dump_settings";
  static openDebuggerSettings = "open_debugger_settings";
  static openServiceSettings = "open_service_settings";
  static openIntegrationsSettings = "open_integrations_settings";
  static integrationConnectForge = "integration_connect_forge";
  static startServices = "start_services";
  static stopServices = "stop_services";
  static showOnboarding = "show_onboarding";
  static showLicensesRenewalLink = "show_licenses_renewal_link";
  static openDashboardWindow = "open_dashboard_window";
  static openDumpsWindow = "open_dumps_window";
  static openLogsWindow = "open_logs_window";
  static openSitesWindow = "open_sites_window";
  static openMailsWindow = "open_mails_window";
  static showOnboardingLicenseView = "show_onboarding_license_view";
  static showOnboardingSuccessView = "show_onboarding_success_view";
  static showOnboardingNvmView = "show_onboarding_nvm_view";
  static showOnboardingValetView = "show_onboarding_valet_view";
  static showOnboardingStep1View = "show_onboarding_step_1";
}
export {
  Analytics as A,
  _sfc_main as _,
  m
};
