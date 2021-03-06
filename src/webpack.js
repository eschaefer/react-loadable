'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');

function buildManifest(compiler, compilation) {
  let context = compiler.options.context;
  let manifest = {};

  for (const chunkGroup of compilation.chunkGroups) {
    let files = []
    for (const chunk of chunkGroup.chunks) {
      for (const file of chunk.files) {
        let publicPath = url.resolve(compilation.outputOptions.publicPath || '', file);
        files.push({
          file,
          publicPath,
          chunkName: chunk.name,
        })
      }
    }
    for (const block of chunkGroup.blocksIterable) {
      let name
      let id = null
      let dependency = block.module.dependencies.find(dep => block.request === dep.request)
      if (dependency) {
        let module = dependency.module
        id = module.id
        name = typeof module.libIdent === 'function' ? module.libIdent({ context }) : null
      }
      for (const file of files) {
        file.id = id
        file.name = name
      }
      manifest[block.request] = files
    }
  }

  return manifest;
}

class ReactLoadablePlugin {
  constructor(opts = {}) {
    this.filename = opts.filename;
  }

  apply(compiler) {
    const emit = (compilation, callback) => {
      const manifest = buildManifest(compiler, compilation);
      var json = JSON.stringify(manifest, null, 2);
      compilation.assets[this.filename] = {
        source() {
          return json;
        },
        size() {
          return json.length
        }
      }
      callback();
    }
    if (compiler.hooks) {
      const plugin = { name: 'ReactLoadablePlugin' };
      compiler.hooks.emit.tapAsync(plugin, emit);
    } else {
      compiler.plugin('emit', emit);
    }
  }
}

function getBundles(manifest, moduleIds) {
  return moduleIds.reduce((bundles, moduleId) => {
    return bundles.concat(manifest[moduleId]);
  }, []);
}

exports.ReactLoadablePlugin = ReactLoadablePlugin;
exports.getBundles = getBundles;
