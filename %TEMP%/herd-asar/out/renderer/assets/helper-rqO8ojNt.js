function isEmptyObject(obj) {
  if (obj === null || obj === void 0) {
    return true;
  }
  return Object.keys(obj).length === 0;
}
function getHumanReadableProviderName(name) {
  switch (name) {
    case "forge":
      return "Forge";
    case "vapor":
      return "Vapor";
    default:
      return "Unknown";
  }
}
function getRemoteTabIdentifier(site) {
  if (site.type === "forge") {
    return "remote_forge_" + site.serverId + "_" + site.siteId;
  } else if (site.type === "vapor") {
    return `remote_vapor_${site.siteDomain}`;
  }
  return "remote_unknown";
}
export {
  getHumanReadableProviderName as a,
  getRemoteTabIdentifier as g,
  isEmptyObject as i
};
