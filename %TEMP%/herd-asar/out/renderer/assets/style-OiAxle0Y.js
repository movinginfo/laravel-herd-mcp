import { d as defineComponent, C as pushScopeId, D as popScopeId, K as nextTick, o as openBlock, l as createBlock, R as withScopeId, v as resolveComponent, c as createElementBlock, e as createBaseVNode, F as Fragment, r as renderSlot, f as createCommentVNode, A as normalizeStyle, n as normalizeClass, m as withKeys, w as withCtx, g as createVNode, S as normalizeProps, U as guardReactiveProps, a as ref, q as createApp, P as h$1, t as toDisplayString, V as mergeProps } from "./runtime-dom.esm-bundler-D2sOG0lg.js";
const sides = ["top", "right", "bottom", "left"];
const alignments = ["start", "end"];
const placements = /* @__PURE__ */ sides.reduce((acc, side) => acc.concat(side, side + "-" + alignments[0], side + "-" + alignments[1]), []);
const min = Math.min;
const max = Math.max;
const oppositeSideMap = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
};
const oppositeAlignmentMap = {
  start: "end",
  end: "start"
};
function clamp(start, value, end) {
  return max(start, min(value, end));
}
function evaluate(value, param) {
  return typeof value === "function" ? value(param) : value;
}
function getSide(placement) {
  return placement.split("-")[0];
}
function getAlignment(placement) {
  return placement.split("-")[1];
}
function getOppositeAxis(axis) {
  return axis === "x" ? "y" : "x";
}
function getAxisLength(axis) {
  return axis === "y" ? "height" : "width";
}
function getSideAxis(placement) {
  return ["top", "bottom"].includes(getSide(placement)) ? "y" : "x";
}
function getAlignmentAxis(placement) {
  return getOppositeAxis(getSideAxis(placement));
}
function getAlignmentSides(placement, rects, rtl) {
  if (rtl === void 0) {
    rtl = false;
  }
  const alignment = getAlignment(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const length = getAxisLength(alignmentAxis);
  let mainAlignmentSide = alignmentAxis === "x" ? alignment === (rtl ? "end" : "start") ? "right" : "left" : alignment === "start" ? "bottom" : "top";
  if (rects.reference[length] > rects.floating[length]) {
    mainAlignmentSide = getOppositePlacement(mainAlignmentSide);
  }
  return [mainAlignmentSide, getOppositePlacement(mainAlignmentSide)];
}
function getExpandedPlacements(placement) {
  const oppositePlacement = getOppositePlacement(placement);
  return [getOppositeAlignmentPlacement(placement), oppositePlacement, getOppositeAlignmentPlacement(oppositePlacement)];
}
function getOppositeAlignmentPlacement(placement) {
  return placement.replace(/start|end/g, (alignment) => oppositeAlignmentMap[alignment]);
}
function getSideList(side, isStart, rtl) {
  const lr = ["left", "right"];
  const rl = ["right", "left"];
  const tb = ["top", "bottom"];
  const bt2 = ["bottom", "top"];
  switch (side) {
    case "top":
    case "bottom":
      if (rtl)
        return isStart ? rl : lr;
      return isStart ? lr : rl;
    case "left":
    case "right":
      return isStart ? tb : bt2;
    default:
      return [];
  }
}
function getOppositeAxisPlacements(placement, flipAlignment, direction, rtl) {
  const alignment = getAlignment(placement);
  let list = getSideList(getSide(placement), direction === "start", rtl);
  if (alignment) {
    list = list.map((side) => side + "-" + alignment);
    if (flipAlignment) {
      list = list.concat(list.map(getOppositeAlignmentPlacement));
    }
  }
  return list;
}
function getOppositePlacement(placement) {
  return placement.replace(/left|right|bottom|top/g, (side) => oppositeSideMap[side]);
}
function expandPaddingObject(padding) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...padding
  };
}
function getPaddingObject(padding) {
  return typeof padding !== "number" ? expandPaddingObject(padding) : {
    top: padding,
    right: padding,
    bottom: padding,
    left: padding
  };
}
function rectToClientRect(rect) {
  return {
    ...rect,
    top: rect.y,
    left: rect.x,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height
  };
}
function computeCoordsFromPlacement(_ref, placement, rtl) {
  let {
    reference,
    floating
  } = _ref;
  const sideAxis = getSideAxis(placement);
  const alignmentAxis = getAlignmentAxis(placement);
  const alignLength = getAxisLength(alignmentAxis);
  const side = getSide(placement);
  const isVertical = sideAxis === "y";
  const commonX = reference.x + reference.width / 2 - floating.width / 2;
  const commonY = reference.y + reference.height / 2 - floating.height / 2;
  const commonAlign = reference[alignLength] / 2 - floating[alignLength] / 2;
  let coords;
  switch (side) {
    case "top":
      coords = {
        x: commonX,
        y: reference.y - floating.height
      };
      break;
    case "bottom":
      coords = {
        x: commonX,
        y: reference.y + reference.height
      };
      break;
    case "right":
      coords = {
        x: reference.x + reference.width,
        y: commonY
      };
      break;
    case "left":
      coords = {
        x: reference.x - floating.width,
        y: commonY
      };
      break;
    default:
      coords = {
        x: reference.x,
        y: reference.y
      };
  }
  switch (getAlignment(placement)) {
    case "start":
      coords[alignmentAxis] -= commonAlign * (rtl && isVertical ? -1 : 1);
      break;
    case "end":
      coords[alignmentAxis] += commonAlign * (rtl && isVertical ? -1 : 1);
      break;
  }
  return coords;
}
const computePosition = async (reference, floating, config) => {
  const {
    placement = "bottom",
    strategy = "absolute",
    middleware = [],
    platform
  } = config;
  const validMiddleware = middleware.filter(Boolean);
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(floating));
  let rects = await platform.getElementRects({
    reference,
    floating,
    strategy
  });
  let {
    x: x2,
    y: y2
  } = computeCoordsFromPlacement(rects, placement, rtl);
  let statefulPlacement = placement;
  let middlewareData = {};
  let resetCount = 0;
  for (let i2 = 0; i2 < validMiddleware.length; i2++) {
    const {
      name,
      fn
    } = validMiddleware[i2];
    const {
      x: nextX,
      y: nextY,
      data,
      reset
    } = await fn({
      x: x2,
      y: y2,
      initialPlacement: placement,
      placement: statefulPlacement,
      strategy,
      middlewareData,
      rects,
      platform,
      elements: {
        reference,
        floating
      }
    });
    x2 = nextX != null ? nextX : x2;
    y2 = nextY != null ? nextY : y2;
    middlewareData = {
      ...middlewareData,
      [name]: {
        ...middlewareData[name],
        ...data
      }
    };
    if (reset && resetCount <= 50) {
      resetCount++;
      if (typeof reset === "object") {
        if (reset.placement) {
          statefulPlacement = reset.placement;
        }
        if (reset.rects) {
          rects = reset.rects === true ? await platform.getElementRects({
            reference,
            floating,
            strategy
          }) : reset.rects;
        }
        ({
          x: x2,
          y: y2
        } = computeCoordsFromPlacement(rects, statefulPlacement, rtl));
      }
      i2 = -1;
      continue;
    }
  }
  return {
    x: x2,
    y: y2,
    placement: statefulPlacement,
    strategy,
    middlewareData
  };
};
async function detectOverflow(state, options) {
  var _await$platform$isEle;
  if (options === void 0) {
    options = {};
  }
  const {
    x: x2,
    y: y2,
    platform,
    rects,
    elements,
    strategy
  } = state;
  const {
    boundary = "clippingAncestors",
    rootBoundary = "viewport",
    elementContext = "floating",
    altBoundary = false,
    padding = 0
  } = evaluate(options, state);
  const paddingObject = getPaddingObject(padding);
  const altContext = elementContext === "floating" ? "reference" : "floating";
  const element = elements[altBoundary ? altContext : elementContext];
  const clippingClientRect = rectToClientRect(await platform.getClippingRect({
    element: ((_await$platform$isEle = await (platform.isElement == null ? void 0 : platform.isElement(element))) != null ? _await$platform$isEle : true) ? element : element.contextElement || await (platform.getDocumentElement == null ? void 0 : platform.getDocumentElement(elements.floating)),
    boundary,
    rootBoundary,
    strategy
  }));
  const rect = elementContext === "floating" ? {
    ...rects.floating,
    x: x2,
    y: y2
  } : rects.reference;
  const offsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(elements.floating));
  const offsetScale = await (platform.isElement == null ? void 0 : platform.isElement(offsetParent)) ? await (platform.getScale == null ? void 0 : platform.getScale(offsetParent)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  };
  const elementClientRect = rectToClientRect(platform.convertOffsetParentRelativeRectToViewportRelativeRect ? await platform.convertOffsetParentRelativeRectToViewportRelativeRect({
    rect,
    offsetParent,
    strategy
  }) : rect);
  return {
    top: (clippingClientRect.top - elementClientRect.top + paddingObject.top) / offsetScale.y,
    bottom: (elementClientRect.bottom - clippingClientRect.bottom + paddingObject.bottom) / offsetScale.y,
    left: (clippingClientRect.left - elementClientRect.left + paddingObject.left) / offsetScale.x,
    right: (elementClientRect.right - clippingClientRect.right + paddingObject.right) / offsetScale.x
  };
}
const arrow = (options) => ({
  name: "arrow",
  options,
  async fn(state) {
    const {
      x: x2,
      y: y2,
      placement,
      rects,
      platform,
      elements,
      middlewareData
    } = state;
    const {
      element,
      padding = 0
    } = evaluate(options, state) || {};
    if (element == null) {
      return {};
    }
    const paddingObject = getPaddingObject(padding);
    const coords = {
      x: x2,
      y: y2
    };
    const axis = getAlignmentAxis(placement);
    const length = getAxisLength(axis);
    const arrowDimensions = await platform.getDimensions(element);
    const isYAxis = axis === "y";
    const minProp = isYAxis ? "top" : "left";
    const maxProp = isYAxis ? "bottom" : "right";
    const clientProp = isYAxis ? "clientHeight" : "clientWidth";
    const endDiff = rects.reference[length] + rects.reference[axis] - coords[axis] - rects.floating[length];
    const startDiff = coords[axis] - rects.reference[axis];
    const arrowOffsetParent = await (platform.getOffsetParent == null ? void 0 : platform.getOffsetParent(element));
    let clientSize = arrowOffsetParent ? arrowOffsetParent[clientProp] : 0;
    if (!clientSize || !await (platform.isElement == null ? void 0 : platform.isElement(arrowOffsetParent))) {
      clientSize = elements.floating[clientProp] || rects.floating[length];
    }
    const centerToReference = endDiff / 2 - startDiff / 2;
    const largestPossiblePadding = clientSize / 2 - arrowDimensions[length] / 2 - 1;
    const minPadding = min(paddingObject[minProp], largestPossiblePadding);
    const maxPadding = min(paddingObject[maxProp], largestPossiblePadding);
    const min$1 = minPadding;
    const max2 = clientSize - arrowDimensions[length] - maxPadding;
    const center = clientSize / 2 - arrowDimensions[length] / 2 + centerToReference;
    const offset2 = clamp(min$1, center, max2);
    const shouldAddOffset = !middlewareData.arrow && getAlignment(placement) != null && center != offset2 && rects.reference[length] / 2 - (center < min$1 ? minPadding : maxPadding) - arrowDimensions[length] / 2 < 0;
    const alignmentOffset = shouldAddOffset ? center < min$1 ? center - min$1 : center - max2 : 0;
    return {
      [axis]: coords[axis] + alignmentOffset,
      data: {
        [axis]: offset2,
        centerOffset: center - offset2 - alignmentOffset,
        ...shouldAddOffset && {
          alignmentOffset
        }
      },
      reset: shouldAddOffset
    };
  }
});
function getPlacementList(alignment, autoAlignment, allowedPlacements) {
  const allowedPlacementsSortedByAlignment = alignment ? [...allowedPlacements.filter((placement) => getAlignment(placement) === alignment), ...allowedPlacements.filter((placement) => getAlignment(placement) !== alignment)] : allowedPlacements.filter((placement) => getSide(placement) === placement);
  return allowedPlacementsSortedByAlignment.filter((placement) => {
    if (alignment) {
      return getAlignment(placement) === alignment || (autoAlignment ? getOppositeAlignmentPlacement(placement) !== placement : false);
    }
    return true;
  });
}
const autoPlacement = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "autoPlacement",
    options,
    async fn(state) {
      var _middlewareData$autoP, _middlewareData$autoP2, _placementsThatFitOnE;
      const {
        rects,
        middlewareData,
        placement,
        platform,
        elements
      } = state;
      const {
        crossAxis = false,
        alignment,
        allowedPlacements = placements,
        autoAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      const placements$1 = alignment !== void 0 || allowedPlacements === placements ? getPlacementList(alignment || null, autoAlignment, allowedPlacements) : allowedPlacements;
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const currentIndex = ((_middlewareData$autoP = middlewareData.autoPlacement) == null ? void 0 : _middlewareData$autoP.index) || 0;
      const currentPlacement = placements$1[currentIndex];
      if (currentPlacement == null) {
        return {};
      }
      const alignmentSides = getAlignmentSides(currentPlacement, rects, await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating)));
      if (placement !== currentPlacement) {
        return {
          reset: {
            placement: placements$1[0]
          }
        };
      }
      const currentOverflows = [overflow[getSide(currentPlacement)], overflow[alignmentSides[0]], overflow[alignmentSides[1]]];
      const allOverflows = [...((_middlewareData$autoP2 = middlewareData.autoPlacement) == null ? void 0 : _middlewareData$autoP2.overflows) || [], {
        placement: currentPlacement,
        overflows: currentOverflows
      }];
      const nextPlacement = placements$1[currentIndex + 1];
      if (nextPlacement) {
        return {
          data: {
            index: currentIndex + 1,
            overflows: allOverflows
          },
          reset: {
            placement: nextPlacement
          }
        };
      }
      const placementsSortedByMostSpace = allOverflows.map((d2) => {
        const alignment2 = getAlignment(d2.placement);
        return [d2.placement, alignment2 && crossAxis ? (
          // Check along the mainAxis and main crossAxis side.
          d2.overflows.slice(0, 2).reduce((acc, v2) => acc + v2, 0)
        ) : (
          // Check only the mainAxis.
          d2.overflows[0]
        ), d2.overflows];
      }).sort((a2, b2) => a2[1] - b2[1]);
      const placementsThatFitOnEachSide = placementsSortedByMostSpace.filter((d2) => d2[2].slice(
        0,
        // Aligned placements should not check their opposite crossAxis
        // side.
        getAlignment(d2[0]) ? 2 : 3
      ).every((v2) => v2 <= 0));
      const resetPlacement = ((_placementsThatFitOnE = placementsThatFitOnEachSide[0]) == null ? void 0 : _placementsThatFitOnE[0]) || placementsSortedByMostSpace[0][0];
      if (resetPlacement !== placement) {
        return {
          data: {
            index: currentIndex + 1,
            overflows: allOverflows
          },
          reset: {
            placement: resetPlacement
          }
        };
      }
      return {};
    }
  };
};
const flip = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "flip",
    options,
    async fn(state) {
      var _middlewareData$arrow, _middlewareData$flip;
      const {
        placement,
        middlewareData,
        rects,
        initialPlacement,
        platform,
        elements
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = true,
        fallbackPlacements: specifiedFallbackPlacements,
        fallbackStrategy = "bestFit",
        fallbackAxisSideDirection = "none",
        flipAlignment = true,
        ...detectOverflowOptions
      } = evaluate(options, state);
      if ((_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      const side = getSide(placement);
      const isBasePlacement = getSide(initialPlacement) === initialPlacement;
      const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
      const fallbackPlacements = specifiedFallbackPlacements || (isBasePlacement || !flipAlignment ? [getOppositePlacement(initialPlacement)] : getExpandedPlacements(initialPlacement));
      if (!specifiedFallbackPlacements && fallbackAxisSideDirection !== "none") {
        fallbackPlacements.push(...getOppositeAxisPlacements(initialPlacement, flipAlignment, fallbackAxisSideDirection, rtl));
      }
      const placements2 = [initialPlacement, ...fallbackPlacements];
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const overflows = [];
      let overflowsData = ((_middlewareData$flip = middlewareData.flip) == null ? void 0 : _middlewareData$flip.overflows) || [];
      if (checkMainAxis) {
        overflows.push(overflow[side]);
      }
      if (checkCrossAxis) {
        const sides2 = getAlignmentSides(placement, rects, rtl);
        overflows.push(overflow[sides2[0]], overflow[sides2[1]]);
      }
      overflowsData = [...overflowsData, {
        placement,
        overflows
      }];
      if (!overflows.every((side2) => side2 <= 0)) {
        var _middlewareData$flip2, _overflowsData$filter;
        const nextIndex = (((_middlewareData$flip2 = middlewareData.flip) == null ? void 0 : _middlewareData$flip2.index) || 0) + 1;
        const nextPlacement = placements2[nextIndex];
        if (nextPlacement) {
          return {
            data: {
              index: nextIndex,
              overflows: overflowsData
            },
            reset: {
              placement: nextPlacement
            }
          };
        }
        let resetPlacement = (_overflowsData$filter = overflowsData.filter((d2) => d2.overflows[0] <= 0).sort((a2, b2) => a2.overflows[1] - b2.overflows[1])[0]) == null ? void 0 : _overflowsData$filter.placement;
        if (!resetPlacement) {
          switch (fallbackStrategy) {
            case "bestFit": {
              var _overflowsData$map$so;
              const placement2 = (_overflowsData$map$so = overflowsData.map((d2) => [d2.placement, d2.overflows.filter((overflow2) => overflow2 > 0).reduce((acc, overflow2) => acc + overflow2, 0)]).sort((a2, b2) => a2[1] - b2[1])[0]) == null ? void 0 : _overflowsData$map$so[0];
              if (placement2) {
                resetPlacement = placement2;
              }
              break;
            }
            case "initialPlacement":
              resetPlacement = initialPlacement;
              break;
          }
        }
        if (placement !== resetPlacement) {
          return {
            reset: {
              placement: resetPlacement
            }
          };
        }
      }
      return {};
    }
  };
};
async function convertValueToCoords(state, options) {
  const {
    placement,
    platform,
    elements
  } = state;
  const rtl = await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating));
  const side = getSide(placement);
  const alignment = getAlignment(placement);
  const isVertical = getSideAxis(placement) === "y";
  const mainAxisMulti = ["left", "top"].includes(side) ? -1 : 1;
  const crossAxisMulti = rtl && isVertical ? -1 : 1;
  const rawValue = evaluate(options, state);
  let {
    mainAxis,
    crossAxis,
    alignmentAxis
  } = typeof rawValue === "number" ? {
    mainAxis: rawValue,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: 0,
    crossAxis: 0,
    alignmentAxis: null,
    ...rawValue
  };
  if (alignment && typeof alignmentAxis === "number") {
    crossAxis = alignment === "end" ? alignmentAxis * -1 : alignmentAxis;
  }
  return isVertical ? {
    x: crossAxis * crossAxisMulti,
    y: mainAxis * mainAxisMulti
  } : {
    x: mainAxis * mainAxisMulti,
    y: crossAxis * crossAxisMulti
  };
}
const offset = function(options) {
  if (options === void 0) {
    options = 0;
  }
  return {
    name: "offset",
    options,
    async fn(state) {
      var _middlewareData$offse, _middlewareData$arrow;
      const {
        x: x2,
        y: y2,
        placement,
        middlewareData
      } = state;
      const diffCoords = await convertValueToCoords(state, options);
      if (placement === ((_middlewareData$offse = middlewareData.offset) == null ? void 0 : _middlewareData$offse.placement) && (_middlewareData$arrow = middlewareData.arrow) != null && _middlewareData$arrow.alignmentOffset) {
        return {};
      }
      return {
        x: x2 + diffCoords.x,
        y: y2 + diffCoords.y,
        data: {
          ...diffCoords,
          placement
        }
      };
    }
  };
};
const shift = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "shift",
    options,
    async fn(state) {
      const {
        x: x2,
        y: y2,
        placement
      } = state;
      const {
        mainAxis: checkMainAxis = true,
        crossAxis: checkCrossAxis = false,
        limiter = {
          fn: (_ref) => {
            let {
              x: x3,
              y: y3
            } = _ref;
            return {
              x: x3,
              y: y3
            };
          }
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const coords = {
        x: x2,
        y: y2
      };
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const crossAxis = getSideAxis(getSide(placement));
      const mainAxis = getOppositeAxis(crossAxis);
      let mainAxisCoord = coords[mainAxis];
      let crossAxisCoord = coords[crossAxis];
      if (checkMainAxis) {
        const minSide = mainAxis === "y" ? "top" : "left";
        const maxSide = mainAxis === "y" ? "bottom" : "right";
        const min2 = mainAxisCoord + overflow[minSide];
        const max2 = mainAxisCoord - overflow[maxSide];
        mainAxisCoord = clamp(min2, mainAxisCoord, max2);
      }
      if (checkCrossAxis) {
        const minSide = crossAxis === "y" ? "top" : "left";
        const maxSide = crossAxis === "y" ? "bottom" : "right";
        const min2 = crossAxisCoord + overflow[minSide];
        const max2 = crossAxisCoord - overflow[maxSide];
        crossAxisCoord = clamp(min2, crossAxisCoord, max2);
      }
      const limitedCoords = limiter.fn({
        ...state,
        [mainAxis]: mainAxisCoord,
        [crossAxis]: crossAxisCoord
      });
      return {
        ...limitedCoords,
        data: {
          x: limitedCoords.x - x2,
          y: limitedCoords.y - y2
        }
      };
    }
  };
};
const size = function(options) {
  if (options === void 0) {
    options = {};
  }
  return {
    name: "size",
    options,
    async fn(state) {
      const {
        placement,
        rects,
        platform,
        elements
      } = state;
      const {
        apply = () => {
        },
        ...detectOverflowOptions
      } = evaluate(options, state);
      const overflow = await detectOverflow(state, detectOverflowOptions);
      const side = getSide(placement);
      const alignment = getAlignment(placement);
      const isYAxis = getSideAxis(placement) === "y";
      const {
        width,
        height
      } = rects.floating;
      let heightSide;
      let widthSide;
      if (side === "top" || side === "bottom") {
        heightSide = side;
        widthSide = alignment === (await (platform.isRTL == null ? void 0 : platform.isRTL(elements.floating)) ? "start" : "end") ? "left" : "right";
      } else {
        widthSide = side;
        heightSide = alignment === "end" ? "top" : "bottom";
      }
      const overflowAvailableHeight = height - overflow[heightSide];
      const overflowAvailableWidth = width - overflow[widthSide];
      const noShift = !state.middlewareData.shift;
      let availableHeight = overflowAvailableHeight;
      let availableWidth = overflowAvailableWidth;
      if (isYAxis) {
        const maximumClippingWidth = width - overflow.left - overflow.right;
        availableWidth = alignment || noShift ? min(overflowAvailableWidth, maximumClippingWidth) : maximumClippingWidth;
      } else {
        const maximumClippingHeight = height - overflow.top - overflow.bottom;
        availableHeight = alignment || noShift ? min(overflowAvailableHeight, maximumClippingHeight) : maximumClippingHeight;
      }
      if (noShift && !alignment) {
        const xMin = max(overflow.left, 0);
        const xMax = max(overflow.right, 0);
        const yMin = max(overflow.top, 0);
        const yMax = max(overflow.bottom, 0);
        if (isYAxis) {
          availableWidth = width - 2 * (xMin !== 0 || xMax !== 0 ? xMin + xMax : max(overflow.left, overflow.right));
        } else {
          availableHeight = height - 2 * (yMin !== 0 || yMax !== 0 ? yMin + yMax : max(overflow.top, overflow.bottom));
        }
      }
      await apply({
        ...state,
        availableWidth,
        availableHeight
      });
      const nextDimensions = await platform.getDimensions(elements.floating);
      if (width !== nextDimensions.width || height !== nextDimensions.height) {
        return {
          reset: {
            rects: true
          }
        };
      }
      return {};
    }
  };
};
function n$1(t) {
  var e;
  return (null == (e = t.ownerDocument) ? void 0 : e.defaultView) || window;
}
function o(t) {
  return n$1(t).getComputedStyle(t);
}
const i = Math.min, r = Math.max, l = Math.round;
function c(t) {
  const e = o(t);
  let n2 = parseFloat(e.width), i2 = parseFloat(e.height);
  const r2 = t.offsetWidth, c2 = t.offsetHeight, s2 = l(n2) !== r2 || l(i2) !== c2;
  return s2 && (n2 = r2, i2 = c2), { width: n2, height: i2, fallback: s2 };
}
function s(t) {
  return h(t) ? (t.nodeName || "").toLowerCase() : "";
}
let f$1;
function u$1() {
  if (f$1)
    return f$1;
  const t = navigator.userAgentData;
  return t && Array.isArray(t.brands) ? (f$1 = t.brands.map((t2) => t2.brand + "/" + t2.version).join(" "), f$1) : navigator.userAgent;
}
function a(t) {
  return t instanceof n$1(t).HTMLElement;
}
function d$1(t) {
  return t instanceof n$1(t).Element;
}
function h(t) {
  return t instanceof n$1(t).Node;
}
function p(t) {
  if ("undefined" == typeof ShadowRoot)
    return false;
  return t instanceof n$1(t).ShadowRoot || t instanceof ShadowRoot;
}
function g$1(t) {
  const { overflow: e, overflowX: n2, overflowY: i2, display: r2 } = o(t);
  return /auto|scroll|overlay|hidden|clip/.test(e + i2 + n2) && !["inline", "contents"].includes(r2);
}
function m$1(t) {
  return ["table", "td", "th"].includes(s(t));
}
function y$1(t) {
  const e = /firefox/i.test(u$1()), n2 = o(t), i2 = n2.backdropFilter || n2.WebkitBackdropFilter;
  return "none" !== n2.transform || "none" !== n2.perspective || !!i2 && "none" !== i2 || e && "filter" === n2.willChange || e && !!n2.filter && "none" !== n2.filter || ["transform", "perspective"].some((t2) => n2.willChange.includes(t2)) || ["paint", "layout", "strict", "content"].some((t2) => {
    const e2 = n2.contain;
    return null != e2 && e2.includes(t2);
  });
}
function x() {
  return !/^((?!chrome|android).)*safari/i.test(u$1());
}
function w(t) {
  return ["html", "body", "#document"].includes(s(t));
}
function v$1(t) {
  return d$1(t) ? t : t.contextElement;
}
const b$1 = { x: 1, y: 1 };
function L$1(t) {
  const e = v$1(t);
  if (!a(e))
    return b$1;
  const n2 = e.getBoundingClientRect(), { width: o2, height: i2, fallback: r2 } = c(e);
  let s2 = (r2 ? l(n2.width) : n2.width) / o2, f2 = (r2 ? l(n2.height) : n2.height) / i2;
  return s2 && Number.isFinite(s2) || (s2 = 1), f2 && Number.isFinite(f2) || (f2 = 1), { x: s2, y: f2 };
}
function E$1(t, e, o2, i2) {
  var r2, l2;
  void 0 === e && (e = false), void 0 === o2 && (o2 = false);
  const c2 = t.getBoundingClientRect(), s2 = v$1(t);
  let f2 = b$1;
  e && (i2 ? d$1(i2) && (f2 = L$1(i2)) : f2 = L$1(t));
  const u2 = s2 ? n$1(s2) : window, a2 = !x() && o2;
  let h2 = (c2.left + (a2 && (null == (r2 = u2.visualViewport) ? void 0 : r2.offsetLeft) || 0)) / f2.x, p2 = (c2.top + (a2 && (null == (l2 = u2.visualViewport) ? void 0 : l2.offsetTop) || 0)) / f2.y, g2 = c2.width / f2.x, m2 = c2.height / f2.y;
  if (s2) {
    const t2 = n$1(s2), e2 = i2 && d$1(i2) ? n$1(i2) : i2;
    let o3 = t2.frameElement;
    for (; o3 && i2 && e2 !== t2; ) {
      const t3 = L$1(o3), e3 = o3.getBoundingClientRect(), i3 = getComputedStyle(o3);
      e3.x += (o3.clientLeft + parseFloat(i3.paddingLeft)) * t3.x, e3.y += (o3.clientTop + parseFloat(i3.paddingTop)) * t3.y, h2 *= t3.x, p2 *= t3.y, g2 *= t3.x, m2 *= t3.y, h2 += e3.x, p2 += e3.y, o3 = n$1(o3).frameElement;
    }
  }
  return { width: g2, height: m2, top: p2, right: h2 + g2, bottom: p2 + m2, left: h2, x: h2, y: p2 };
}
function R(t) {
  return ((h(t) ? t.ownerDocument : t.document) || window.document).documentElement;
}
function T(t) {
  return d$1(t) ? { scrollLeft: t.scrollLeft, scrollTop: t.scrollTop } : { scrollLeft: t.pageXOffset, scrollTop: t.pageYOffset };
}
function C$1(t) {
  return E$1(R(t)).left + T(t).scrollLeft;
}
function F(t) {
  if ("html" === s(t))
    return t;
  const e = t.assignedSlot || t.parentNode || p(t) && t.host || R(t);
  return p(e) ? e.host : e;
}
function W$1(t) {
  const e = F(t);
  return w(e) ? e.ownerDocument.body : a(e) && g$1(e) ? e : W$1(e);
}
function D(t, e) {
  var o2;
  void 0 === e && (e = []);
  const i2 = W$1(t), r2 = i2 === (null == (o2 = t.ownerDocument) ? void 0 : o2.body), l2 = n$1(i2);
  return r2 ? e.concat(l2, l2.visualViewport || [], g$1(i2) ? i2 : []) : e.concat(i2, D(i2));
}
function S$1(e, i2, l2) {
  return "viewport" === i2 ? rectToClientRect(function(t, e2) {
    const o2 = n$1(t), i3 = R(t), r2 = o2.visualViewport;
    let l3 = i3.clientWidth, c2 = i3.clientHeight, s2 = 0, f2 = 0;
    if (r2) {
      l3 = r2.width, c2 = r2.height;
      const t2 = x();
      (t2 || !t2 && "fixed" === e2) && (s2 = r2.offsetLeft, f2 = r2.offsetTop);
    }
    return { width: l3, height: c2, x: s2, y: f2 };
  }(e, l2)) : d$1(i2) ? rectToClientRect(function(t, e2) {
    const n2 = E$1(t, true, "fixed" === e2), o2 = n2.top + t.clientTop, i3 = n2.left + t.clientLeft, r2 = a(t) ? L$1(t) : { x: 1, y: 1 };
    return { width: t.clientWidth * r2.x, height: t.clientHeight * r2.y, x: i3 * r2.x, y: o2 * r2.y };
  }(i2, l2)) : rectToClientRect(function(t) {
    const e2 = R(t), n2 = T(t), i3 = t.ownerDocument.body, l3 = r(e2.scrollWidth, e2.clientWidth, i3.scrollWidth, i3.clientWidth), c2 = r(e2.scrollHeight, e2.clientHeight, i3.scrollHeight, i3.clientHeight);
    let s2 = -n2.scrollLeft + C$1(t);
    const f2 = -n2.scrollTop;
    return "rtl" === o(i3).direction && (s2 += r(e2.clientWidth, i3.clientWidth) - l3), { width: l3, height: c2, x: s2, y: f2 };
  }(R(e)));
}
function A(t) {
  return a(t) && "fixed" !== o(t).position ? t.offsetParent : null;
}
function H(t) {
  const e = n$1(t);
  let i2 = A(t);
  for (; i2 && m$1(i2) && "static" === o(i2).position; )
    i2 = A(i2);
  return i2 && ("html" === s(i2) || "body" === s(i2) && "static" === o(i2).position && !y$1(i2)) ? e : i2 || function(t2) {
    let e2 = F(t2);
    for (; a(e2) && !w(e2); ) {
      if (y$1(e2))
        return e2;
      e2 = F(e2);
    }
    return null;
  }(t) || e;
}
function O(t, e, n2) {
  const o2 = a(e), i2 = R(e), r2 = E$1(t, true, "fixed" === n2, e);
  let l2 = { scrollLeft: 0, scrollTop: 0 };
  const c2 = { x: 0, y: 0 };
  if (o2 || !o2 && "fixed" !== n2)
    if (("body" !== s(e) || g$1(i2)) && (l2 = T(e)), a(e)) {
      const t2 = E$1(e, true);
      c2.x = t2.x + e.clientLeft, c2.y = t2.y + e.clientTop;
    } else
      i2 && (c2.x = C$1(i2));
  return { x: r2.left + l2.scrollLeft - c2.x, y: r2.top + l2.scrollTop - c2.y, width: r2.width, height: r2.height };
}
const P = { getClippingRect: function(t) {
  let { element: e, boundary: n2, rootBoundary: l2, strategy: c2 } = t;
  const f2 = "clippingAncestors" === n2 ? function(t2, e2) {
    const n3 = e2.get(t2);
    if (n3)
      return n3;
    let i2 = D(t2).filter((t3) => d$1(t3) && "body" !== s(t3)), r2 = null;
    const l3 = "fixed" === o(t2).position;
    let c3 = l3 ? F(t2) : t2;
    for (; d$1(c3) && !w(c3); ) {
      const t3 = o(c3), e3 = y$1(c3);
      (l3 ? e3 || r2 : e3 || "static" !== t3.position || !r2 || !["absolute", "fixed"].includes(r2.position)) ? r2 = t3 : i2 = i2.filter((t4) => t4 !== c3), c3 = F(c3);
    }
    return e2.set(t2, i2), i2;
  }(e, this._c) : [].concat(n2), u2 = [...f2, l2], a2 = u2[0], h2 = u2.reduce((t2, n3) => {
    const o2 = S$1(e, n3, c2);
    return t2.top = r(o2.top, t2.top), t2.right = i(o2.right, t2.right), t2.bottom = i(o2.bottom, t2.bottom), t2.left = r(o2.left, t2.left), t2;
  }, S$1(e, a2, c2));
  return { width: h2.right - h2.left, height: h2.bottom - h2.top, x: h2.left, y: h2.top };
}, convertOffsetParentRelativeRectToViewportRelativeRect: function(t) {
  let { rect: e, offsetParent: n2, strategy: o2 } = t;
  const i2 = a(n2), r2 = R(n2);
  if (n2 === r2)
    return e;
  let l2 = { scrollLeft: 0, scrollTop: 0 }, c2 = { x: 1, y: 1 };
  const f2 = { x: 0, y: 0 };
  if ((i2 || !i2 && "fixed" !== o2) && (("body" !== s(n2) || g$1(r2)) && (l2 = T(n2)), a(n2))) {
    const t2 = E$1(n2);
    c2 = L$1(n2), f2.x = t2.x + n2.clientLeft, f2.y = t2.y + n2.clientTop;
  }
  return { width: e.width * c2.x, height: e.height * c2.y, x: e.x * c2.x - l2.scrollLeft * c2.x + f2.x, y: e.y * c2.y - l2.scrollTop * c2.y + f2.y };
}, isElement: d$1, getDimensions: function(t) {
  return a(t) ? c(t) : t.getBoundingClientRect();
}, getOffsetParent: H, getDocumentElement: R, getScale: L$1, async getElementRects(t) {
  let { reference: e, floating: n2, strategy: o2 } = t;
  const i2 = this.getOffsetParent || H, r2 = this.getDimensions;
  return { reference: O(e, await i2(n2), o2), floating: { x: 0, y: 0, ...await r2(n2) } };
}, getClientRects: (t) => Array.from(t.getClientRects()), isRTL: (t) => "rtl" === o(t).direction };
const B = (t, n2, o2) => {
  const i2 = /* @__PURE__ */ new Map(), r2 = { platform: P, ...o2 }, l2 = { ...r2.platform, _c: i2 };
  return computePosition(t, n2, { ...r2, platform: l2 });
};
function fe(e, t) {
  for (const o2 in t)
    Object.prototype.hasOwnProperty.call(t, o2) && (typeof t[o2] == "object" && e[o2] ? fe(e[o2], t[o2]) : e[o2] = t[o2]);
}
const u = {
  // Disable popper components
  disabled: false,
  // Default position offset along main axis (px)
  distance: 5,
  // Default position offset along cross axis (px)
  skidding: 0,
  // Default container where the tooltip will be appended
  container: "body",
  // Element used to compute position and size boundaries
  boundary: void 0,
  // Skip delay & CSS transitions when another popper is shown, so that the popper appear to instanly move to the new position.
  instantMove: false,
  // Auto destroy tooltip DOM nodes (ms)
  disposeTimeout: 5e3,
  // Triggers on the popper itself
  popperTriggers: [],
  // Positioning strategy
  strategy: "absolute",
  // Prevent overflow
  preventOverflow: true,
  // Flip to the opposite placement if needed
  flip: true,
  // Shift on the cross axis to prevent the popper from overflowing
  shift: true,
  // Overflow padding (px)
  overflowPadding: 0,
  // Arrow padding (px)
  arrowPadding: 0,
  // Compute arrow overflow (useful to hide it)
  arrowOverflow: true,
  // Themes
  themes: {
    tooltip: {
      // Default tooltip placement relative to target element
      placement: "top",
      // Default events that trigger the tooltip
      triggers: ["hover", "focus", "touch"],
      // Close tooltip on click on tooltip target
      hideTriggers: (e) => [...e, "click"],
      // Delay (ms)
      delay: {
        show: 200,
        hide: 0
      },
      // Update popper on content resize
      handleResize: false,
      // Enable HTML content in directive
      html: false,
      // Displayed when tooltip content is loading
      loadingContent: "..."
    },
    dropdown: {
      // Default dropdown placement relative to target element
      placement: "bottom",
      // Default events that trigger the dropdown
      triggers: ["click"],
      // Delay (ms)
      delay: 0,
      // Update popper on content resize
      handleResize: true,
      // Hide on clock outside
      autoHide: true
    },
    menu: {
      $extend: "dropdown",
      triggers: ["hover", "focus"],
      popperTriggers: ["hover", "focus"],
      delay: {
        show: 0,
        hide: 400
      }
    }
  }
};
function b(e, t) {
  let o2 = u.themes[e] || {}, i2;
  do
    i2 = o2[t], typeof i2 > "u" ? o2.$extend ? o2 = u.themes[o2.$extend] || {} : (o2 = null, i2 = u[t]) : o2 = null;
  while (o2);
  return i2;
}
function Je(e) {
  const t = [e];
  let o2 = u.themes[e] || {};
  do
    o2.$extend && !o2.$resetCss ? (t.push(o2.$extend), o2 = u.themes[o2.$extend] || {}) : o2 = null;
  while (o2);
  return t.map((i2) => `v-popper--theme-${i2}`);
}
function oe(e) {
  const t = [e];
  let o2 = u.themes[e] || {};
  do
    o2.$extend ? (t.push(o2.$extend), o2 = u.themes[o2.$extend] || {}) : o2 = null;
  while (o2);
  return t;
}
let _ = false;
if (typeof window < "u") {
  _ = false;
  try {
    const e = Object.defineProperty({}, "passive", {
      get() {
        _ = true;
      }
    });
    window.addEventListener("test", null, e);
  } catch {
  }
}
let me = false;
typeof window < "u" && typeof navigator < "u" && (me = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream);
const ge = ["auto", "top", "bottom", "left", "right"].reduce((e, t) => e.concat([
  t,
  `${t}-start`,
  `${t}-end`
]), []), ie = {
  hover: "mouseenter",
  focus: "focus",
  click: "click",
  touch: "touchstart",
  pointer: "pointerdown"
}, se = {
  hover: "mouseleave",
  focus: "blur",
  click: "click",
  touch: "touchend",
  pointer: "pointerup"
};
function ne(e, t) {
  const o2 = e.indexOf(t);
  o2 !== -1 && e.splice(o2, 1);
}
function W() {
  return new Promise((e) => requestAnimationFrame(() => {
    requestAnimationFrame(e);
  }));
}
const d = [];
let g = null;
const re = {};
function pe(e) {
  let t = re[e];
  return t || (t = re[e] = []), t;
}
let X = function() {
};
typeof window < "u" && (X = window.Element);
function n(e) {
  return function(t) {
    return b(t.theme, e);
  };
}
const G = "__floating-vue__popper", K = () => defineComponent({
  name: "VPopper",
  provide() {
    return {
      [G]: {
        parentPopper: this
      }
    };
  },
  inject: {
    [G]: { default: null }
  },
  props: {
    theme: {
      type: String,
      required: true
    },
    targetNodes: {
      type: Function,
      required: true
    },
    referenceNode: {
      type: Function,
      default: null
    },
    popperNode: {
      type: Function,
      required: true
    },
    shown: {
      type: Boolean,
      default: false
    },
    showGroup: {
      type: String,
      default: null
    },
    // eslint-disable-next-line vue/require-prop-types
    ariaId: {
      default: null
    },
    disabled: {
      type: Boolean,
      default: n("disabled")
    },
    positioningDisabled: {
      type: Boolean,
      default: n("positioningDisabled")
    },
    placement: {
      type: String,
      default: n("placement"),
      validator: (e) => ge.includes(e)
    },
    delay: {
      type: [String, Number, Object],
      default: n("delay")
    },
    distance: {
      type: [Number, String],
      default: n("distance")
    },
    skidding: {
      type: [Number, String],
      default: n("skidding")
    },
    triggers: {
      type: Array,
      default: n("triggers")
    },
    showTriggers: {
      type: [Array, Function],
      default: n("showTriggers")
    },
    hideTriggers: {
      type: [Array, Function],
      default: n("hideTriggers")
    },
    popperTriggers: {
      type: Array,
      default: n("popperTriggers")
    },
    popperShowTriggers: {
      type: [Array, Function],
      default: n("popperShowTriggers")
    },
    popperHideTriggers: {
      type: [Array, Function],
      default: n("popperHideTriggers")
    },
    container: {
      type: [String, Object, X, Boolean],
      default: n("container")
    },
    boundary: {
      type: [String, X],
      default: n("boundary")
    },
    strategy: {
      type: String,
      validator: (e) => ["absolute", "fixed"].includes(e),
      default: n("strategy")
    },
    autoHide: {
      type: [Boolean, Function],
      default: n("autoHide")
    },
    handleResize: {
      type: Boolean,
      default: n("handleResize")
    },
    instantMove: {
      type: Boolean,
      default: n("instantMove")
    },
    eagerMount: {
      type: Boolean,
      default: n("eagerMount")
    },
    popperClass: {
      type: [String, Array, Object],
      default: n("popperClass")
    },
    computeTransformOrigin: {
      type: Boolean,
      default: n("computeTransformOrigin")
    },
    /**
     * @deprecated
     */
    autoMinSize: {
      type: Boolean,
      default: n("autoMinSize")
    },
    autoSize: {
      type: [Boolean, String],
      default: n("autoSize")
    },
    /**
     * @deprecated
     */
    autoMaxSize: {
      type: Boolean,
      default: n("autoMaxSize")
    },
    autoBoundaryMaxSize: {
      type: Boolean,
      default: n("autoBoundaryMaxSize")
    },
    preventOverflow: {
      type: Boolean,
      default: n("preventOverflow")
    },
    overflowPadding: {
      type: [Number, String],
      default: n("overflowPadding")
    },
    arrowPadding: {
      type: [Number, String],
      default: n("arrowPadding")
    },
    arrowOverflow: {
      type: Boolean,
      default: n("arrowOverflow")
    },
    flip: {
      type: Boolean,
      default: n("flip")
    },
    shift: {
      type: Boolean,
      default: n("shift")
    },
    shiftCrossAxis: {
      type: Boolean,
      default: n("shiftCrossAxis")
    },
    noAutoFocus: {
      type: Boolean,
      default: n("noAutoFocus")
    },
    disposeTimeout: {
      type: Number,
      default: n("disposeTimeout")
    }
  },
  emits: [
    "show",
    "hide",
    "update:shown",
    "apply-show",
    "apply-hide",
    "close-group",
    "close-directive",
    "auto-hide",
    "resize",
    "dispose"
  ],
  data() {
    return {
      isShown: false,
      isMounted: false,
      skipTransition: false,
      classes: {
        showFrom: false,
        showTo: false,
        hideFrom: false,
        hideTo: true
      },
      result: {
        x: 0,
        y: 0,
        placement: "",
        strategy: this.strategy,
        arrow: {
          x: 0,
          y: 0,
          centerOffset: 0
        },
        transformOrigin: null
      },
      shownChildren: /* @__PURE__ */ new Set(),
      lastAutoHide: true
    };
  },
  computed: {
    popperId() {
      return this.ariaId != null ? this.ariaId : this.randomId;
    },
    shouldMountContent() {
      return this.eagerMount || this.isMounted;
    },
    slotData() {
      return {
        popperId: this.popperId,
        isShown: this.isShown,
        shouldMountContent: this.shouldMountContent,
        skipTransition: this.skipTransition,
        autoHide: typeof this.autoHide == "function" ? this.lastAutoHide : this.autoHide,
        show: this.show,
        hide: this.hide,
        handleResize: this.handleResize,
        onResize: this.onResize,
        classes: {
          ...this.classes,
          popperClass: this.popperClass
        },
        result: this.positioningDisabled ? null : this.result,
        attrs: this.$attrs
      };
    },
    parentPopper() {
      var e;
      return (e = this[G]) == null ? void 0 : e.parentPopper;
    },
    hasPopperShowTriggerHover() {
      var e, t;
      return ((e = this.popperTriggers) == null ? void 0 : e.includes("hover")) || ((t = this.popperShowTriggers) == null ? void 0 : t.includes("hover"));
    }
  },
  watch: {
    shown: "$_autoShowHide",
    disabled(e) {
      e ? this.dispose() : this.init();
    },
    async container() {
      this.isShown && (this.$_ensureTeleport(), await this.$_computePosition());
    },
    ...[
      "triggers",
      "positioningDisabled"
    ].reduce((e, t) => (e[t] = "$_refreshListeners", e), {}),
    ...[
      "placement",
      "distance",
      "skidding",
      "boundary",
      "strategy",
      "overflowPadding",
      "arrowPadding",
      "preventOverflow",
      "shift",
      "shiftCrossAxis",
      "flip"
    ].reduce((e, t) => (e[t] = "$_computePosition", e), {})
  },
  created() {
    this.$_isDisposed = true, this.randomId = `popper_${[Math.random(), Date.now()].map((e) => e.toString(36).substring(2, 10)).join("_")}`, this.autoMinSize && console.warn('[floating-vue] `autoMinSize` option is deprecated. Use `autoSize="min"` instead.'), this.autoMaxSize && console.warn("[floating-vue] `autoMaxSize` option is deprecated. Use `autoBoundaryMaxSize` instead.");
  },
  mounted() {
    this.init(), this.$_detachPopperNode();
  },
  activated() {
    this.$_autoShowHide();
  },
  deactivated() {
    this.hide();
  },
  beforeUnmount() {
    this.dispose();
  },
  methods: {
    show({ event: e = null, skipDelay: t = false, force: o2 = false } = {}) {
      var i2, s2;
      (i2 = this.parentPopper) != null && i2.lockedChild && this.parentPopper.lockedChild !== this || (this.$_pendingHide = false, (o2 || !this.disabled) && (((s2 = this.parentPopper) == null ? void 0 : s2.lockedChild) === this && (this.parentPopper.lockedChild = null), this.$_scheduleShow(e, t), this.$emit("show"), this.$_showFrameLocked = true, requestAnimationFrame(() => {
        this.$_showFrameLocked = false;
      })), this.$emit("update:shown", true));
    },
    hide({ event: e = null, skipDelay: t = false } = {}) {
      var o2;
      if (!this.$_hideInProgress) {
        if (this.shownChildren.size > 0) {
          this.$_pendingHide = true;
          return;
        }
        if (this.hasPopperShowTriggerHover && this.$_isAimingPopper()) {
          this.parentPopper && (this.parentPopper.lockedChild = this, clearTimeout(this.parentPopper.lockedChildTimer), this.parentPopper.lockedChildTimer = setTimeout(() => {
            this.parentPopper.lockedChild === this && (this.parentPopper.lockedChild.hide({ skipDelay: t }), this.parentPopper.lockedChild = null);
          }, 1e3));
          return;
        }
        ((o2 = this.parentPopper) == null ? void 0 : o2.lockedChild) === this && (this.parentPopper.lockedChild = null), this.$_pendingHide = false, this.$_scheduleHide(e, t), this.$emit("hide"), this.$emit("update:shown", false);
      }
    },
    init() {
      var e;
      this.$_isDisposed && (this.$_isDisposed = false, this.isMounted = false, this.$_events = [], this.$_preventShow = false, this.$_referenceNode = ((e = this.referenceNode) == null ? void 0 : e.call(this)) ?? this.$el, this.$_targetNodes = this.targetNodes().filter((t) => t.nodeType === t.ELEMENT_NODE), this.$_popperNode = this.popperNode(), this.$_innerNode = this.$_popperNode.querySelector(".v-popper__inner"), this.$_arrowNode = this.$_popperNode.querySelector(".v-popper__arrow-container"), this.$_swapTargetAttrs("title", "data-original-title"), this.$_detachPopperNode(), this.triggers.length && this.$_addEventListeners(), this.shown && this.show());
    },
    dispose() {
      this.$_isDisposed || (this.$_isDisposed = true, this.$_removeEventListeners(), this.hide({ skipDelay: true }), this.$_detachPopperNode(), this.isMounted = false, this.isShown = false, this.$_updateParentShownChildren(false), this.$_swapTargetAttrs("data-original-title", "title"), this.$emit("dispose"));
    },
    async onResize() {
      this.isShown && (await this.$_computePosition(), this.$emit("resize"));
    },
    async $_computePosition() {
      if (this.$_isDisposed || this.positioningDisabled)
        return;
      const e = {
        strategy: this.strategy,
        middleware: []
      };
      (this.distance || this.skidding) && e.middleware.push(offset({
        mainAxis: this.distance,
        crossAxis: this.skidding
      }));
      const t = this.placement.startsWith("auto");
      if (t ? e.middleware.push(autoPlacement({
        alignment: this.placement.split("-")[1] ?? ""
      })) : e.placement = this.placement, this.preventOverflow && (this.shift && e.middleware.push(shift({
        padding: this.overflowPadding,
        boundary: this.boundary,
        crossAxis: this.shiftCrossAxis
      })), !t && this.flip && e.middleware.push(flip({
        padding: this.overflowPadding,
        boundary: this.boundary
      }))), e.middleware.push(arrow({
        element: this.$_arrowNode,
        padding: this.arrowPadding
      })), this.arrowOverflow && e.middleware.push({
        name: "arrowOverflow",
        fn: ({ placement: i2, rects: s2, middlewareData: r2 }) => {
          let p2;
          const { centerOffset: a2 } = r2.arrow;
          return i2.startsWith("top") || i2.startsWith("bottom") ? p2 = Math.abs(a2) > s2.reference.width / 2 : p2 = Math.abs(a2) > s2.reference.height / 2, {
            data: {
              overflow: p2
            }
          };
        }
      }), this.autoMinSize || this.autoSize) {
        const i2 = this.autoSize ? this.autoSize : this.autoMinSize ? "min" : null;
        e.middleware.push({
          name: "autoSize",
          fn: ({ rects: s2, placement: r2, middlewareData: p2 }) => {
            var h2;
            if ((h2 = p2.autoSize) != null && h2.skip)
              return {};
            let a2, l2;
            return r2.startsWith("top") || r2.startsWith("bottom") ? a2 = s2.reference.width : l2 = s2.reference.height, this.$_innerNode.style[i2 === "min" ? "minWidth" : i2 === "max" ? "maxWidth" : "width"] = a2 != null ? `${a2}px` : null, this.$_innerNode.style[i2 === "min" ? "minHeight" : i2 === "max" ? "maxHeight" : "height"] = l2 != null ? `${l2}px` : null, {
              data: {
                skip: true
              },
              reset: {
                rects: true
              }
            };
          }
        });
      }
      (this.autoMaxSize || this.autoBoundaryMaxSize) && (this.$_innerNode.style.maxWidth = null, this.$_innerNode.style.maxHeight = null, e.middleware.push(size({
        boundary: this.boundary,
        padding: this.overflowPadding,
        apply: ({ availableWidth: i2, availableHeight: s2 }) => {
          this.$_innerNode.style.maxWidth = i2 != null ? `${i2}px` : null, this.$_innerNode.style.maxHeight = s2 != null ? `${s2}px` : null;
        }
      })));
      const o2 = await B(this.$_referenceNode, this.$_popperNode, e);
      Object.assign(this.result, {
        x: o2.x,
        y: o2.y,
        placement: o2.placement,
        strategy: o2.strategy,
        arrow: {
          ...o2.middlewareData.arrow,
          ...o2.middlewareData.arrowOverflow
        }
      });
    },
    $_scheduleShow(e = null, t = false) {
      if (this.$_updateParentShownChildren(true), this.$_hideInProgress = false, clearTimeout(this.$_scheduleTimer), g && this.instantMove && g.instantMove && g !== this.parentPopper) {
        g.$_applyHide(true), this.$_applyShow(true);
        return;
      }
      t ? this.$_applyShow() : this.$_scheduleTimer = setTimeout(this.$_applyShow.bind(this), this.$_computeDelay("show"));
    },
    $_scheduleHide(e = null, t = false) {
      if (this.shownChildren.size > 0) {
        this.$_pendingHide = true;
        return;
      }
      this.$_updateParentShownChildren(false), this.$_hideInProgress = true, clearTimeout(this.$_scheduleTimer), this.isShown && (g = this), t ? this.$_applyHide() : this.$_scheduleTimer = setTimeout(this.$_applyHide.bind(this), this.$_computeDelay("hide"));
    },
    $_computeDelay(e) {
      const t = this.delay;
      return parseInt(t && t[e] || t || 0);
    },
    async $_applyShow(e = false) {
      clearTimeout(this.$_disposeTimer), clearTimeout(this.$_scheduleTimer), this.skipTransition = e, !this.isShown && (this.$_ensureTeleport(), await W(), await this.$_computePosition(), await this.$_applyShowEffect(), this.positioningDisabled || this.$_registerEventListeners([
        ...D(this.$_referenceNode),
        ...D(this.$_popperNode)
      ], "scroll", () => {
        this.$_computePosition();
      }));
    },
    async $_applyShowEffect() {
      if (this.$_hideInProgress)
        return;
      if (this.computeTransformOrigin) {
        const t = this.$_referenceNode.getBoundingClientRect(), o2 = this.$_popperNode.querySelector(".v-popper__wrapper"), i2 = o2.parentNode.getBoundingClientRect(), s2 = t.x + t.width / 2 - (i2.left + o2.offsetLeft), r2 = t.y + t.height / 2 - (i2.top + o2.offsetTop);
        this.result.transformOrigin = `${s2}px ${r2}px`;
      }
      this.isShown = true, this.$_applyAttrsToTarget({
        "aria-describedby": this.popperId,
        "data-popper-shown": ""
      });
      const e = this.showGroup;
      if (e) {
        let t;
        for (let o2 = 0; o2 < d.length; o2++)
          t = d[o2], t.showGroup !== e && (t.hide(), t.$emit("close-group"));
      }
      d.push(this), document.body.classList.add("v-popper--some-open");
      for (const t of oe(this.theme))
        pe(t).push(this), document.body.classList.add(`v-popper--some-open--${t}`);
      this.$emit("apply-show"), this.classes.showFrom = true, this.classes.showTo = false, this.classes.hideFrom = false, this.classes.hideTo = false, await W(), this.classes.showFrom = false, this.classes.showTo = true, this.noAutoFocus || this.$_popperNode.focus();
    },
    async $_applyHide(e = false) {
      if (this.shownChildren.size > 0) {
        this.$_pendingHide = true, this.$_hideInProgress = false;
        return;
      }
      if (clearTimeout(this.$_scheduleTimer), !this.isShown)
        return;
      this.skipTransition = e, ne(d, this), d.length === 0 && document.body.classList.remove("v-popper--some-open");
      for (const o2 of oe(this.theme)) {
        const i2 = pe(o2);
        ne(i2, this), i2.length === 0 && document.body.classList.remove(`v-popper--some-open--${o2}`);
      }
      g === this && (g = null), this.isShown = false, this.$_applyAttrsToTarget({
        "aria-describedby": void 0,
        "data-popper-shown": void 0
      }), clearTimeout(this.$_disposeTimer);
      const t = this.disposeTimeout;
      t !== null && (this.$_disposeTimer = setTimeout(() => {
        this.$_popperNode && (this.$_detachPopperNode(), this.isMounted = false);
      }, t)), this.$_removeEventListeners("scroll"), this.$emit("apply-hide"), this.classes.showFrom = false, this.classes.showTo = false, this.classes.hideFrom = true, this.classes.hideTo = false, await W(), this.classes.hideFrom = false, this.classes.hideTo = true;
    },
    $_autoShowHide() {
      this.shown ? this.show() : this.hide();
    },
    $_ensureTeleport() {
      if (this.$_isDisposed)
        return;
      let e = this.container;
      if (typeof e == "string" ? e = window.document.querySelector(e) : e === false && (e = this.$_targetNodes[0].parentNode), !e)
        throw new Error("No container for popover: " + this.container);
      e.appendChild(this.$_popperNode), this.isMounted = true;
    },
    $_addEventListeners() {
      const e = (o2) => {
        this.isShown && !this.$_hideInProgress || (o2.usedByTooltip = true, !this.$_preventShow && this.show({ event: o2 }));
      };
      this.$_registerTriggerListeners(this.$_targetNodes, ie, this.triggers, this.showTriggers, e), this.$_registerTriggerListeners([this.$_popperNode], ie, this.popperTriggers, this.popperShowTriggers, e);
      const t = (o2) => {
        o2.usedByTooltip || this.hide({ event: o2 });
      };
      this.$_registerTriggerListeners(this.$_targetNodes, se, this.triggers, this.hideTriggers, t), this.$_registerTriggerListeners([this.$_popperNode], se, this.popperTriggers, this.popperHideTriggers, t);
    },
    $_registerEventListeners(e, t, o2) {
      this.$_events.push({ targetNodes: e, eventType: t, handler: o2 }), e.forEach((i2) => i2.addEventListener(t, o2, _ ? {
        passive: true
      } : void 0));
    },
    $_registerTriggerListeners(e, t, o2, i2, s2) {
      let r2 = o2;
      i2 != null && (r2 = typeof i2 == "function" ? i2(r2) : i2), r2.forEach((p2) => {
        const a2 = t[p2];
        a2 && this.$_registerEventListeners(e, a2, s2);
      });
    },
    $_removeEventListeners(e) {
      const t = [];
      this.$_events.forEach((o2) => {
        const { targetNodes: i2, eventType: s2, handler: r2 } = o2;
        !e || e === s2 ? i2.forEach((p2) => p2.removeEventListener(s2, r2)) : t.push(o2);
      }), this.$_events = t;
    },
    $_refreshListeners() {
      this.$_isDisposed || (this.$_removeEventListeners(), this.$_addEventListeners());
    },
    $_handleGlobalClose(e, t = false) {
      this.$_showFrameLocked || (this.hide({ event: e }), e.closePopover ? this.$emit("close-directive") : this.$emit("auto-hide"), t && (this.$_preventShow = true, setTimeout(() => {
        this.$_preventShow = false;
      }, 300)));
    },
    $_detachPopperNode() {
      this.$_popperNode.parentNode && this.$_popperNode.parentNode.removeChild(this.$_popperNode);
    },
    $_swapTargetAttrs(e, t) {
      for (const o2 of this.$_targetNodes) {
        const i2 = o2.getAttribute(e);
        i2 && (o2.removeAttribute(e), o2.setAttribute(t, i2));
      }
    },
    $_applyAttrsToTarget(e) {
      for (const t of this.$_targetNodes)
        for (const o2 in e) {
          const i2 = e[o2];
          i2 == null ? t.removeAttribute(o2) : t.setAttribute(o2, i2);
        }
    },
    $_updateParentShownChildren(e) {
      let t = this.parentPopper;
      for (; t; )
        e ? t.shownChildren.add(this.randomId) : (t.shownChildren.delete(this.randomId), t.$_pendingHide && t.hide()), t = t.parentPopper;
    },
    $_isAimingPopper() {
      const e = this.$_referenceNode.getBoundingClientRect();
      if (v >= e.left && v <= e.right && y >= e.top && y <= e.bottom) {
        const t = this.$_popperNode.getBoundingClientRect(), o2 = v - f, i2 = y - m, r2 = t.left + t.width / 2 - f + (t.top + t.height / 2) - m + t.width + t.height, p2 = f + o2 * r2, a2 = m + i2 * r2;
        return S(f, m, p2, a2, t.left, t.top, t.left, t.bottom) || // Left edge
        S(f, m, p2, a2, t.left, t.top, t.right, t.top) || // Top edge
        S(f, m, p2, a2, t.right, t.top, t.right, t.bottom) || // Right edge
        S(f, m, p2, a2, t.left, t.bottom, t.right, t.bottom);
      }
      return false;
    }
  },
  render() {
    return this.$slots.default(this.slotData);
  }
});
typeof document < "u" && typeof window < "u" && (me ? (document.addEventListener("touchstart", ae, _ ? {
  passive: true,
  capture: true
} : true), document.addEventListener("touchend", Ze, _ ? {
  passive: true,
  capture: true
} : true)) : (window.addEventListener("mousedown", ae, true), window.addEventListener("click", Qe, true)), window.addEventListener("resize", ot));
function ae(e) {
  for (let t = 0; t < d.length; t++) {
    const o2 = d[t];
    try {
      const i2 = o2.popperNode();
      o2.$_mouseDownContains = i2.contains(e.target);
    } catch {
    }
  }
}
function Qe(e) {
  $e(e);
}
function Ze(e) {
  $e(e, true);
}
function $e(e, t = false) {
  const o2 = {};
  for (let i2 = d.length - 1; i2 >= 0; i2--) {
    const s2 = d[i2];
    try {
      const r2 = s2.$_containsGlobalTarget = et(s2, e);
      s2.$_pendingHide = false, requestAnimationFrame(() => {
        if (s2.$_pendingHide = false, !o2[s2.randomId] && de(s2, r2, e)) {
          if (s2.$_handleGlobalClose(e, t), !e.closeAllPopover && e.closePopover && r2) {
            let a2 = s2.parentPopper;
            for (; a2; )
              o2[a2.randomId] = true, a2 = a2.parentPopper;
            return;
          }
          let p2 = s2.parentPopper;
          for (; p2 && de(p2, p2.$_containsGlobalTarget, e); ) {
            p2.$_handleGlobalClose(e, t);
            p2 = p2.parentPopper;
          }
        }
      });
    } catch {
    }
  }
}
function et(e, t) {
  const o2 = e.popperNode();
  return e.$_mouseDownContains || o2.contains(t.target);
}
function de(e, t, o2) {
  return o2.closeAllPopover || o2.closePopover && t || tt(e, o2) && !t;
}
function tt(e, t) {
  if (typeof e.autoHide == "function") {
    const o2 = e.autoHide(t);
    return e.lastAutoHide = o2, o2;
  }
  return e.autoHide;
}
function ot(e) {
  for (let t = 0; t < d.length; t++)
    d[t].$_computePosition(e);
}
let f = 0, m = 0, v = 0, y = 0;
typeof window < "u" && window.addEventListener("mousemove", (e) => {
  f = v, m = y, v = e.clientX, y = e.clientY;
}, _ ? {
  passive: true
} : void 0);
function S(e, t, o2, i2, s2, r2, p2, a2) {
  const l2 = ((p2 - s2) * (t - r2) - (a2 - r2) * (e - s2)) / ((a2 - r2) * (o2 - e) - (p2 - s2) * (i2 - t)), h2 = ((o2 - e) * (t - r2) - (i2 - t) * (e - s2)) / ((a2 - r2) * (o2 - e) - (p2 - s2) * (i2 - t));
  return l2 >= 0 && l2 <= 1 && h2 >= 0 && h2 <= 1;
}
const it = {
  extends: K()
}, k = (e, t) => {
  const o2 = e.__vccOpts || e;
  for (const [i2, s2] of t)
    o2[i2] = s2;
  return o2;
};
function st(e, t, o2, i2, s2, r2) {
  return openBlock(), createElementBlock("div", {
    ref: "reference",
    class: normalizeClass(["v-popper", {
      "v-popper--shown": e.slotData.isShown
    }])
  }, [
    renderSlot(e.$slots, "default", normalizeProps(guardReactiveProps(e.slotData)))
  ], 2);
}
const nt = /* @__PURE__ */ k(it, [["render", st]]);
function rt() {
  var e = window.navigator.userAgent, t = e.indexOf("MSIE ");
  if (t > 0)
    return parseInt(e.substring(t + 5, e.indexOf(".", t)), 10);
  var o2 = e.indexOf("Trident/");
  if (o2 > 0) {
    var i2 = e.indexOf("rv:");
    return parseInt(e.substring(i2 + 3, e.indexOf(".", i2)), 10);
  }
  var s2 = e.indexOf("Edge/");
  return s2 > 0 ? parseInt(e.substring(s2 + 5, e.indexOf(".", s2)), 10) : -1;
}
let z;
function U() {
  U.init || (U.init = true, z = rt() !== -1);
}
var E = {
  name: "ResizeObserver",
  props: {
    emitOnMount: {
      type: Boolean,
      default: false
    },
    ignoreWidth: {
      type: Boolean,
      default: false
    },
    ignoreHeight: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    "notify"
  ],
  mounted() {
    U(), nextTick(() => {
      this._w = this.$el.offsetWidth, this._h = this.$el.offsetHeight, this.emitOnMount && this.emitSize();
    });
    const e = document.createElement("object");
    this._resizeObject = e, e.setAttribute("aria-hidden", "true"), e.setAttribute("tabindex", -1), e.onload = this.addResizeHandlers, e.type = "text/html", z && this.$el.appendChild(e), e.data = "about:blank", z || this.$el.appendChild(e);
  },
  beforeUnmount() {
    this.removeResizeHandlers();
  },
  methods: {
    compareAndNotify() {
      (!this.ignoreWidth && this._w !== this.$el.offsetWidth || !this.ignoreHeight && this._h !== this.$el.offsetHeight) && (this._w = this.$el.offsetWidth, this._h = this.$el.offsetHeight, this.emitSize());
    },
    emitSize() {
      this.$emit("notify", {
        width: this._w,
        height: this._h
      });
    },
    addResizeHandlers() {
      this._resizeObject.contentDocument.defaultView.addEventListener("resize", this.compareAndNotify), this.compareAndNotify();
    },
    removeResizeHandlers() {
      this._resizeObject && this._resizeObject.onload && (!z && this._resizeObject.contentDocument && this._resizeObject.contentDocument.defaultView.removeEventListener("resize", this.compareAndNotify), this.$el.removeChild(this._resizeObject), this._resizeObject.onload = null, this._resizeObject = null);
    }
  }
};
const pt = /* @__PURE__ */ withScopeId();
pushScopeId("data-v-b329ee4c");
const at = {
  class: "resize-observer",
  tabindex: "-1"
};
popScopeId();
const dt = /* @__PURE__ */ pt((e, t, o2, i2, s2, r2) => (openBlock(), createBlock("div", at)));
E.render = dt;
E.__scopeId = "data-v-b329ee4c";
E.__file = "src/components/ResizeObserver.vue";
const J = (e = "theme") => ({
  computed: {
    themeClass() {
      return Je(this[e]);
    }
  }
}), ht = defineComponent({
  name: "VPopperContent",
  components: {
    ResizeObserver: E
  },
  mixins: [
    J()
  ],
  props: {
    popperId: String,
    theme: String,
    shown: Boolean,
    mounted: Boolean,
    skipTransition: Boolean,
    autoHide: Boolean,
    handleResize: Boolean,
    classes: Object,
    result: Object
  },
  emits: [
    "hide",
    "resize"
  ],
  methods: {
    toPx(e) {
      return e != null && !isNaN(e) ? `${e}px` : null;
    }
  }
});
const lt = ["id", "aria-hidden", "tabindex", "data-popper-placement"], ut = {
  ref: "inner",
  class: "v-popper__inner"
}, ct = /* @__PURE__ */ createBaseVNode("div", { class: "v-popper__arrow-outer" }, null, -1), ft = /* @__PURE__ */ createBaseVNode("div", { class: "v-popper__arrow-inner" }, null, -1), mt = [
  ct,
  ft
];
function gt(e, t, o2, i2, s2, r2) {
  const p2 = resolveComponent("ResizeObserver");
  return openBlock(), createElementBlock("div", {
    id: e.popperId,
    ref: "popover",
    class: normalizeClass(["v-popper__popper", [
      e.themeClass,
      e.classes.popperClass,
      {
        "v-popper__popper--shown": e.shown,
        "v-popper__popper--hidden": !e.shown,
        "v-popper__popper--show-from": e.classes.showFrom,
        "v-popper__popper--show-to": e.classes.showTo,
        "v-popper__popper--hide-from": e.classes.hideFrom,
        "v-popper__popper--hide-to": e.classes.hideTo,
        "v-popper__popper--skip-transition": e.skipTransition,
        "v-popper__popper--arrow-overflow": e.result && e.result.arrow.overflow,
        "v-popper__popper--no-positioning": !e.result
      }
    ]]),
    style: normalizeStyle(e.result ? {
      position: e.result.strategy,
      transform: `translate3d(${Math.round(e.result.x)}px,${Math.round(e.result.y)}px,0)`
    } : void 0),
    "aria-hidden": e.shown ? "false" : "true",
    tabindex: e.autoHide ? 0 : void 0,
    "data-popper-placement": e.result ? e.result.placement : void 0,
    onKeyup: t[2] || (t[2] = withKeys((a2) => e.autoHide && e.$emit("hide"), ["esc"]))
  }, [
    createBaseVNode("div", {
      class: "v-popper__backdrop",
      onClick: t[0] || (t[0] = (a2) => e.autoHide && e.$emit("hide"))
    }),
    createBaseVNode("div", {
      class: "v-popper__wrapper",
      style: normalizeStyle(e.result ? {
        transformOrigin: e.result.transformOrigin
      } : void 0)
    }, [
      createBaseVNode("div", ut, [
        e.mounted ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
          createBaseVNode("div", null, [
            renderSlot(e.$slots, "default")
          ]),
          e.handleResize ? (openBlock(), createBlock(p2, {
            key: 0,
            onNotify: t[1] || (t[1] = (a2) => e.$emit("resize", a2))
          })) : createCommentVNode("", true)
        ], 64)) : createCommentVNode("", true)
      ], 512),
      createBaseVNode("div", {
        ref: "arrow",
        class: "v-popper__arrow-container",
        style: normalizeStyle(e.result ? {
          left: e.toPx(e.result.arrow.x),
          top: e.toPx(e.result.arrow.y)
        } : void 0)
      }, mt, 4)
    ], 4)
  ], 46, lt);
}
const Q = /* @__PURE__ */ k(ht, [["render", gt]]), Z = {
  methods: {
    show(...e) {
      return this.$refs.popper.show(...e);
    },
    hide(...e) {
      return this.$refs.popper.hide(...e);
    },
    dispose(...e) {
      return this.$refs.popper.dispose(...e);
    },
    onResize(...e) {
      return this.$refs.popper.onResize(...e);
    }
  }
}, $t = defineComponent({
  name: "VPopperWrapper",
  components: {
    Popper: nt,
    PopperContent: Q
  },
  mixins: [
    Z,
    J("finalTheme")
  ],
  props: {
    theme: {
      type: String,
      default: null
    }
  },
  computed: {
    finalTheme() {
      return this.theme ?? this.$options.vPopperTheme;
    }
  },
  methods: {
    getTargetNodes() {
      return Array.from(this.$el.children).filter((e) => e !== this.$refs.popperContent.$el);
    }
  }
});
function _t(e, t, o2, i2, s2, r2) {
  const p2 = resolveComponent("PopperContent"), a2 = resolveComponent("Popper");
  return openBlock(), createBlock(a2, {
    ref: "popper",
    theme: e.finalTheme,
    "target-nodes": e.getTargetNodes,
    "popper-node": () => e.$refs.popperContent.$el,
    class: normalizeClass([
      e.themeClass
    ])
  }, {
    default: withCtx(({
      popperId: l2,
      isShown: h2,
      shouldMountContent: B2,
      skipTransition: D2,
      autoHide: I,
      show: R2,
      hide: w2,
      handleResize: F2,
      onResize: V,
      classes: j,
      result: Oe
    }) => [
      renderSlot(e.$slots, "default", {
        shown: h2,
        show: R2,
        hide: w2
      }),
      createVNode(p2, {
        ref: "popperContent",
        "popper-id": l2,
        theme: e.finalTheme,
        shown: h2,
        mounted: B2,
        "skip-transition": D2,
        "auto-hide": I,
        "handle-resize": F2,
        classes: j,
        result: Oe,
        onHide: w2,
        onResize: V
      }, {
        default: withCtx(() => [
          renderSlot(e.$slots, "popper", {
            shown: h2,
            hide: w2
          })
        ]),
        _: 2
      }, 1032, ["popper-id", "theme", "shown", "mounted", "skip-transition", "auto-hide", "handle-resize", "classes", "result", "onHide", "onResize"])
    ]),
    _: 3
  }, 8, ["theme", "target-nodes", "popper-node", "class"]);
}
const L = /* @__PURE__ */ k($t, [["render", _t]]), _e = {
  ...L,
  name: "VDropdown",
  vPopperTheme: "dropdown"
};
const we = {
  ...L,
  name: "VMenu",
  vPopperTheme: "menu"
}, ve = {
  ...L,
  name: "VTooltip",
  vPopperTheme: "tooltip"
};
const wt = defineComponent({
  name: "VTooltipDirective",
  components: {
    Popper: K(),
    PopperContent: Q
  },
  mixins: [
    Z
  ],
  inheritAttrs: false,
  props: {
    theme: {
      type: String,
      default: "tooltip"
    },
    html: {
      type: Boolean,
      default: (e) => b(e.theme, "html")
    },
    content: {
      type: [String, Number, Function],
      default: null
    },
    loadingContent: {
      type: String,
      default: (e) => b(e.theme, "loadingContent")
    },
    targetNodes: {
      type: Function,
      required: true
    }
  },
  data() {
    return {
      asyncContent: null
    };
  },
  computed: {
    isContentAsync() {
      return typeof this.content == "function";
    },
    loading() {
      return this.isContentAsync && this.asyncContent == null;
    },
    finalContent() {
      return this.isContentAsync ? this.loading ? this.loadingContent : this.asyncContent : this.content;
    }
  },
  watch: {
    content: {
      handler() {
        this.fetchContent(true);
      },
      immediate: true
    },
    async finalContent() {
      await this.$nextTick(), this.$refs.popper.onResize();
    }
  },
  created() {
    this.$_fetchId = 0;
  },
  methods: {
    fetchContent(e) {
      if (typeof this.content == "function" && this.$_isShown && (e || !this.$_loading && this.asyncContent == null)) {
        this.asyncContent = null, this.$_loading = true;
        const t = ++this.$_fetchId, o2 = this.content(this);
        o2.then ? o2.then((i2) => this.onResult(t, i2)) : this.onResult(t, o2);
      }
    },
    onResult(e, t) {
      e === this.$_fetchId && (this.$_loading = false, this.asyncContent = t);
    },
    onShow() {
      this.$_isShown = true, this.fetchContent();
    },
    onHide() {
      this.$_isShown = false;
    }
  }
}), vt = ["innerHTML"], yt = ["textContent"];
function Pt(e, t, o2, i2, s2, r2) {
  const p2 = resolveComponent("PopperContent"), a2 = resolveComponent("Popper");
  return openBlock(), createBlock(a2, mergeProps({ ref: "popper" }, e.$attrs, {
    theme: e.theme,
    "target-nodes": e.targetNodes,
    "popper-node": () => e.$refs.popperContent.$el,
    onApplyShow: e.onShow,
    onApplyHide: e.onHide
  }), {
    default: withCtx(({
      popperId: l2,
      isShown: h2,
      shouldMountContent: B2,
      skipTransition: D2,
      autoHide: I,
      hide: R2,
      handleResize: w2,
      onResize: F2,
      classes: V,
      result: j
    }) => [
      createVNode(p2, {
        ref: "popperContent",
        class: normalizeClass({
          "v-popper--tooltip-loading": e.loading
        }),
        "popper-id": l2,
        theme: e.theme,
        shown: h2,
        mounted: B2,
        "skip-transition": D2,
        "auto-hide": I,
        "handle-resize": w2,
        classes: V,
        result: j,
        onHide: R2,
        onResize: F2
      }, {
        default: withCtx(() => [
          e.html ? (openBlock(), createElementBlock("div", {
            key: 0,
            innerHTML: e.finalContent
          }, null, 8, vt)) : (openBlock(), createElementBlock("div", {
            key: 1,
            textContent: toDisplayString(e.finalContent)
          }, null, 8, yt))
        ]),
        _: 2
      }, 1032, ["class", "popper-id", "theme", "shown", "mounted", "skip-transition", "auto-hide", "handle-resize", "classes", "result", "onHide", "onResize"])
    ]),
    _: 1
  }, 16, ["theme", "target-nodes", "popper-node", "onApplyShow", "onApplyHide"]);
}
const ye = /* @__PURE__ */ k(wt, [["render", Pt]]), Pe = "v-popper--has-tooltip";
function Tt(e, t) {
  let o2 = e.placement;
  if (!o2 && t)
    for (const i2 of ge)
      t[i2] && (o2 = i2);
  return o2 || (o2 = b(e.theme || "tooltip", "placement")), o2;
}
function Te(e, t, o2) {
  let i2;
  const s2 = typeof t;
  return s2 === "string" ? i2 = { content: t } : t && s2 === "object" ? i2 = t : i2 = { content: false }, i2.placement = Tt(i2, o2), i2.targetNodes = () => [e], i2.referenceNode = () => e, i2;
}
let q, C, bt = 0;
function Ct() {
  if (q)
    return;
  C = ref([]), q = createApp({
    name: "VTooltipDirectiveApp",
    setup() {
      return {
        directives: C
      };
    },
    render() {
      return this.directives.map((t) => h$1(ye, {
        ...t.options,
        shown: t.shown || t.options.shown,
        key: t.id
      }));
    },
    devtools: {
      hide: true
    }
  });
  const e = document.createElement("div");
  document.body.appendChild(e), q.mount(e);
}
function St(e, t, o2) {
  Ct();
  const i2 = ref(Te(e, t, o2)), s2 = ref(false), r2 = {
    id: bt++,
    options: i2,
    shown: s2
  };
  return C.value.push(r2), e.classList && e.classList.add(Pe), e.$_popper = {
    options: i2,
    item: r2,
    show() {
      s2.value = true;
    },
    hide() {
      s2.value = false;
    }
  };
}
function be(e) {
  if (e.$_popper) {
    const t = C.value.indexOf(e.$_popper.item);
    t !== -1 && C.value.splice(t, 1), delete e.$_popper, delete e.$_popperOldShown, delete e.$_popperMountTarget;
  }
  e.classList && e.classList.remove(Pe);
}
function he(e, { value: t, modifiers: o2 }) {
  const i2 = Te(e, t, o2);
  if (!i2.content || b(i2.theme || "tooltip", "disabled"))
    be(e);
  else {
    let s2;
    e.$_popper ? (s2 = e.$_popper, s2.options.value = i2) : s2 = St(e, t, o2), typeof t.shown < "u" && t.shown !== e.$_popperOldShown && (e.$_popperOldShown = t.shown, t.shown ? s2.show() : s2.hide());
  }
}
const Ce = {
  beforeMount: he,
  updated: he,
  beforeUnmount(e) {
    be(e);
  }
};
function le(e) {
  e.addEventListener("click", Se), e.addEventListener("touchstart", ze, _ ? {
    passive: true
  } : false);
}
function ue(e) {
  e.removeEventListener("click", Se), e.removeEventListener("touchstart", ze), e.removeEventListener("touchend", Ne), e.removeEventListener("touchcancel", Ae);
}
function Se(e) {
  const t = e.currentTarget;
  e.closePopover = !t.$_vclosepopover_touch, e.closeAllPopover = t.$_closePopoverModifiers && !!t.$_closePopoverModifiers.all;
}
function ze(e) {
  if (e.changedTouches.length === 1) {
    const t = e.currentTarget;
    t.$_vclosepopover_touch = true;
    const o2 = e.changedTouches[0];
    t.$_vclosepopover_touchPoint = o2, t.addEventListener("touchend", Ne), t.addEventListener("touchcancel", Ae);
  }
}
function Ne(e) {
  const t = e.currentTarget;
  if (t.$_vclosepopover_touch = false, e.changedTouches.length === 1) {
    const o2 = e.changedTouches[0], i2 = t.$_vclosepopover_touchPoint;
    e.closePopover = Math.abs(o2.screenY - i2.screenY) < 20 && Math.abs(o2.screenX - i2.screenX) < 20, e.closeAllPopover = t.$_closePopoverModifiers && !!t.$_closePopoverModifiers.all;
  }
}
function Ae(e) {
  const t = e.currentTarget;
  t.$_vclosepopover_touch = false;
}
const He = {
  beforeMount(e, { value: t, modifiers: o2 }) {
    e.$_closePopoverModifiers = o2, (typeof t > "u" || t) && le(e);
  },
  updated(e, { value: t, oldValue: o2, modifiers: i2 }) {
    e.$_closePopoverModifiers = i2, t !== o2 && (typeof t > "u" || t ? le(e) : ue(e));
  },
  beforeUnmount(e) {
    ue(e);
  }
};
function zt(e, t = {}) {
  e.$_vTooltipInstalled || (e.$_vTooltipInstalled = true, fe(u, t), e.directive("tooltip", Ce), e.directive("close-popper", He), e.component("VTooltip", ve), e.component("VDropdown", _e), e.component("VMenu", we));
}
const xt = {
  // eslint-disable-next-line no-undef
  version: "2.0.0-beta.24",
  install: zt,
  options: u
};
export {
  xt as x
};
