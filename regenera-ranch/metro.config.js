// Config Metro para soportar el monorepo con npm workspaces.
// Doc: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1) Mirar también node_modules del workspace root.
config.watchFolders = [workspaceRoot];

// 2) Resolver módulos primero en el proyecto, después en el root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3) Si hay duplicados, preferir la versión hoisted del workspace.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
