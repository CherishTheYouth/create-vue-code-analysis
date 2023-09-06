import * as esbuild from 'esbuild'
import esbuildPluginLicense from 'esbuild-plugin-license'

const CORE_LICENSE = `MIT License

Copyright (c) 2021-present vuejs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
// esbuild.build 是 esbuild 的JavaScript Api.
// build 函数会在子进程中运行 esbuild 的可执行文件，并返回一个 Promise， 当构建完成后，该 Promise 将被 resolve
await esbuild.build({
  bundle: true, // 默认情况下，esbuild 不会打包入口文件，必须开启bundle 显式调用
  entryPoints: ['index.ts'], // 入口文件，如果传入多个入口文件，则会生成多个单独的bundle，如果需要将多个文件打包成单文件，需要在一个入口文件引入所有文件
  outfile: 'outfile.cjs', // 该配置项为 build 操作设置输出文件名。这仅在单个入口点时适用。 如果有多个入口点，你必须使用 outdir 配置项来制定输出文件夹。
  format: 'cjs', // 为生成的 JavaScript 文件设置输出格式。有三个可能的值：iife、cjs 与 esm
  platform: 'node', // 默认情况下，esbuild 的打包器为浏览器生成代码。 如果你打包好的代码想要在 node 环境中运行，你应该设置 platform 为 node
  target: 'node14', // 此配置项设置生成 JavaScript 代码的目标环境, 此处表示 node 版本要大于等于14

  // The plugin API allows you to inject code into various parts of the build process(插件API允许您将代码注入构建过程的各个部分。)
  // it's not available from the command line. You must write either JavaScript or Go code to use the plugin API.
  // (它不能从命令行使用。您必须编写JavaScript或Go代码才能使用插件API。)
  plugins: [
    // An esbuild plugin is an object with a name and a setup function;(一个插件包含一个name属性和一个setup方法)
    // They are passed in an array to the build API call(多个插件放到一个数组中传递给build Api 调用)
    // setup 函数仅调用一次
    {
      name: 'alias',
      setup({ onResolve, resolve }) {
        // 使用onResolve添加的回调将在esbuild构建的每个模块中的每个导入路径上运行。回调可以自定义esbuild如何进行路径解析
        onResolve({ filter: /^prompts$/, namespace: 'file' }, async ({ importer, resolveDir }) => {
          // we can always use non-transpiled code since we support 14.16.0+
          const result = await resolve('prompts/lib/index.js', {
            importer,
            resolveDir,
            kind: 'import-statement'
          })
          console.log('esbuild-prompts-result', result)
          return result
        })
      }
    },
    esbuildPluginLicense({
      thirdParty: {
        includePrivate: false,
        output: {
          file: 'LICENSE',
          template(allDependencies) {
            // There's a bug in the plugin that it also includes the `create-vue` package itself
            const dependencies = allDependencies.filter((d) => d.packageJson.name !== 'create-vue')
            const licenseText =
              `# create-vue core license\n\n` +
              `create-vue is released under the MIT license:\n\n` +
              CORE_LICENSE +
              `\n## Licenses of bundled dependencies\n\n` +
              `The published create-vue artifact additionally contains code with the following licenses:\n` +
              [...new Set(dependencies.map((dependency) => dependency.packageJson.license))].join(
                ', '
              ) +
              '\n\n' +
              `## Bundled dependencies\n\n` +
              dependencies
                .map((dependency) => {
                  return (
                    `## ${dependency.packageJson.name}\n\n` +
                    `License: ${dependency.packageJson.license}\n` +
                    `By: ${dependency.packageJson.author.name}\n` +
                    `Repository: ${dependency.packageJson.repository.url}\n\n` +
                    dependency.licenseText
                      .split('\n')
                      .map((line) => (line ? `> ${line}` : '>'))
                      .join('\n')
                  )
                })
                .join('\n\n')

            return licenseText
          }
        }
      }
    })
  ]
})
