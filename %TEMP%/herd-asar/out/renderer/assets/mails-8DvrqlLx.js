import { d as defineComponent, a as ref, b as onMounted, o as openBlock, c as createElementBlock, e as createBaseVNode, h as createTextVNode, j as computed, k as watch, x as onUnmounted, n as normalizeClass, i as withModifiers, t as toDisplayString, f as createCommentVNode, F as Fragment, s as renderList, u as unref, l as createBlock, v as resolveComponent, g as createVNode, y as withDirectives, B as resolveDirective, q as createApp } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
import { u as useRoute, a as useRouter, c as createRouter, b as createWebHashHistory } from "./vue-router-w7CAhD-2.js";
import { g as getDefaultExportFromCjs } from "./_commonjsHelpers-DWwsNxpa.js";
import { _ as _imports_0$1 } from "./IconTemplateRed@2x-z5TSNBER.js";
import { _ as _imports_0 } from "./SplashBackground-D3YZ7lsO.js";
import { x as xt } from "./style-OiAxle0Y.js";
var iframeResizer = { exports: {} };
(function(module) {
  (function(undefined$1) {
    if (typeof window === "undefined")
      return;
    var count = 0, logEnabled = false, hiddenCheckEnabled = false, msgHeader = "message", msgHeaderLen = msgHeader.length, msgId = "[iFrameSizer]", msgIdLen = msgId.length, pagePosition = null, requestAnimationFrame = window.requestAnimationFrame, resetRequiredMethods = Object.freeze({
      max: 1,
      scroll: 1,
      bodyScroll: 1,
      documentElementScroll: 1
    }), settings = {}, timer = null, defaults = Object.freeze({
      autoResize: true,
      bodyBackground: null,
      bodyMargin: null,
      bodyMarginV1: 8,
      bodyPadding: null,
      checkOrigin: true,
      inPageLinks: false,
      enablePublicMethods: true,
      heightCalculationMethod: "bodyOffset",
      id: "iFrameResizer",
      interval: 32,
      log: false,
      maxHeight: Infinity,
      maxWidth: Infinity,
      minHeight: 0,
      minWidth: 0,
      mouseEvents: true,
      resizeFrom: "parent",
      scrolling: false,
      sizeHeight: true,
      sizeWidth: false,
      warningTimeout: 5e3,
      tolerance: 0,
      widthCalculationMethod: "scroll",
      onClose: function() {
        return true;
      },
      onClosed: function() {
      },
      onInit: function() {
      },
      onMessage: function() {
        warn("onMessage function not defined");
      },
      onMouseEnter: function() {
      },
      onMouseLeave: function() {
      },
      onResized: function() {
      },
      onScroll: function() {
        return true;
      }
    });
    function getMutationObserver() {
      return window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
    }
    function addEventListener(el, evt, func) {
      el.addEventListener(evt, func, false);
    }
    function removeEventListener(el, evt, func) {
      el.removeEventListener(evt, func, false);
    }
    function setupRequestAnimationFrame() {
      var vendors = ["moz", "webkit", "o", "ms"];
      var x;
      for (x = 0; x < vendors.length && !requestAnimationFrame; x += 1) {
        requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
      }
      if (requestAnimationFrame) {
        requestAnimationFrame = requestAnimationFrame.bind(window);
      } else {
        log("setup", "RequestAnimationFrame not supported");
      }
    }
    function getMyID(iframeId) {
      var retStr = "Host page: " + iframeId;
      if (window.top !== window.self) {
        retStr = window.parentIFrame && window.parentIFrame.getId ? window.parentIFrame.getId() + ": " + iframeId : "Nested host page: " + iframeId;
      }
      return retStr;
    }
    function formatLogHeader(iframeId) {
      return msgId + "[" + getMyID(iframeId) + "]";
    }
    function isLogEnabled(iframeId) {
      return settings[iframeId] ? settings[iframeId].log : logEnabled;
    }
    function log(iframeId, msg) {
      output("log", iframeId, msg, isLogEnabled(iframeId));
    }
    function info(iframeId, msg) {
      output("info", iframeId, msg, isLogEnabled(iframeId));
    }
    function warn(iframeId, msg) {
      output("warn", iframeId, msg, true);
    }
    function output(type, iframeId, msg, enabled) {
      if (true === enabled && "object" === typeof window.console) {
        console[type](formatLogHeader(iframeId), msg);
      }
    }
    function iFrameListener(event) {
      function resizeIFrame() {
        function resize2() {
          setSize(messageData);
          setPagePosition(iframeId);
          on("onResized", messageData);
        }
        ensureInRange("Height");
        ensureInRange("Width");
        syncResize(resize2, messageData, "init");
      }
      function processMsg() {
        var data = msg.slice(msgIdLen).split(":");
        var height = data[1] ? parseInt(data[1], 10) : 0;
        var iframe = settings[data[0]] && settings[data[0]].iframe;
        var compStyle = getComputedStyle(iframe);
        return {
          iframe,
          id: data[0],
          height: height + getPaddingEnds(compStyle) + getBorderEnds(compStyle),
          width: data[2],
          type: data[3]
        };
      }
      function getPaddingEnds(compStyle) {
        if (compStyle.boxSizing !== "border-box") {
          return 0;
        }
        var top = compStyle.paddingTop ? parseInt(compStyle.paddingTop, 10) : 0;
        var bot = compStyle.paddingBottom ? parseInt(compStyle.paddingBottom, 10) : 0;
        return top + bot;
      }
      function getBorderEnds(compStyle) {
        if (compStyle.boxSizing !== "border-box") {
          return 0;
        }
        var top = compStyle.borderTopWidth ? parseInt(compStyle.borderTopWidth, 10) : 0;
        var bot = compStyle.borderBottomWidth ? parseInt(compStyle.borderBottomWidth, 10) : 0;
        return top + bot;
      }
      function ensureInRange(Dimension) {
        var max = Number(settings[iframeId]["max" + Dimension]), min = Number(settings[iframeId]["min" + Dimension]), dimension = Dimension.toLowerCase(), size = Number(messageData[dimension]);
        log(iframeId, "Checking " + dimension + " is in range " + min + "-" + max);
        if (size < min) {
          size = min;
          log(iframeId, "Set " + dimension + " to min value");
        }
        if (size > max) {
          size = max;
          log(iframeId, "Set " + dimension + " to max value");
        }
        messageData[dimension] = "" + size;
      }
      function isMessageFromIFrame() {
        function checkAllowedOrigin() {
          function checkList() {
            var i = 0, retCode = false;
            log(
              iframeId,
              "Checking connection is from allowed list of origins: " + checkOrigin
            );
            for (; i < checkOrigin.length; i++) {
              if (checkOrigin[i] === origin) {
                retCode = true;
                break;
              }
            }
            return retCode;
          }
          function checkSingle() {
            var remoteHost = settings[iframeId] && settings[iframeId].remoteHost;
            log(iframeId, "Checking connection is from: " + remoteHost);
            return origin === remoteHost;
          }
          return checkOrigin.constructor === Array ? checkList() : checkSingle();
        }
        var origin = event.origin, checkOrigin = settings[iframeId] && settings[iframeId].checkOrigin;
        if (checkOrigin && "" + origin !== "null" && !checkAllowedOrigin()) {
          throw new Error(
            "Unexpected message received from: " + origin + " for " + messageData.iframe.id + ". Message was: " + event.data + ". This error can be disabled by setting the checkOrigin: false option or by providing of array of trusted domains."
          );
        }
        return true;
      }
      function isMessageForUs() {
        return msgId === ("" + msg).slice(0, msgIdLen) && msg.slice(msgIdLen).split(":")[0] in settings;
      }
      function isMessageFromMetaParent() {
        var retCode = messageData.type in { true: 1, false: 1, undefined: 1 };
        if (retCode) {
          log(iframeId, "Ignoring init message from meta parent page");
        }
        return retCode;
      }
      function getMsgBody(offset) {
        return msg.slice(msg.indexOf(":") + msgHeaderLen + offset);
      }
      function forwardMsgFromIFrame(msgBody) {
        log(
          iframeId,
          "onMessage passed: {iframe: " + messageData.iframe.id + ", message: " + msgBody + "}"
        );
        on("onMessage", {
          iframe: messageData.iframe,
          message: JSON.parse(msgBody)
        });
        log(iframeId, "--");
      }
      function getPageInfo() {
        var bodyPosition = document.body.getBoundingClientRect(), iFramePosition = messageData.iframe.getBoundingClientRect();
        return JSON.stringify({
          iframeHeight: iFramePosition.height,
          iframeWidth: iFramePosition.width,
          clientHeight: Math.max(
            document.documentElement.clientHeight,
            window.innerHeight || 0
          ),
          clientWidth: Math.max(
            document.documentElement.clientWidth,
            window.innerWidth || 0
          ),
          offsetTop: parseInt(iFramePosition.top - bodyPosition.top, 10),
          offsetLeft: parseInt(iFramePosition.left - bodyPosition.left, 10),
          scrollTop: window.pageYOffset,
          scrollLeft: window.pageXOffset,
          documentHeight: document.documentElement.clientHeight,
          documentWidth: document.documentElement.clientWidth,
          windowHeight: window.innerHeight,
          windowWidth: window.innerWidth
        });
      }
      function sendPageInfoToIframe(iframe, iframeId2) {
        function debouncedTrigger() {
          trigger("Send Page Info", "pageInfo:" + getPageInfo(), iframe, iframeId2);
        }
        debounceFrameEvents(debouncedTrigger, 32, iframeId2);
      }
      function startPageInfoMonitor() {
        function setListener(type, func) {
          function sendPageInfo() {
            if (settings[id]) {
              sendPageInfoToIframe(settings[id].iframe, id);
            } else {
              stop();
            }
          }
          ["scroll", "resize"].forEach(function(evt) {
            log(id, type + evt + " listener for sendPageInfo");
            func(window, evt, sendPageInfo);
          });
        }
        function stop() {
          setListener("Remove ", removeEventListener);
        }
        function start() {
          setListener("Add ", addEventListener);
        }
        var id = iframeId;
        start();
        if (settings[id]) {
          settings[id].stopPageInfo = stop;
        }
      }
      function stopPageInfoMonitor() {
        if (settings[iframeId] && settings[iframeId].stopPageInfo) {
          settings[iframeId].stopPageInfo();
          delete settings[iframeId].stopPageInfo;
        }
      }
      function checkIFrameExists() {
        var retBool = true;
        if (null === messageData.iframe) {
          warn(iframeId, "IFrame (" + messageData.id + ") not found");
          retBool = false;
        }
        return retBool;
      }
      function getElementPosition(target) {
        var iFramePosition = target.getBoundingClientRect();
        getPagePosition(iframeId);
        return {
          x: Math.floor(Number(iFramePosition.left) + Number(pagePosition.x)),
          y: Math.floor(Number(iFramePosition.top) + Number(pagePosition.y))
        };
      }
      function scrollRequestFromChild(addOffset) {
        function reposition() {
          pagePosition = newPosition;
          scrollTo();
          log(iframeId, "--");
        }
        function calcOffset() {
          return {
            x: Number(messageData.width) + offset.x,
            y: Number(messageData.height) + offset.y
          };
        }
        function scrollParent() {
          if (window.parentIFrame) {
            window.parentIFrame["scrollTo" + (addOffset ? "Offset" : "")](
              newPosition.x,
              newPosition.y
            );
          } else {
            warn(
              iframeId,
              "Unable to scroll to requested position, window.parentIFrame not found"
            );
          }
        }
        var offset = addOffset ? getElementPosition(messageData.iframe) : { x: 0, y: 0 }, newPosition = calcOffset();
        log(
          iframeId,
          "Reposition requested from iFrame (offset x:" + offset.x + " y:" + offset.y + ")"
        );
        if (window.top === window.self) {
          reposition();
        } else {
          scrollParent();
        }
      }
      function scrollTo() {
        if (false === on("onScroll", pagePosition)) {
          unsetPagePosition();
        } else {
          setPagePosition(iframeId);
        }
      }
      function findTarget(location) {
        function jumpToTarget() {
          var jumpPosition = getElementPosition(target);
          log(
            iframeId,
            "Moving to in page link (#" + hash + ") at x: " + jumpPosition.x + " y: " + jumpPosition.y
          );
          pagePosition = {
            x: jumpPosition.x,
            y: jumpPosition.y
          };
          scrollTo();
          log(iframeId, "--");
        }
        function jumpToParent() {
          if (window.parentIFrame) {
            window.parentIFrame.moveToAnchor(hash);
          } else {
            log(
              iframeId,
              "In page link #" + hash + " not found and window.parentIFrame not found"
            );
          }
        }
        var hash = location.split("#")[1] || "", hashData = decodeURIComponent(hash), target = document.getElementById(hashData) || document.getElementsByName(hashData)[0];
        if (target) {
          jumpToTarget();
        } else if (window.top === window.self) {
          log(iframeId, "In page link #" + hash + " not found");
        } else {
          jumpToParent();
        }
      }
      function onMouse(event2) {
        var mousePos = {};
        if (Number(messageData.width) === 0 && Number(messageData.height) === 0) {
          var data = getMsgBody(9).split(":");
          mousePos = {
            x: data[1],
            y: data[0]
          };
        } else {
          mousePos = {
            x: messageData.width,
            y: messageData.height
          };
        }
        on(event2, {
          iframe: messageData.iframe,
          screenX: Number(mousePos.x),
          screenY: Number(mousePos.y),
          type: messageData.type
        });
      }
      function on(funcName, val) {
        return chkEvent(iframeId, funcName, val);
      }
      function actionMsg() {
        if (settings[iframeId] && settings[iframeId].firstRun)
          firstRun();
        switch (messageData.type) {
          case "close": {
            closeIFrame(messageData.iframe);
            break;
          }
          case "message": {
            forwardMsgFromIFrame(getMsgBody(6));
            break;
          }
          case "mouseenter": {
            onMouse("onMouseEnter");
            break;
          }
          case "mouseleave": {
            onMouse("onMouseLeave");
            break;
          }
          case "autoResize": {
            settings[iframeId].autoResize = JSON.parse(getMsgBody(9));
            break;
          }
          case "scrollTo": {
            scrollRequestFromChild(false);
            break;
          }
          case "scrollToOffset": {
            scrollRequestFromChild(true);
            break;
          }
          case "pageInfo": {
            sendPageInfoToIframe(
              settings[iframeId] && settings[iframeId].iframe,
              iframeId
            );
            startPageInfoMonitor();
            break;
          }
          case "pageInfoStop": {
            stopPageInfoMonitor();
            break;
          }
          case "inPageLink": {
            findTarget(getMsgBody(9));
            break;
          }
          case "reset": {
            resetIFrame(messageData);
            break;
          }
          case "init": {
            resizeIFrame();
            on("onInit", messageData.iframe);
            break;
          }
          default: {
            if (Number(messageData.width) === 0 && Number(messageData.height) === 0) {
              warn(
                "Unsupported message received (" + messageData.type + "), this is likely due to the iframe containing a later version of iframe-resizer than the parent page"
              );
            } else {
              resizeIFrame();
            }
          }
        }
      }
      function hasSettings(iframeId2) {
        var retBool = true;
        if (!settings[iframeId2]) {
          retBool = false;
          warn(
            messageData.type + " No settings for " + iframeId2 + ". Message was: " + msg
          );
        }
        return retBool;
      }
      function iFrameReadyMsgReceived() {
        for (var iframeId2 in settings) {
          trigger(
            "iFrame requested init",
            createOutgoingMsg(iframeId2),
            settings[iframeId2].iframe,
            iframeId2
          );
        }
      }
      function firstRun() {
        if (settings[iframeId]) {
          settings[iframeId].firstRun = false;
        }
      }
      var msg = event.data, messageData = {}, iframeId = null;
      if ("[iFrameResizerChild]Ready" === msg) {
        iFrameReadyMsgReceived();
      } else if (isMessageForUs()) {
        messageData = processMsg();
        iframeId = messageData.id;
        if (settings[iframeId]) {
          settings[iframeId].loaded = true;
        }
        if (!isMessageFromMetaParent() && hasSettings(iframeId)) {
          log(iframeId, "Received: " + msg);
          if (checkIFrameExists() && isMessageFromIFrame()) {
            actionMsg();
          }
        }
      } else {
        info(iframeId, "Ignored: " + msg);
      }
    }
    function chkEvent(iframeId, funcName, val) {
      var func = null, retVal = null;
      if (settings[iframeId]) {
        func = settings[iframeId][funcName];
        if ("function" === typeof func) {
          retVal = func(val);
        } else {
          throw new TypeError(
            funcName + " on iFrame[" + iframeId + "] is not a function"
          );
        }
      }
      return retVal;
    }
    function removeIframeListeners(iframe) {
      var iframeId = iframe.id;
      delete settings[iframeId];
    }
    function closeIFrame(iframe) {
      var iframeId = iframe.id;
      if (chkEvent(iframeId, "onClose", iframeId) === false) {
        log(iframeId, "Close iframe cancelled by onClose event");
        return;
      }
      log(iframeId, "Removing iFrame: " + iframeId);
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (error) {
        warn(error);
      }
      chkEvent(iframeId, "onClosed", iframeId);
      log(iframeId, "--");
      removeIframeListeners(iframe);
    }
    function getPagePosition(iframeId) {
      if (null === pagePosition) {
        pagePosition = {
          x: window.pageXOffset === undefined$1 ? document.documentElement.scrollLeft : window.pageXOffset,
          y: window.pageYOffset === undefined$1 ? document.documentElement.scrollTop : window.pageYOffset
        };
        log(
          iframeId,
          "Get page position: " + pagePosition.x + "," + pagePosition.y
        );
      }
    }
    function setPagePosition(iframeId) {
      if (null !== pagePosition) {
        window.scrollTo(pagePosition.x, pagePosition.y);
        log(
          iframeId,
          "Set page position: " + pagePosition.x + "," + pagePosition.y
        );
        unsetPagePosition();
      }
    }
    function unsetPagePosition() {
      pagePosition = null;
    }
    function resetIFrame(messageData) {
      function reset() {
        setSize(messageData);
        trigger("reset", "reset", messageData.iframe, messageData.id);
      }
      log(
        messageData.id,
        "Size reset requested by " + ("init" === messageData.type ? "host page" : "iFrame")
      );
      getPagePosition(messageData.id);
      syncResize(reset, messageData, "reset");
    }
    function setSize(messageData) {
      function setDimension(dimension) {
        if (!messageData.id) {
          log("undefined", "messageData id not set");
          return;
        }
        messageData.iframe.style[dimension] = messageData[dimension] + "px";
        log(
          messageData.id,
          "IFrame (" + iframeId + ") " + dimension + " set to " + messageData[dimension] + "px"
        );
      }
      function chkZero(dimension) {
        if (!hiddenCheckEnabled && "0" === messageData[dimension]) {
          hiddenCheckEnabled = true;
          log(iframeId, "Hidden iFrame detected, creating visibility listener");
          fixHiddenIFrames();
        }
      }
      function processDimension(dimension) {
        setDimension(dimension);
        chkZero(dimension);
      }
      var iframeId = messageData.iframe.id;
      if (settings[iframeId]) {
        if (settings[iframeId].sizeHeight) {
          processDimension("height");
        }
        if (settings[iframeId].sizeWidth) {
          processDimension("width");
        }
      }
    }
    function syncResize(func, messageData, doNotSync) {
      if (doNotSync !== messageData.type && requestAnimationFrame && // including check for jasmine because had trouble getting spy to work in unit test using requestAnimationFrame
      !window.jasmine) {
        log(messageData.id, "Requesting animation frame");
        requestAnimationFrame(func);
      } else {
        func();
      }
    }
    function trigger(calleeMsg, msg, iframe, id, noResponseWarning) {
      function postMessageToIFrame() {
        var target = settings[id] && settings[id].targetOrigin;
        log(
          id,
          "[" + calleeMsg + "] Sending msg to iframe[" + id + "] (" + msg + ") targetOrigin: " + target
        );
        iframe.contentWindow.postMessage(msgId + msg, target);
      }
      function iFrameNotFound() {
        warn(id, "[" + calleeMsg + "] IFrame(" + id + ") not found");
      }
      function chkAndSend() {
        if (iframe && "contentWindow" in iframe && null !== iframe.contentWindow) {
          postMessageToIFrame();
        } else {
          iFrameNotFound();
        }
      }
      function warnOnNoResponse() {
        function warning() {
          if (settings[id] && !settings[id].loaded && !errorShown) {
            errorShown = true;
            warn(
              id,
              "IFrame has not responded within " + settings[id].warningTimeout / 1e3 + " seconds. Check iFrameResizer.contentWindow.js has been loaded in iFrame. This message can be ignored if everything is working, or you can set the warningTimeout option to a higher value or zero to suppress this warning."
            );
          }
        }
        if (!!noResponseWarning && settings[id] && !!settings[id].warningTimeout) {
          settings[id].msgTimeout = setTimeout(
            warning,
            settings[id].warningTimeout
          );
        }
      }
      var errorShown = false;
      id = id || iframe.id;
      if (settings[id]) {
        chkAndSend();
        warnOnNoResponse();
      }
    }
    function createOutgoingMsg(iframeId) {
      return iframeId + ":" + settings[iframeId].bodyMarginV1 + ":" + settings[iframeId].sizeWidth + ":" + settings[iframeId].log + ":" + settings[iframeId].interval + ":" + settings[iframeId].enablePublicMethods + ":" + settings[iframeId].autoResize + ":" + settings[iframeId].bodyMargin + ":" + settings[iframeId].heightCalculationMethod + ":" + settings[iframeId].bodyBackground + ":" + settings[iframeId].bodyPadding + ":" + settings[iframeId].tolerance + ":" + settings[iframeId].inPageLinks + ":" + settings[iframeId].resizeFrom + ":" + settings[iframeId].widthCalculationMethod + ":" + settings[iframeId].mouseEvents;
    }
    function isNumber(value) {
      return typeof value === "number";
    }
    function setupIFrame(iframe, options) {
      function setLimits() {
        function addStyle(style) {
          var styleValue = settings[iframeId][style];
          if (Infinity !== styleValue && 0 !== styleValue) {
            iframe.style[style] = isNumber(styleValue) ? styleValue + "px" : styleValue;
            log(iframeId, "Set " + style + " = " + iframe.style[style]);
          }
        }
        function chkMinMax(dimension) {
          if (settings[iframeId]["min" + dimension] > settings[iframeId]["max" + dimension]) {
            throw new Error(
              "Value for min" + dimension + " can not be greater than max" + dimension
            );
          }
        }
        chkMinMax("Height");
        chkMinMax("Width");
        addStyle("maxHeight");
        addStyle("minHeight");
        addStyle("maxWidth");
        addStyle("minWidth");
      }
      function newId() {
        var id = options && options.id || defaults.id + count++;
        if (null !== document.getElementById(id)) {
          id += count++;
        }
        return id;
      }
      function ensureHasId(iframeId2) {
        if (typeof iframeId2 !== "string") {
          throw new TypeError("Invaild id for iFrame. Expected String");
        }
        if ("" === iframeId2) {
          iframe.id = iframeId2 = newId();
          logEnabled = (options || {}).log;
          log(
            iframeId2,
            "Added missing iframe ID: " + iframeId2 + " (" + iframe.src + ")"
          );
        }
        return iframeId2;
      }
      function setScrolling() {
        log(
          iframeId,
          "IFrame scrolling " + (settings[iframeId] && settings[iframeId].scrolling ? "enabled" : "disabled") + " for " + iframeId
        );
        iframe.style.overflow = false === (settings[iframeId] && settings[iframeId].scrolling) ? "hidden" : "auto";
        switch (settings[iframeId] && settings[iframeId].scrolling) {
          case "omit": {
            break;
          }
          case true: {
            iframe.scrolling = "yes";
            break;
          }
          case false: {
            iframe.scrolling = "no";
            break;
          }
          default: {
            iframe.scrolling = settings[iframeId] ? settings[iframeId].scrolling : "no";
          }
        }
      }
      function setupBodyMarginValues() {
        if ("number" === typeof (settings[iframeId] && settings[iframeId].bodyMargin) || "0" === (settings[iframeId] && settings[iframeId].bodyMargin)) {
          settings[iframeId].bodyMarginV1 = settings[iframeId].bodyMargin;
          settings[iframeId].bodyMargin = "" + settings[iframeId].bodyMargin + "px";
        }
      }
      function checkReset() {
        var firstRun = settings[iframeId] && settings[iframeId].firstRun, resetRequertMethod = settings[iframeId] && settings[iframeId].heightCalculationMethod in resetRequiredMethods;
        if (!firstRun && resetRequertMethod) {
          resetIFrame({ iframe, height: 0, width: 0, type: "init" });
        }
      }
      function setupIFrameObject() {
        if (settings[iframeId]) {
          settings[iframeId].iframe.iFrameResizer = {
            close: closeIFrame.bind(null, settings[iframeId].iframe),
            removeListeners: removeIframeListeners.bind(
              null,
              settings[iframeId].iframe
            ),
            resize: trigger.bind(
              null,
              "Window resize",
              "resize",
              settings[iframeId].iframe
            ),
            moveToAnchor: function(anchor) {
              trigger(
                "Move to anchor",
                "moveToAnchor:" + anchor,
                settings[iframeId].iframe,
                iframeId
              );
            },
            sendMessage: function(message) {
              message = JSON.stringify(message);
              trigger(
                "Send Message",
                "message:" + message,
                settings[iframeId].iframe,
                iframeId
              );
            }
          };
        }
      }
      function init(msg) {
        function iFrameLoaded() {
          trigger("iFrame.onload", msg, iframe, undefined$1, true);
          checkReset();
        }
        function createDestroyObserver(MutationObserver2) {
          if (!iframe.parentNode) {
            return;
          }
          var destroyObserver = new MutationObserver2(function(mutations) {
            mutations.forEach(function(mutation) {
              var removedNodes = Array.prototype.slice.call(mutation.removedNodes);
              removedNodes.forEach(function(removedNode) {
                if (removedNode === iframe) {
                  closeIFrame(iframe);
                }
              });
            });
          });
          destroyObserver.observe(iframe.parentNode, {
            childList: true
          });
        }
        var MutationObserver = getMutationObserver();
        if (MutationObserver) {
          createDestroyObserver(MutationObserver);
        }
        addEventListener(iframe, "load", iFrameLoaded);
        trigger("init", msg, iframe, undefined$1, true);
      }
      function checkOptions(options2) {
        if ("object" !== typeof options2) {
          throw new TypeError("Options is not an object");
        }
      }
      function copyOptions(options2) {
        for (var option in defaults) {
          if (Object.prototype.hasOwnProperty.call(defaults, option)) {
            settings[iframeId][option] = Object.prototype.hasOwnProperty.call(
              options2,
              option
            ) ? options2[option] : defaults[option];
          }
        }
      }
      function getTargetOrigin(remoteHost) {
        return "" === remoteHost || null !== remoteHost.match(/^(about:blank|javascript:|file:\/\/)/) ? "*" : remoteHost;
      }
      function depricate(key) {
        var splitName = key.split("Callback");
        if (splitName.length === 2) {
          var name = "on" + splitName[0].charAt(0).toUpperCase() + splitName[0].slice(1);
          this[name] = this[key];
          delete this[key];
          warn(
            iframeId,
            "Deprecated: '" + key + "' has been renamed '" + name + "'. The old method will be removed in the next major version."
          );
        }
      }
      function processOptions(options2) {
        options2 = options2 || {};
        settings[iframeId] = /* @__PURE__ */ Object.create(null);
        settings[iframeId].iframe = iframe;
        settings[iframeId].firstRun = true;
        settings[iframeId].remoteHost = iframe.src && iframe.src.split("/").slice(0, 3).join("/");
        checkOptions(options2);
        Object.keys(options2).forEach(depricate, options2);
        copyOptions(options2);
        if (settings[iframeId]) {
          settings[iframeId].targetOrigin = true === settings[iframeId].checkOrigin ? getTargetOrigin(settings[iframeId].remoteHost) : "*";
        }
      }
      function beenHere() {
        return iframeId in settings && "iFrameResizer" in iframe;
      }
      var iframeId = ensureHasId(iframe.id);
      if (beenHere()) {
        warn(iframeId, "Ignored iFrame, already setup.");
      } else {
        processOptions(options);
        setScrolling();
        setLimits();
        setupBodyMarginValues();
        init(createOutgoingMsg(iframeId));
        setupIFrameObject();
      }
    }
    function debouce(fn, time) {
      if (null === timer) {
        timer = setTimeout(function() {
          timer = null;
          fn();
        }, time);
      }
    }
    var frameTimer = {};
    function debounceFrameEvents(fn, time, frameId) {
      if (!frameTimer[frameId]) {
        frameTimer[frameId] = setTimeout(function() {
          frameTimer[frameId] = null;
          fn();
        }, time);
      }
    }
    function fixHiddenIFrames() {
      function checkIFrames() {
        function checkIFrame(settingId) {
          function chkDimension(dimension) {
            return "0px" === (settings[settingId] && settings[settingId].iframe.style[dimension]);
          }
          function isVisible(el) {
            return null !== el.offsetParent;
          }
          if (settings[settingId] && isVisible(settings[settingId].iframe) && (chkDimension("height") || chkDimension("width"))) {
            trigger(
              "Visibility change",
              "resize",
              settings[settingId].iframe,
              settingId
            );
          }
        }
        Object.keys(settings).forEach(function(key) {
          checkIFrame(key);
        });
      }
      function mutationObserved(mutations) {
        log(
          "window",
          "Mutation observed: " + mutations[0].target + " " + mutations[0].type
        );
        debouce(checkIFrames, 16);
      }
      function createMutationObserver() {
        var target = document.querySelector("body"), config = {
          attributes: true,
          attributeOldValue: false,
          characterData: true,
          characterDataOldValue: false,
          childList: true,
          subtree: true
        }, observer = new MutationObserver(mutationObserved);
        observer.observe(target, config);
      }
      var MutationObserver = getMutationObserver();
      if (MutationObserver) {
        createMutationObserver();
      }
    }
    function resizeIFrames(event) {
      function resize2() {
        sendTriggerMsg("Window " + event, "resize");
      }
      log("window", "Trigger event: " + event);
      debouce(resize2, 16);
    }
    function tabVisible() {
      function resize2() {
        sendTriggerMsg("Tab Visible", "resize");
      }
      if ("hidden" !== document.visibilityState) {
        log("document", "Trigger event: Visibility change");
        debouce(resize2, 16);
      }
    }
    function sendTriggerMsg(eventName, event) {
      function isIFrameResizeEnabled(iframeId) {
        return settings[iframeId] && "parent" === settings[iframeId].resizeFrom && settings[iframeId].autoResize && !settings[iframeId].firstRun;
      }
      Object.keys(settings).forEach(function(iframeId) {
        if (isIFrameResizeEnabled(iframeId)) {
          trigger(eventName, event, settings[iframeId].iframe, iframeId);
        }
      });
    }
    function setupEventListeners() {
      addEventListener(window, "message", iFrameListener);
      addEventListener(window, "resize", function() {
        resizeIFrames("resize");
      });
      addEventListener(document, "visibilitychange", tabVisible);
      addEventListener(document, "-webkit-visibilitychange", tabVisible);
    }
    function factory() {
      function init(options, element) {
        function chkType() {
          if (!element.tagName) {
            throw new TypeError("Object is not a valid DOM element");
          } else if ("IFRAME" !== element.tagName.toUpperCase()) {
            throw new TypeError(
              "Expected <IFRAME> tag, found <" + element.tagName + ">"
            );
          }
        }
        if (element) {
          chkType();
          setupIFrame(element, options);
          iFrames.push(element);
        }
      }
      function warnDeprecatedOptions(options) {
        if (options && options.enablePublicMethods) {
          warn(
            "enablePublicMethods option has been removed, public methods are now always available in the iFrame"
          );
        }
      }
      var iFrames;
      setupRequestAnimationFrame();
      setupEventListeners();
      return function iFrameResizeF(options, target) {
        iFrames = [];
        warnDeprecatedOptions(options);
        switch (typeof target) {
          case "undefined":
          case "string": {
            Array.prototype.forEach.call(
              document.querySelectorAll(target || "iframe"),
              init.bind(undefined$1, options)
            );
            break;
          }
          case "object": {
            init(options, target);
            break;
          }
          default: {
            throw new TypeError("Unexpected data type (" + typeof target + ")");
          }
        }
        return iFrames;
      };
    }
    function createJQueryPublicMethod($) {
      if (!$.fn) {
        info("", "Unable to bind to jQuery, it is not fully loaded.");
      } else if (!$.fn.iFrameResize) {
        $.fn.iFrameResize = function $iFrameResizeF(options) {
          function init(index, element) {
            setupIFrame(element, options);
          }
          return this.filter("iframe").each(init).end();
        };
      }
    }
    if (window.jQuery !== undefined$1) {
      createJQueryPublicMethod(window.jQuery);
    }
    {
      module.exports = factory();
    }
    window.iFrameResize = window.iFrameResize || factory();
  })();
})(iframeResizer);
var iframeResizerExports = iframeResizer.exports;
const iFrameResize = /* @__PURE__ */ getDefaultExportFromCjs(iframeResizerExports);
const _hoisted_1$3 = { class: "z-20 flex w-full h-full overflow-hidden" };
const _hoisted_2$3 = /* @__PURE__ */ createBaseVNode("img", {
  src: _imports_0,
  class: "w-full absolute bottom-0",
  alt: "logo"
}, null, -1);
const _hoisted_3$3 = { class: "relative z-10 flex flex-col items-center justify-center w-full text-base dark:text-gray-100" };
const _hoisted_4$3 = /* @__PURE__ */ createBaseVNode("h1", { class: "text-6xl font-bold mb-4 dark:text-white" }, "Mail", -1);
const _hoisted_5$3 = /* @__PURE__ */ createBaseVNode("p", null, " Herd allows you to easily debug and test outgoing emails during development. ", -1);
const _hoisted_6$3 = /* @__PURE__ */ createBaseVNode("p", null, [
  /* @__PURE__ */ createTextVNode(" To get started, modify your "),
  /* @__PURE__ */ createBaseVNode("code", null, ".env"),
  /* @__PURE__ */ createTextVNode(" file to use the following mail settings: ")
], -1);
const _hoisted_7$3 = ["innerHTML"];
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "EmptyState",
  setup(__props) {
    const port = ref(2525);
    const portSettings = ref("");
    portSettings.value = `MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=2525
MAIL_USERNAME="\${APP_NAME}"`;
    onMounted(async () => {
      port.value = await window.api.mails.port();
      portSettings.value = `MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=${port.value}
MAIL_USERNAME="\${APP_NAME}"
MAIL_ENCRYPTION=NULL`;
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        _hoisted_2$3,
        createBaseVNode("div", _hoisted_3$3, [
          _hoisted_4$3,
          _hoisted_5$3,
          _hoisted_6$3,
          createBaseVNode("pre", {
            class: "p-4 rounded-md mt-5 bg-white select-text dark:bg-gray-800",
            innerHTML: portSettings.value
          }, null, 8, _hoisted_7$3)
        ])
      ]);
    };
  }
});
const _hoisted_1$2 = { class: "select-none h-full w-full text-sm text-black relative dark:bg-gray-900" };
const _hoisted_2$2 = {
  key: 0,
  class: "z-20 flex h-full"
};
const _hoisted_3$2 = { class: "flex flex-col bg-white dark:bg-gray-900 h-full border-r dark:border-gray-600" };
const _hoisted_4$2 = /* @__PURE__ */ createBaseVNode("img", {
  src: _imports_0$1,
  class: "h-4"
}, null, -1);
const _hoisted_5$2 = [
  _hoisted_4$2
];
const _hoisted_6$2 = { key: 0 };
const _hoisted_7$2 = { class: "truncate max-w-[170px]" };
const _hoisted_8$2 = {
  key: 0,
  class: "font-icon text-black dark:text-white !mt-0"
};
const _hoisted_9$2 = {
  key: 0,
  class: "max-h-[450px] overflow-y-auto absolute w-full left-0 top-9 z-10 bg-white rounded-sm shadow border border-gray-200 border-t-0 dark:bg-gray-800 dark:border-gray-600"
};
const _hoisted_10$1 = { class: "dark:text-white flex flex-col space-y-2 mr-4 p-2" };
const _hoisted_11$1 = ["onClick"];
const _hoisted_12$1 = {
  key: 0,
  class: "px-4 h-[50px] relative border-b"
};
const _hoisted_13$1 = { class: "truncate max-w-[170px]" };
const _hoisted_14$1 = {
  key: 0,
  class: "font-icon text-black dark:text-white !mt-0"
};
const _hoisted_15$1 = {
  key: 0,
  class: "max-h-[450px] mt-3 overflow-y-auto absolute w-full left-0 top-9 z-10 bg-white rounded-sm shadow border border-gray-200 border-t-0 dark:bg-gray-800 dark:border-gray-600"
};
const _hoisted_16$1 = { class: "dark:text-white flex flex-col space-y-2 mr-4 p-2" };
const _hoisted_17$1 = ["onClick"];
const _hoisted_18$1 = { class: "overflow-y-auto flex-1" };
const _hoisted_19$1 = ["onClick", "onContextmenu"];
const _hoisted_20$1 = { class: "flex justify-between text-onboarding-gray dark:text-white text-[12px]" };
const _hoisted_21$1 = { class: "flex flex-col" };
const _hoisted_22$1 = ["title"];
const _hoisted_23$1 = ["title"];
const _hoisted_24$1 = { class: "relative flex-1 flex flex-col overflow-hidden dark:border-gray-600" };
const _hoisted_25$1 = { class: "h-[39px] flex items-center justify-end border-b border-gray-200 dark:border-gray-600" };
const _hoisted_26$1 = /* @__PURE__ */ createBaseVNode("img", {
  src: _imports_0$1,
  class: "h-4"
}, null, -1);
const _hoisted_27$1 = [
  _hoisted_26$1
];
const _hoisted_28$1 = { class: "flex w-full h-full overflow-y-auto overflow-x-hidden" };
const _hoisted_29$1 = { class: "w-full h-full" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "Mails",
  setup(__props) {
    const rtlEnabled = ref(false);
    const route = useRoute();
    const router2 = useRouter();
    const mailboxes = ref([]);
    const mails = ref([]);
    const loading = ref(false);
    const activeMail = computed(() => route.params.id);
    const selectedMailbox = ref({
      mailbox: ""
    });
    const showMailboxPicker = ref(false);
    let ignoreActiveMail = false;
    let removeOnNewMailListener = null;
    let removeOnDeleteMailboxListener = null;
    let removeOnDeleteMailListener = null;
    onMounted(async () => {
      loading.value = true;
      rtlEnabled.value = await window.api.app.rtlEnabled();
      mailboxes.value = await window.api.mails.mailboxes();
      if (activeMail.value !== void 0) {
        const activeMailData = await window.api.mails.mail(activeMail.value);
        selectedMailbox.value = {
          mailbox: activeMailData.mailbox
        };
      } else {
        if (mailboxes.value.length > 0) {
          const latestMail = await window.api.mails.latestMail();
          selectedMailbox.value = {
            mailbox: latestMail.mailbox
          };
        }
      }
      loading.value = false;
      removeOnNewMailListener = window.api.mails.onNewMail(async () => {
        mailboxes.value = await window.api.mails.mailboxes();
        const latestMail = await window.api.mails.latestMail();
        selectedMailbox.value = {
          mailbox: latestMail.mailbox
        };
        router2.replace({ name: "mail", params: { id: latestMail.id } });
      });
      removeOnDeleteMailboxListener = window.api.mails.onDeleteMailbox(async () => {
        await deleteMailbox();
      });
      removeOnDeleteMailListener = window.api.mails.onDeleteMail(async (_, mailId) => {
        await deleteMail(mailId);
      });
    });
    watch(() => selectedMailbox.value, async (id) => {
      await loadMails();
    });
    const loadMails = async () => {
      mails.value = await window.api.mails.mails(selectedMailbox.value.mailbox);
      if (!ignoreActiveMail && activeMail.value !== void 0) {
        router2.replace({ name: "mail", params: { id: activeMail.value } });
      } else if (mails.value.length > 0) {
        router2.replace({ name: "mail", params: { id: mails.value[0].id } });
        ignoreActiveMail = false;
      }
    };
    const selectMailbox = (mailbox) => {
      showMailboxPicker.value = false;
      ignoreActiveMail = true;
      selectedMailbox.value = mailbox;
    };
    const relativeDate = (date) => {
      date = new Date(date);
      const today = /* @__PURE__ */ new Date();
      const dateOptions = { year: "numeric", month: "long", day: "numeric" };
      const timeOptions = { hour: "numeric", minute: "numeric" };
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString(void 0, timeOptions);
      } else {
        return date.toLocaleDateString(void 0, dateOptions);
      }
    };
    const deleteMail = async (mailId) => {
      await window.api.mails.deleteMail(mailId);
      await loadMails();
      ensureSelectedMailbox();
    };
    const deleteMailbox = async () => {
      await window.api.mails.deleteMailbox(selectedMailbox.value.mailbox);
      await loadMails();
      await ensureSelectedMailbox();
    };
    const ensureSelectedMailbox = async () => {
      if (mails.value.length <= 0) {
        mailboxes.value = await window.api.mails.mailboxes();
        if (mailboxes.value.length > 0) {
          const latestMail = await window.api.mails.latestMail();
          selectedMailbox.value = {
            mailbox: latestMail.mailbox
          };
        }
      }
    };
    const showContextMenu = () => {
      window.api.mails.showMailboxContextMenu();
    };
    const showMailContextMenu = (mailId) => {
      window.api.mails.showMailContextMenu(mailId);
    };
    onUnmounted(() => {
      if (removeOnNewMailListener !== null) {
        removeOnNewMailListener();
      }
      if (removeOnDeleteMailboxListener !== null) {
        removeOnDeleteMailboxListener();
      }
      if (removeOnDeleteMailListener !== null) {
        removeOnDeleteMailListener();
      }
    });
    return (_ctx, _cache) => {
      const _component_router_view = resolveComponent("router-view");
      return openBlock(), createElementBlock("div", _hoisted_1$2, [
        createBaseVNode("div", {
          class: normalizeClass(["absolute top-0 left-0 bg-white dark:bg-gray-900 w-full h-[35px] ml-[250px] dark:border-gray-600", { "border-l": !loading.value && mailboxes.value.length > 0 }]),
          style: { "-webkit-app-region": "drag" }
        }, null, 2),
        !loading.value && mailboxes.value.length > 0 ? (openBlock(), createElementBlock("div", _hoisted_2$2, [
          createBaseVNode("div", _hoisted_3$2, [
            createBaseVNode("div", {
              class: normalizeClass([{ "flex-row-reverse": rtlEnabled.value }, "relative h-[37px] w-[250px] px-4 flex items-center border-b dark:border-gray-600"])
            }, [
              createBaseVNode("div", {
                class: normalizeClass([{ "hidden": rtlEnabled.value }, "pointer-events-none flex no-shrink items-center"]),
                style: { "-webkit-app-region": "drag", "min-width": "30px" }
              }, _hoisted_5$2, 2),
              !rtlEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_6$2, [
                createBaseVNode("div", {
                  onContextmenu: withModifiers(showContextMenu, ["prevent"]),
                  onClick: _cache[0] || (_cache[0] = ($event) => showMailboxPicker.value = !showMailboxPicker.value),
                  class: "flex h-full items-center space-x-2 mt-1 dark:text-white"
                }, [
                  createBaseVNode("span", _hoisted_7$2, toDisplayString(selectedMailbox.value.mailbox), 1),
                  mailboxes.value.length > 1 ? (openBlock(), createElementBlock("span", _hoisted_8$2, " ")) : createCommentVNode("", true)
                ], 32),
                showMailboxPicker.value && mailboxes.value.length > 1 ? (openBlock(), createElementBlock("div", _hoisted_9$2, [
                  createBaseVNode("div", _hoisted_10$1, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(mailboxes.value, (mailbox) => {
                      return openBlock(), createElementBlock("div", {
                        key: mailbox.mailbox,
                        onClick: withModifiers(($event) => selectMailbox(mailbox), ["stop"]),
                        class: "hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-2 py-1 flex items-center"
                      }, toDisplayString(mailbox.mailbox), 9, _hoisted_11$1);
                    }), 128))
                  ])
                ])) : createCommentVNode("", true)
              ])) : createCommentVNode("", true)
            ], 2),
            rtlEnabled.value ? (openBlock(), createElementBlock("div", _hoisted_12$1, [
              createBaseVNode("div", {
                onContextmenu: withModifiers(showContextMenu, ["prevent"]),
                onClick: _cache[1] || (_cache[1] = ($event) => showMailboxPicker.value = !showMailboxPicker.value),
                class: "flex h-full items-center space-x-2 dark:text-white"
              }, [
                createBaseVNode("span", _hoisted_13$1, toDisplayString(selectedMailbox.value.mailbox), 1),
                mailboxes.value.length > 1 ? (openBlock(), createElementBlock("span", _hoisted_14$1, " ")) : createCommentVNode("", true)
              ], 32),
              showMailboxPicker.value && mailboxes.value.length > 1 ? (openBlock(), createElementBlock("div", _hoisted_15$1, [
                createBaseVNode("div", _hoisted_16$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(mailboxes.value, (mailbox) => {
                    return openBlock(), createElementBlock("div", {
                      key: mailbox.mailbox,
                      onClick: withModifiers(($event) => selectMailbox(mailbox), ["stop"]),
                      class: "hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sm px-2 py-1 flex items-center"
                    }, toDisplayString(mailbox.mailbox), 9, _hoisted_17$1);
                  }), 128))
                ])
              ])) : createCommentVNode("", true)
            ])) : createCommentVNode("", true),
            createBaseVNode("ul", _hoisted_18$1, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(mails.value, (mail) => {
                return openBlock(), createElementBlock("li", {
                  onClick: ($event) => unref(router2).replace({ name: "mail", params: { id: mail.id } }),
                  onContextmenu: withModifiers(($event) => showMailContextMenu(mail.id), ["prevent"]),
                  key: mail.id,
                  class: normalizeClass([{
                    "bg-gray-100 dark:bg-gray-700": mail.id == activeMail.value,
                    "hover:bg-gray-50 dark:hover:bg-gray-800": mail.id != activeMail.value
                  }, "rounded-sm px-4 py-3 group"])
                }, [
                  createBaseVNode("div", _hoisted_20$1, [
                    createBaseVNode("div", _hoisted_21$1, [
                      createBaseVNode("span", null, toDisplayString(mail.mail_addresses[0]?.address), 1),
                      createBaseVNode("span", {
                        title: mail.subject,
                        class: "max-w-[130px] overflow-hidden truncate"
                      }, toDisplayString(mail.subject), 9, _hoisted_22$1)
                    ]),
                    createBaseVNode("span", {
                      class: "inline-block",
                      title: mail.date
                    }, toDisplayString(relativeDate(mail.date)), 9, _hoisted_23$1)
                  ])
                ], 42, _hoisted_19$1);
              }), 128))
            ])
          ]),
          createBaseVNode("div", _hoisted_24$1, [
            createBaseVNode("div", _hoisted_25$1, [
              createBaseVNode("div", {
                class: normalizeClass([{ "flex": rtlEnabled.value, "hidden": !rtlEnabled.value }, "pointer-events-none no-shrink items-center"]),
                style: { "-webkit-app-region": "drag", "min-width": "30px" }
              }, _hoisted_27$1, 2)
            ]),
            createBaseVNode("div", _hoisted_28$1, [
              createBaseVNode("div", _hoisted_29$1, [
                mailboxes.value.length > 0 ? (openBlock(), createBlock(_component_router_view, { key: 0 })) : createCommentVNode("", true)
              ])
            ])
          ])
        ])) : createCommentVNode("", true),
        !loading.value && mailboxes.value.length <= 0 ? (openBlock(), createBlock(_sfc_main$3, { key: 1 })) : createCommentVNode("", true)
      ]);
    };
  }
});
const _hoisted_1$1 = { class: "flex items-center h-16 space-x-4" };
const _hoisted_2$1 = /* @__PURE__ */ createBaseVNode("span", { class: "pt-2" }, "Content", -1);
const _hoisted_3$1 = [
  _hoisted_2$1
];
const _hoisted_4$1 = /* @__PURE__ */ createBaseVNode("span", { class: "pt-2" }, "Headers", -1);
const _hoisted_5$1 = [
  _hoisted_4$1
];
const _hoisted_6$1 = /* @__PURE__ */ createBaseVNode("span", { class: "pt-2" }, "Text", -1);
const _hoisted_7$1 = [
  _hoisted_6$1
];
const _hoisted_8$1 = /* @__PURE__ */ createBaseVNode("span", { class: "pt-2" }, "Raw", -1);
const _hoisted_9$1 = [
  _hoisted_8$1
];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "Tabs",
  props: {
    activeTab: {
      type: String,
      required: true
    }
  },
  emits: ["clicked"],
  setup(__props, { emit: __emit }) {
    const emit = __emit;
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", {
          onClick: _cache[0] || (_cache[0] = ($event) => emit("clicked", "content")),
          class: normalizeClass([{
            "border-b-4 border-onboarding-red font-medium": __props.activeTab === "content",
            "border-b-4 border-transparent hover:border-gray-200 dark:hover:border-gray-500": __props.activeTab !== "content"
          }, "flex h-full items-center border-b-4"])
        }, _hoisted_3$1, 2),
        createBaseVNode("div", {
          onClick: _cache[1] || (_cache[1] = ($event) => emit("clicked", "headers")),
          class: normalizeClass([{
            "border-b-4 border-onboarding-red font-medium": __props.activeTab === "headers",
            "border-b-4 border-transparent hover:border-gray-200 dark:hover:border-gray-500": __props.activeTab !== "headers"
          }, "flex h-full items-center border-b-4"])
        }, _hoisted_5$1, 2),
        createBaseVNode("div", {
          onClick: _cache[2] || (_cache[2] = ($event) => emit("clicked", "text")),
          class: normalizeClass([{
            "border-b-4 border-onboarding-red font-medium": __props.activeTab === "text",
            "border-b-4 border-transparent hover:border-gray-200 dark:hover:border-gray-500": __props.activeTab !== "text"
          }, "flex h-full items-center border-b-4"])
        }, _hoisted_7$1, 2),
        createBaseVNode("div", {
          onClick: _cache[3] || (_cache[3] = ($event) => emit("clicked", "raw")),
          class: normalizeClass([{
            "border-b-4 border-onboarding-red font-medium": __props.activeTab === "raw",
            "border-b-4 border-transparent hover:border-gray-200 dark:hover:border-gray-500": __props.activeTab !== "raw"
          }, "flex h-full items-center border-b-4"])
        }, _hoisted_9$1, 2)
      ]);
    };
  }
});
const _hoisted_1 = { class: "h-full overflow-hidden w-full flex flex-col dark:bg-gray-900 dark:text-white" };
const _hoisted_2 = { class: "border-b lg:border-gray-200 dark:lg:border-gray-600 items-center flex justify-between px-4" };
const _hoisted_3 = { class: "text-lg font-bold pr-4 truncate h-16 inline-flex items-center mr-4" };
const _hoisted_4 = { class: "truncate pt-1" };
const _hoisted_5 = { class: "px-4 py-4 grid grid-cols-12 gap-2 dark:bg-gray-900" };
const _hoisted_6 = /* @__PURE__ */ createBaseVNode("span", { class: "col-span-1" }, "From:", -1);
const _hoisted_7 = { class: "col-span-11" };
const _hoisted_8 = { class: "text-gray-700 dark:text-gray-200" };
const _hoisted_9 = /* @__PURE__ */ createBaseVNode("span", { class: "col-span-1" }, "To:", -1);
const _hoisted_10 = { class: "col-span-11" };
const _hoisted_11 = {
  key: 0,
  class: "text-gray-400 dark:text-gray-200 font-mono"
};
const _hoisted_12 = { class: "text-gray-700 dark:text-gray-200" };
const _hoisted_13 = {
  key: 2,
  class: "text-gray-700 dark:text-gray-200"
};
const _hoisted_14 = /* @__PURE__ */ createBaseVNode("span", { class: "col-span-1" }, "CC:", -1);
const _hoisted_15 = { class: "col-span-11" };
const _hoisted_16 = /* @__PURE__ */ createBaseVNode("span", { class: "col-span-1" }, "Files:", -1);
const _hoisted_17 = { class: "col-span-11 grid gap-x-4 gap-y-2 grid-cols-1" };
const _hoisted_18 = ["onClick"];
const _hoisted_19 = { class: "flex items-center space-x-1" };
const _hoisted_20 = /* @__PURE__ */ createBaseVNode("span", { class: "font-icon" }, "", -1);
const _hoisted_21 = { class: "font-mono pt-0.5" };
const _hoisted_22 = ["srcdoc"];
const _hoisted_23 = {
  key: 1,
  class: "p-4"
};
const _hoisted_24 = { class: "w-full rounded-md overflow-hidden" };
const _hoisted_25 = /* @__PURE__ */ createBaseVNode("thead", null, [
  /* @__PURE__ */ createBaseVNode("tr", { class: "text-left dark:bg-gray-800 h-10 p-1" }, [
    /* @__PURE__ */ createBaseVNode("th", { class: "px-3.5 font-normal text-onboarding-gray dark:text-gray-400" }, "Key"),
    /* @__PURE__ */ createBaseVNode("th", { class: "font-normal text-onboarding-gray dark:text-gray-400" }, "Value")
  ])
], -1);
const _hoisted_26 = { class: "px-3.5" };
const _hoisted_27 = {
  key: 2,
  class: "p-4 w-full overflow-x-hidden"
};
const _hoisted_28 = { class: "rounded-md overflow-hidden" };
const _hoisted_29 = ["textContent"];
const _hoisted_30 = {
  key: 3,
  class: "p-4 w-full overflow-x-hidden"
};
const _hoisted_31 = { class: "rounded-md overflow-hidden" };
const _hoisted_32 = ["textContent"];
const iframeJS = `!function(d){if("undefined"!=typeof window){var n=!0,o=10,i="",r=0,a="",t=null,u="",c=!1,s={resize:1,click:1},l=128,f=!0,m=1,h="bodyOffset",g=h,p=!0,v="",y={},b=32,w=null,T=!1,E="[iFrameSizer]",O=E.length,S="",M={max:1,min:1,bodyScroll:1,documentElementScroll:1},I="child",N=!0,A=window.parent,C="*",z=0,k=!1,e=null,R=16,x=1,L="scroll",F=L,P=window,D=function(){re("onMessage function not defined")},j=function(){},q=function(){},H={height:function(){return re("Custom height calculation function not defined"),document.documentElement.offsetHeight},width:function(){return re("Custom width calculation function not defined"),document.body.scrollWidth}},W={},B=!1;try{var J=Object.create({},{passive:{get:function(){B=!0}}});window.addEventListener("test",ee,J),window.removeEventListener("test",ee,J)}catch(e){}var U,V,K,Q,X,Y,G=Date.now||function(){return(new Date).getTime()},Z={bodyOffset:function(){return document.body.offsetHeight+pe("marginTop")+pe("marginBottom")},offset:function(){return Z.bodyOffset()},bodyScroll:function(){return document.body.scrollHeight},custom:function(){return H.height()},documentElementOffset:function(){return document.documentElement.offsetHeight},documentElementScroll:function(){return document.documentElement.scrollHeight},max:function(){return Math.max.apply(null,ye(Z))},min:function(){return Math.min.apply(null,ye(Z))},grow:function(){return Z.max()},lowestElement:function(){return Math.max(Z.bodyOffset()||Z.documentElementOffset(),ve("bottom",we()))},taggedElement:function(){return be("bottom","data-iframe-height")}},$={bodyScroll:function(){return document.body.scrollWidth},bodyOffset:function(){return document.body.offsetWidth},custom:function(){return H.width()},documentElementScroll:function(){return document.documentElement.scrollWidth},documentElementOffset:function(){return document.documentElement.offsetWidth},scroll:function(){return Math.max($.bodyScroll(),$.documentElementScroll())},max:function(){return Math.max.apply(null,ye($))},min:function(){return Math.min.apply(null,ye($))},rightMostElement:function(){return ve("right",we())},taggedElement:function(){return be("right","data-iframe-width")}},_=(U=Te,X=null,Y=0,function(){var e=G(),t=R-(e-(Y=Y||e));return V=this,K=arguments,t<=0||R<t?(X&&(clearTimeout(X),X=null),Y=e,Q=U.apply(V,K),X||(V=K=null)):X=X||setTimeout(Ee,t),Q});te(window,"message",function(t){var n={init:function(){v=t.data,A=t.source,ae(),f=!1,setTimeout(function(){p=!1},l)},reset:function(){p?ie("Page reset ignored by init"):(ie("Page size reset by host page"),Me("resetPage"))},resize:function(){Oe("resizeParent","Parent window requested size check")},moveToAnchor:function(){y.findTarget(i())},inPageLink:function(){this.moveToAnchor()},pageInfo:function(){var e=i();ie("PageInfoFromParent called from parent: "+e),q(JSON.parse(e)),ie(" --")},message:function(){var e=i();ie("onMessage called from parent: "+e),D(JSON.parse(e)),ie(" --")}};function o(){return t.data.split("]")[1].split(":")[0]}function i(){return t.data.substr(t.data.indexOf(":")+1)}function r(){return t.data.split(":")[2]in{true:1,false:1}}function e(){var e=o();e in n?n[e]():("undefined"==typeof module||!module.exports)&&"iFrameResize"in window||"jQuery"in window&&"iFrameResize"in window.jQuery.prototype||r()||re("Unexpected message ("+t.data+")")}E===(""+t.data).substr(0,O)&&(!1===f?e():r()?n.init():ie('Ignored message of type "'+o()+'". Received before initialization.'))}),te(window,"readystatechange",Ae),Ae()}function ee(){}function te(e,t,n,o){e.addEventListener(t,n,!!B&&(o||{}))}function ne(e){return e.charAt(0).toUpperCase()+e.slice(1)}function oe(e){return E+"["+S+"] "+e}function ie(e){T&&"object"==typeof window.console&&console.log(oe(e))}function re(e){"object"==typeof window.console&&console.warn(oe(e))}function ae(){!function(){function e(e){return"true"===e}var t=v.substr(O).split(":");S=t[0],r=d!==t[1]?Number(t[1]):r,c=d!==t[2]?e(t[2]):c,T=d!==t[3]?e(t[3]):T,b=d!==t[4]?Number(t[4]):b,n=d!==t[6]?e(t[6]):n,a=t[7],g=d!==t[8]?t[8]:g,i=t[9],u=t[10],z=d!==t[11]?Number(t[11]):z,y.enable=d!==t[12]&&e(t[12]),I=d!==t[13]?t[13]:I,F=d!==t[14]?t[14]:F}(),ie("Initialising iFrame ("+location.href+")"),function(){function e(e,t){return"function"==typeof e&&(ie("Setup custom "+t+"CalcMethod"),H[t]=e,e="custom"),e}"iFrameResizer"in window&&Object===window.iFrameResizer.constructor&&(function(){var e=window.iFrameResizer;ie("Reading data from page: "+JSON.stringify(e)),Object.keys(e).forEach(ue,e),D="onMessage"in e?e.onMessage:D,j="onReady"in e?e.onReady:j,C="targetOrigin"in e?e.targetOrigin:C,g="heightCalculationMethod"in e?e.heightCalculationMethod:g,F="widthCalculationMethod"in e?e.widthCalculationMethod:F}(),g=e(g,"height"),F=e(F,"width"));ie("TargetOrigin for parent set to: "+C)}(),function(){d===a&&(a=r+"px");ce("margin",function(e,t){-1!==t.indexOf("-")&&(re("Negative CSS value ignored for "+e),t="");return t}("margin",a))}(),ce("background",i),ce("padding",u),function(){var e=document.createElement("div");e.style.clear="both",e.style.display="block",e.style.height="0",document.body.appendChild(e)}(),fe(),me(),document.documentElement.style.height="",document.body.style.height="",ie('HTML & body height set to "auto"'),ie("Enable public methods"),P.parentIFrame={autoResize:function(e){return!0===e&&!1===n?(n=!0,he()):!1===e&&!0===n&&(n=!1,de("remove"),null!==t&&t.disconnect(),clearInterval(w)),Ne(0,0,"autoResize",JSON.stringify(n)),n},close:function(){Ne(0,0,"close")},getId:function(){return S},getPageInfo:function(e){"function"==typeof e?(q=e,Ne(0,0,"pageInfo")):(q=function(){},Ne(0,0,"pageInfoStop"))},moveToAnchor:function(e){y.findTarget(e)},reset:function(){Ie("parentIFrame.reset")},scrollTo:function(e,t){Ne(t,e,"scrollTo")},scrollToOffset:function(e,t){Ne(t,e,"scrollToOffset")},sendMessage:function(e,t){Ne(0,0,"message",JSON.stringify(e),t)},setHeightCalculationMethod:function(e){g=e,fe()},setWidthCalculationMethod:function(e){F=e,me()},setTargetOrigin:function(e){ie("Set targetOrigin: "+e),C=e},size:function(e,t){Oe("size","parentIFrame.size("+((e||"")+(t?","+t:""))+")",e,t)}},he(),y=function(){function r(e){var t=e.getBoundingClientRect(),n={x:window.pageXOffset!==d?window.pageXOffset:document.documentElement.scrollLeft,y:window.pageYOffset!==d?window.pageYOffset:document.documentElement.scrollTop};return{x:parseInt(t.left,10)+parseInt(n.x,10),y:parseInt(t.top,10)+parseInt(n.y,10)}}function t(e){var t,n=e.split("#")[1]||e,o=decodeURIComponent(n),i=document.getElementById(o)||document.getElementsByName(o)[0];d!==i?(t=r(i),ie("Moving to in page link (#"+n+") at x: "+t.x+" y: "+t.y),Ne(t.y,t.x,"scrollToOffset")):(ie("In page link (#"+n+") not found in iFrame, so sending to parent"),Ne(0,0,"inPageLink","#"+n))}function e(){""!==location.hash&&"#"!==location.hash&&t(location.href)}function n(){Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'),function(e){"#"!==e.getAttribute("href")&&te(e,"click",function(e){e.preventDefault(),t(this.getAttribute("href"))})})}y.enable?Array.prototype.forEach&&document.querySelectorAll?(ie("Setting up location.hash handlers"),n(),te(window,"hashchange",e),setTimeout(e,l)):re("In page linking not fully supported in this browser! (See README.md for IE8 workaround)"):ie("In page linking not enabled");return{findTarget:t}}(),Oe("init","Init message from host page"),j()}function ue(e){var t=e.split("Callback");if(2===t.length){var n="on"+t[0].charAt(0).toUpperCase()+t[0].slice(1);this[n]=this[e],delete this[e],re("Deprecated: '"+e+"' has been renamed '"+n+"'. The old method will be removed in the next major version.")}}function ce(e,t){d!==t&&""!==t&&"null"!==t&&ie("Body "+e+' set to "'+(document.body.style[e]=t)+'"')}function se(n){var e={add:function(e){function t(){Oe(n.eventName,n.eventType)}W[e]=t,te(window,e,t,{passive:!0})},remove:function(e){var t=W[e];delete W[e],function(e,t,n){e.removeEventListener(t,n,!1)}(window,e,t)}};n.eventNames&&Array.prototype.map?(n.eventName=n.eventNames[0],n.eventNames.map(e[n.method])):e[n.method](n.eventName),ie(ne(n.method)+" event listener: "+n.eventType)}function de(e){se({method:e,eventType:"Animation Start",eventNames:["animationstart","webkitAnimationStart"]}),se({method:e,eventType:"Animation Iteration",eventNames:["animationiteration","webkitAnimationIteration"]}),se({method:e,eventType:"Animation End",eventNames:["animationend","webkitAnimationEnd"]}),se({method:e,eventType:"Input",eventName:"input"}),se({method:e,eventType:"Mouse Up",eventName:"mouseup"}),se({method:e,eventType:"Mouse Down",eventName:"mousedown"}),se({method:e,eventType:"Orientation Change",eventName:"orientationchange"}),se({method:e,eventType:"Print",eventName:["afterprint","beforeprint"]}),se({method:e,eventType:"Ready State Change",eventName:"readystatechange"}),se({method:e,eventType:"Touch Start",eventName:"touchstart"}),se({method:e,eventType:"Touch End",eventName:"touchend"}),se({method:e,eventType:"Touch Cancel",eventName:"touchcancel"}),se({method:e,eventType:"Transition Start",eventNames:["transitionstart","webkitTransitionStart","MSTransitionStart","oTransitionStart","otransitionstart"]}),se({method:e,eventType:"Transition Iteration",eventNames:["transitioniteration","webkitTransitionIteration","MSTransitionIteration","oTransitionIteration","otransitioniteration"]}),se({method:e,eventType:"Transition End",eventNames:["transitionend","webkitTransitionEnd","MSTransitionEnd","oTransitionEnd","otransitionend"]}),"child"===I&&se({method:e,eventType:"IFrame Resized",eventName:"resize"})}function le(e,t,n,o){return t!==e&&(e in n||(re(e+" is not a valid option for "+o+"CalculationMethod."),e=t),ie(o+' calculation method set to "'+e+'"')),e}function fe(){g=le(g,h,Z,"height")}function me(){F=le(F,L,$,"width")}function he(){!0===n?(de("add"),function(){var e=b<0;window.MutationObserver||window.WebKitMutationObserver?e?ge():t=function(){function t(e){function t(e){!1===e.complete&&(ie("Attach listeners to "+e.src),e.addEventListener("load",i,!1),e.addEventListener("error",r,!1),u.push(e))}"attributes"===e.type&&"src"===e.attributeName?t(e.target):"childList"===e.type&&Array.prototype.forEach.call(e.target.querySelectorAll("img"),t)}function o(e){ie("Remove listeners from "+e.src),e.removeEventListener("load",i,!1),e.removeEventListener("error",r,!1),function(e){u.splice(u.indexOf(e),1)}(e)}function n(e,t,n){o(e.target),Oe(t,n+": "+e.target.src,d,d)}function i(e){n(e,"imageLoad","Image loaded")}function r(e){n(e,"imageLoadFailed","Image load failed")}function a(e){Oe("mutationObserver","mutationObserver: "+e[0].target+" "+e[0].type),e.forEach(t)}var u=[],c=window.MutationObserver||window.WebKitMutationObserver,s=function(){var e=document.querySelector("body");return s=new c(a),ie("Create body MutationObserver"),s.observe(e,{attributes:!0,attributeOldValue:!1,characterData:!0,characterDataOldValue:!1,childList:!0,subtree:!0}),s}();return{disconnect:function(){"disconnect"in s&&(ie("Disconnect body MutationObserver"),s.disconnect(),u.forEach(o))}}}():(ie("MutationObserver not supported in this browser!"),ge())}()):ie("Auto Resize disabled")}function ge(){0!==b&&(ie("setInterval: "+b+"ms"),w=setInterval(function(){Oe("interval","setInterval: "+b)},Math.abs(b)))}function pe(e,t){var n=0;return t=t||document.body,n=null!==(n=document.defaultView.getComputedStyle(t,null))?n[e]:0,parseInt(n,o)}function ve(e,t){for(var n=t.length,o=0,i=0,r=ne(e),a=G(),u=0;u<n;u++)i<(o=t[u].getBoundingClientRect()[e]+pe("margin"+r,t[u]))&&(i=o);return a=G()-a,ie("Parsed "+n+" HTML elements"),ie("Element position calculated in "+a+"ms"),function(e){R/2<e&&ie("Event throttle increased to "+(R=2*e)+"ms")}(a),i}function ye(e){return[e.bodyOffset(),e.bodyScroll(),e.documentElementOffset(),e.documentElementScroll()]}function be(e,t){var n=document.querySelectorAll("["+t+"]");return 0===n.length&&(re("No tagged elements ("+t+") found on page"),document.querySelectorAll("body *")),ve(e,n)}function we(){return document.querySelectorAll("body *")}function Te(e,t,n,o){var i,r;function a(e,t){return!(Math.abs(e-t)<=z)}i=d!==n?n:Z[g](),r=d!==o?o:$[F](),a(m,i)||c&&a(x,r)||"init"===e?(Se(),Ne(m=i,x=r,e)):e in{init:1,interval:1,size:1}||!(g in M||c&&F in M)?e in{interval:1}||ie("No change in size detected"):Ie(t)}function Ee(){Y=G(),X=null,Q=U.apply(V,K),X||(V=K=null)}function Oe(e,t,n,o){k&&e in s?ie("Trigger event cancelled: "+e):(e in{reset:1,resetPage:1,init:1}||ie("Trigger event: "+t),"init"===e?Te(e,t,n,o):_(e,t,n,o))}function Se(){k||(k=!0,ie("Trigger event lock on")),clearTimeout(e),e=setTimeout(function(){k=!1,ie("Trigger event lock off"),ie("--")},l)}function Me(e){m=Z[g](),x=$[F](),Ne(m,x,e)}function Ie(e){var t=g;g=h,ie("Reset trigger event: "+e),Se(),Me("reset"),g=t}function Ne(e,t,n,o,i){var r;!0===N&&(d===i?i=C:ie("Message targetOrigin: "+i),ie("Sending message to host page ("+(r=S+":"+(e+":"+t)+":"+n+(d!==o?":"+o:""))+")"),A.postMessage(E+r,i))}function Ae(){"loading"!==document.readyState&&window.parent.postMessage("[iFrameResizerChild]Ready","*")}}();`;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "Mail",
  setup(__props) {
    const route = useRoute();
    const mail = ref({});
    const iframe = ref(null);
    const activeTab = ref("content");
    watch(() => route.params.id, async (id) => {
      mail.value = await window.api.mails.mail(id);
    });
    onMounted(async () => {
      mail.value = await window.api.mails.mail(route.params.id);
    });
    const sender = computed(() => {
      return mail.value.mail_addresses?.find((address) => address.type === "sender") ?? {};
    });
    const recipients = computed(() => {
      return mail.value.mail_addresses?.filter((address) => address.type === "recipient") ?? [];
    });
    const recipientsCC = computed(() => {
      return mail.value.mail_addresses?.filter((address) => address.type === "recipientCC") ?? [];
    });
    const modifyLinks = () => {
      const links = iframe.value.contentDocument.getElementsByTagName("a");
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        link.addEventListener("click", (event) => {
          event.preventDefault();
          window.api.openURL(link.href);
        });
      }
    };
    const openAttachment = (attachment) => {
      window.api.system.openPath(attachment.stored_filename);
    };
    const injectIframeJS = (originalHtml) => {
      return `<script>${iframeJS}<\/script>${originalHtml}`;
    };
    const filesize = (bytes) => {
      const thresh = 1e3;
      if (Math.abs(bytes) < thresh) {
        return bytes + " B";
      }
      const units = ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
      let u = -1;
      do {
        bytes /= thresh;
        ++u;
      } while (Math.abs(bytes) >= thresh && u < units.length - 1);
      return bytes.toFixed(1) + " " + units[u];
    };
    return (_ctx, _cache) => {
      const _directive_resize = resolveDirective("resize");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createBaseVNode("span", _hoisted_3, [
            createBaseVNode("span", _hoisted_4, toDisplayString(mail.value.subject), 1)
          ]),
          createVNode(_sfc_main$1, {
            onClicked: _cache[0] || (_cache[0] = ($event) => activeTab.value = $event),
            activeTab: activeTab.value,
            class: "hidden lg:flex"
          }, null, 8, ["activeTab"])
        ]),
        createBaseVNode("div", {
          class: normalizeClass(["flex-1 overflow-y-auto overflow-x-hidden", { "bg-white": activeTab.value === "content" }])
        }, [
          createVNode(_sfc_main$1, {
            onClicked: _cache[1] || (_cache[1] = ($event) => activeTab.value = $event),
            activeTab: activeTab.value,
            class: "lg:hidden px-6 border-b border-gray-200"
          }, null, 8, ["activeTab"]),
          activeTab.value === "content" ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
            createBaseVNode("div", _hoisted_5, [
              _hoisted_6,
              createBaseVNode("span", _hoisted_7, [
                createTextVNode(toDisplayString(sender.value.name) + " ", 1),
                createBaseVNode("span", _hoisted_8, "<" + toDisplayString(sender.value.address) + ">", 1)
              ]),
              _hoisted_9,
              createBaseVNode("span", _hoisted_10, [
                recipients.value.length === 0 ? (openBlock(), createElementBlock("span", _hoisted_11, "No To-Header")) : createCommentVNode("", true),
                (openBlock(true), createElementBlock(Fragment, null, renderList(recipients.value, (recipient, index) => {
                  return openBlock(), createElementBlock(Fragment, {
                    key: recipient.address
                  }, [
                    index > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                      createTextVNode(",")
                    ], 64)) : createCommentVNode("", true),
                    recipient.name !== "" ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                      createTextVNode(toDisplayString(recipient.name) + " ", 1),
                      createBaseVNode("span", _hoisted_12, "<" + toDisplayString(recipient.address) + ">", 1)
                    ], 64)) : (openBlock(), createElementBlock("span", _hoisted_13, toDisplayString(recipient.address), 1))
                  ], 64);
                }), 128))
              ]),
              recipientsCC.value.length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                _hoisted_14,
                createBaseVNode("span", _hoisted_15, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(recipientsCC.value, (recipient, index) => {
                    return openBlock(), createElementBlock("span", {
                      key: recipient.address,
                      class: "text-gray-700 dark:text-gray-200"
                    }, toDisplayString(recipient.address), 1);
                  }), 128))
                ])
              ], 64)) : createCommentVNode("", true),
              mail.value.mail_attachments && mail.value.mail_attachments.length > 0 ? (openBlock(), createElementBlock(Fragment, { key: 1 }, [
                _hoisted_16,
                createBaseVNode("span", _hoisted_17, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(mail.value.mail_attachments, (attachment) => {
                    return openBlock(), createElementBlock("div", {
                      key: attachment.id,
                      onClick: ($event) => openAttachment(attachment),
                      class: "flex justify-between"
                    }, [
                      createBaseVNode("div", _hoisted_19, [
                        _hoisted_20,
                        createBaseVNode("span", _hoisted_21, toDisplayString(attachment.filename), 1)
                      ]),
                      createTextVNode(" " + toDisplayString(filesize(attachment.size)), 1)
                    ], 8, _hoisted_18);
                  }), 128))
                ])
              ], 64)) : createCommentVNode("", true)
            ]),
            withDirectives(createBaseVNode("iframe", {
              onLoad: modifyLinks,
              ref_key: "iframe",
              ref: iframe,
              frameborder: "0",
              class: "w-full h-full",
              srcdoc: injectIframeJS(mail.value.html)
            }, null, 40, _hoisted_22), [
              [_directive_resize]
            ])
          ], 64)) : createCommentVNode("", true),
          activeTab.value === "headers" ? (openBlock(), createElementBlock("div", _hoisted_23, [
            createBaseVNode("table", _hoisted_24, [
              _hoisted_25,
              createBaseVNode("tbody", null, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(mail.value.mail_headers, (header, index) => {
                  return openBlock(), createElementBlock("tr", {
                    class: normalizeClass(["p-1 h-10 select-text", index % 2 === 0 ? "bg-white dark:bg-gray-700" : "bg-gray-50 dark:bg-gray-800"]),
                    key: header.id
                  }, [
                    createBaseVNode("td", _hoisted_26, toDisplayString(header.key), 1),
                    createBaseVNode("td", null, toDisplayString(header.line), 1)
                  ], 2);
                }), 128))
              ])
            ])
          ])) : createCommentVNode("", true),
          activeTab.value === "text" ? (openBlock(), createElementBlock("div", _hoisted_27, [
            createBaseVNode("div", _hoisted_28, [
              createBaseVNode("pre", {
                class: "select-text bg-gray-100 dark:bg-gray-800 p-4 w-full overflow-x-auto",
                textContent: toDisplayString(mail.value.text)
              }, null, 8, _hoisted_29)
            ])
          ])) : createCommentVNode("", true),
          activeTab.value === "raw" ? (openBlock(), createElementBlock("div", _hoisted_30, [
            createBaseVNode("div", _hoisted_31, [
              createBaseVNode("pre", {
                class: "select-text bg-gray-100 dark:bg-gray-800 p-4 w-full overflow-x-auto",
                textContent: toDisplayString(mail.value.raw)
              }, null, 8, _hoisted_32)
            ])
          ])) : createCommentVNode("", true)
        ], 2)
      ]);
    };
  }
});
const routes = [
  {
    path: "/mails/:id",
    component: _sfc_main,
    name: "mail"
  }
];
const router = createRouter({
  history: createWebHashHistory(),
  routes
});
const resize = {
  mounted(el) {
    el.addEventListener("load", () => iFrameResize({
      heightCalculationMethod: "lowestElement",
      log: false,
      checkOrigin: false,
      inPageLinks: true
    }, el));
  }
};
createApp(_sfc_main$2).use(router).use(xt, {
  themes: {
    winui: {
      "$extend": "tooltip",
      triggers: ["click", "hover", "focus"]
    }
  }
}).directive("resize", resize).mount("#app");
