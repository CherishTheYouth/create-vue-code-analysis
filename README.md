# create-vue脚手架是怎么实现的？

## 先把源码clone下来

目录结构如下：

```txt
F:\Study\Vue\Code\VueSourceCode\create-vue
├── CONTRIBUTING.md
├── index.ts
├── LICENSE
├── media
|  └── screenshot-cli.png
├── package.json
├── playground
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── renovate.json
├── scripts
|  ├── build.mjs
|  ├── prepublish.mjs
|  ├── snapshot.mjs
|  └── test.mjs
├── template
|  ├── base
|  |  ├── index.html
|  |  ├── package.json
|  |  ├── public
|  |  |  └── favicon.ico
|  |  ├── src
|  |  |  └── assets
|  |  |     ├── base.css
|  |  |     ├── logo.svg
|  |  |     └── main.css
|  |  ├── vite.config.js
|  |  └── _gitignore
|  ├── code
|  |  ├── default
|  |  |  └── src
|  |  |     ├── App.vue
|  |  |     └── components
|  |  ├── router
|  |  |  └── src
|  |  |     ├── App.vue
|  |  |     ├── components
|  |  |     ├── router
|  |  |     └── views
|  |  ├── typescript-default
|  |  |  └── src
|  |  |     ├── App.vue
|  |  |     └── components
|  |  └── typescript-router
|  |     └── src
|  |        ├── App.vue
|  |        ├── components
|  |        ├── router
|  |        └── views
|  ├── config
|  |  ├── cypress
|  |  |  ├── cypress
|  |  |  |  ├── e2e
|  |  |  |  ├── fixtures
|  |  |  |  └── support
|  |  |  ├── cypress.config.js
|  |  |  ├── cypress.config.ts
|  |  |  └── package.json
|  |  ├── cypress-ct
|  |  |  ├── cypress
|  |  |  |  └── support
|  |  |  ├── cypress.config.js
|  |  |  ├── cypress.config.ts
|  |  |  ├── package.json
|  |  |  └── src
|  |  |     └── components
|  |  ├── jsx
|  |  |  ├── package.json
|  |  |  └── vite.config.js
|  |  ├── pinia
|  |  |  ├── package.json
|  |  |  └── src
|  |  |     └── stores
|  |  ├── playwright
|  |  |  ├── e2e
|  |  |  |  ├── vue.spec.js
|  |  |  |  └── vue.spec.ts
|  |  |  ├── package.json
|  |  |  ├── playwright.config.js
|  |  |  ├── playwright.config.ts
|  |  |  └── _gitignore
|  |  ├── router
|  |  |  └── package.json
|  |  ├── typescript
|  |  |  ├── env.d.ts
|  |  |  └── package.json
|  |  └── vitest
|  |     ├── package.json
|  |     ├── src
|  |     |  └── components
|  |     └── vitest.config.js
|  ├── entry
|  |  ├── default
|  |  |  └── src
|  |  |     └── main.js
|  |  ├── pinia
|  |  |  └── src
|  |  |     └── main.js
|  |  ├── router
|  |  |  └── src
|  |  |     └── main.js
|  |  └── router-and-pinia
|  |     └── src
|  |        └── main.js
|  ├── eslint
|  |  └── package.json
|  └── tsconfig
|     ├── base
|     |  ├── package.json
|     |  ├── tsconfig.app.json
|     |  ├── tsconfig.json
|     |  └── tsconfig.node.json
|     ├── cypress
|     |  └── cypress
|     |     └── e2e
|     ├── cypress-ct
|     |  ├── package.json
|     |  ├── tsconfig.cypress-ct.json
|     |  └── tsconfig.json
|     ├── playwright
|     |  └── e2e
|     |     └── tsconfig.json
|     └── vitest
|        ├── package.json
|        ├── tsconfig.json
|        └── tsconfig.vitest.json
├── tsconfig.json
└── utils
   ├── banners.ts
   ├── deepMerge.ts
   ├── directoryTraverse.ts
   ├── generateReadme.ts
   ├── getCommand.ts
   ├── renderEslint.ts
   ├── renderTemplate.ts
   └── sortDependencies.ts
```

放一个层级浅些的：

```txt
F:\Study\Vue\Code\VueSourceCode\create-vue
├── CONTRIBUTING.md
├── create-vue-tree.txt
├── index.ts
├── LICENSE
├── media
|  └── screenshot-cli.png
├── package.json
├── playground
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── renovate.json
├── scripts
|  ├── build.mjs
|  ├── prepublish.mjs
|  ├── snapshot.mjs
|  └── test.mjs
├── template
|  ├── base
|  ├── code
|  ├── config
|  ├── entry
|  ├── eslint
|  └── tsconfig
├── tsconfig.json
└── utils
   ├── banners.ts
   ├── deepMerge.ts
   ├── directoryTraverse.ts
   ├── generateReadme.ts
   ├── getCommand.ts
   ├── renderEslint.ts
   ├── renderTemplate.ts
   └── sortDependencies.ts
```

## 看看package.json

看看整个项目中用到了那些依赖，那些技术点，都是干啥的？

```json
{
  "name": "create-vue",
  "version": "3.6.4",
  "description": "An easy way to start a Vue project",
  "type": "module",
  "bin": {
    "create-vue": "outfile.cjs"
  },
  "files": [
    "outfile.cjs",
    "template"
  ],
  "engines": {
    "node": ">=v16.20.0"
  },
  "scripts": {
    "prepare": "husky install",
    "format": "prettier --write .",
    "build": "zx ./scripts/build.mjs",
    "snapshot": "zx ./scripts/snapshot.mjs",
    "pretest": "run-s build snapshot",
    "test": "zx ./scripts/test.mjs",
    "prepublishOnly": "zx ./scripts/prepublish.mjs"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/vuejs/create-vue.git"
  },
  "keywords": [],
  "author": "Haoqun Jiang <haoqunjiang+npm@gmail.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/vuejs/create-vue/issues"
  },
  "homepage": "https://github.com/vuejs/create-vue#readme",
  "devDependencies": {
    "@tsconfig/node18": "^2.0.1", 
    "@types/eslint": "^8.37.0",
    "@types/node": "^18.16.8",
    "@types/prompts": "^2.4.4",
    "@vue/create-eslint-config": "^0.2.1",
    "@vue/tsconfig": "^0.4.0",
    "esbuild": "^0.17.18",
    "esbuild-plugin-license": "^1.2.2",
    "husky": "^8.0.3",
    "kolorist": "^1.8.0",
    "lint-staged": "^13.2.2",
    "minimist": "^1.2.8",
    "npm-run-all": "^4.1.5",
    "prettier": "^2.8.8",
    "prompts": "^2.4.2",
    "zx": "^4.3.0"
  },
  "lint-staged": {
    "*.{js,ts,vue,json}": [
      "prettier --write"
    ]
  }
}

```

每个包的作用是啥？

1. @tsconfig/node18

   > node.js18配套的tsconfig

2. @types/eslint

   > eslint相关

3. @types/node

   > node.js的类型定义

4. @types/prompts

   > prompts 库的类型定义

5. @vue/create-eslint-config

   > 在Vue.js项目中设置ESLint的实用程序。

6. @vue/tsconfig

   > 用于Vue项目的TS Configure扩展。

7. esbuild

   > 这是一个JavaScript打包器和压缩器。

8. esbuild-plugin-license

   > 许可证生成工具

9. husky

   > git 钩子规范工具

10. kolorist

    > 给stdin/stdout的文本内容添加颜色

11. lint-staged

    > 格式化代码

12. minimist

    > 解析参数选项， 应该是当用户从 terminal 中输入命令指令时，帮助解析各个参数的工具

13. npm-run-all

    > 一个CLI工具，用于并行或顺序运行多个npm-script。

14. prettier

    > 代码格式化的

15. prompts

    > 轻巧、美观、人性化的交互式提示。在 terminal 中做对话交互的。

16. zx

    > Bash很棒，但当涉及到编写更复杂的脚本时，许多人更喜欢更方便的编程语言。JavaScript是一个完美的选择，但是Node.js标准库在使用之前需要额外的麻烦。zx包为child_process提供了有用的包装器，转义参数并给出了合理的默认值。

可以看到，这16个依赖，真正和cli功能紧密相关的应该是以下几个：

- esbuild
- kolorist
- minimist
- npm-run-all
- prompts
- zx

所以，学习 create-vue 的之前，可以先阅读以下几个库的基本使用方法，以便在阅读源码过程中，遇到有知识点盲区的，可以定向学习。

## 然后看一下项目的目录机构

```txt
F:\Study\Vue\Code\VueSourceCode\create-vue
├── CONTRIBUTING.md
├── create-vue-tree.txt
├── index.ts
├── LICENSE
├── media
|  └── screenshot-cli.png
├── package.json
├── playground
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
├── renovate.json
├── scripts
|  ├── build.mjs
|  ├── prepublish.mjs
|  ├── snapshot.mjs
|  └── test.mjs
├── template
|  ├── base
|  ├── code
|  ├── config
|  ├── entry
|  ├── eslint
|  └── tsconfig
├── tsconfig.json
└── utils
   ├── banners.ts
   ├── deepMerge.ts
   ├── directoryTraverse.ts
   ├── generateReadme.ts
   ├── getCommand.ts
   ├── renderEslint.ts
   ├── renderTemplate.ts
   └── sortDependencies.ts
```

可以看到，除开一些配置文件和空文件夹后，真正用到的文件就以下几个部分：

1. .husky

   > 这个是跟代码提交相关的，跟核心功能无关了。

2. scripts

   > 这个里面是项目里需要执行的一些脚本，把某些需要在终端里执行的操作，写到脚本中，一键式执行。类似shell脚本，bash脚本。与cli的核心流程也相关性不太大。

3. template

   > 这个里面是这个库的核心部分了——模板。我们 cli 在执行时，就是会从这个文件夹中读取各个配置的代码，最后把这些代码组合成一个完整的项目，然后给用户快速生成一个项目模板。
   >
   > 这个模板只要你事先预制好即可。

4. utils

   > 项目中用到的一些工具库，用到的时候再具体去看。

5. index.ts

   > 这个文件才是 cli 创建工程模板的关键文件，这里面包含了cli执行的所有逻辑，是create-vue脚手架的核心实现。

## 再来看下源码是怎么跑起来的，如何工作的？

### 1. 先看下我们的脚手架命令是怎么使用的？

下面是 create-vue 的用法：

```bash
npm create vue@3
```

![image-20230727192225526](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230727192225526.png)

常见的npm命令有 npm init, npm run, npm install等，但是 create 命令很少见，这里我们先看下，这个运行`npm create `会发生什么：

参考资料：[npm create vite“ 是如何实现初始化 Vite 项目？](https://blog.csdn.net/Cyj1414589221/article/details/128191826)

以下内容copy自参考资料：

> **npm `init` / `create` 命令**
>
> npm v6 版本给 `init` 命令添加了别名 `create`，俩命令一样的.
>
> npm `init` 命令除了可以用来创建 package.json 文件，还可以用来执行一个包的命令；它后面还可以接一个 `<initializer>` 参数。该命令格式：
>
> ```bash
> npm init <initializer>
> ```
>
> 参数 initializer 是名为 create-<initializer> 的 npm 包 ( 例如 create-vite )，执行 npm init <initializer> 将会被转换为相应的 npm exec 操作，即会使用 npm exec 命令来运行 create-<initializer> 包中对应命令 create-<initializer>（**package.json 的 bin 字段指定**），例如：
> ```bash
> # 使用 create-vite 包的 create-vite 命令创建一个名为 my-vite-project 的项目
> $ npm init vite my-vite-project
> # 等同于
> $ npm exec create-vite my-vite-project
> 
> ```
>
> **执行 `npm create vite` 发生了什么？**
>
> 当我们执行 `npm create vite` 时，会先补全包名为 `create-vite`，转换为使用 `npm exec` 命令执行，即 `npm exec create-vite`，接着执行包对应的 `create-vite` 命令（如果本地未安装 `create-vite` 包则先安装再执行）.

所以说，我们在执行命令时，npm 会执行`create-vue` 这个包，来运行 cli ,搭建工程。

具体的执行过程如下：

1. `npm create vue`  转化 `npm exec create-vue` 命令，执行 `create-vue` 包；
2. 执行 `create-vue` 具体是执行啥？执行 package.json 中bin 字段对应的 .js 文件。

![image-20230727194838670](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230727194838670.png)

```json
{
   "name": "create-vue",
  "version": "3.6.4",
  "description": "An easy way to start a Vue project",
  "type": "module",
  "bin": {
    "create-vue": "outfile.cjs"
  }
}
```

这是 package.json 中的部分代码，运行以上命令，就对应会执行 `outfile.cjs` 文件，其最终的结果即：

```bash
node outfile.cjs
```

如下图，在`create-vue`的包中直接执行`node outfile.cjs` , 执行结果跟执行脚手架一致，这证明了以上的结论正确。

![image-20230727200125908](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230727200125908.png)

### 2. outfile.cjs 文件从何而来？

outfile.cjs 从何而来呢？outfile.cjs是打包后的文件，这是显然的。我们找到脚手架打包的位置，查看一下它的入口文件即可。

根据 script 命令，打包命令`"build": "zx ./scripts/build.mjs",` 指向 `build.mjs`

```js
// build.mjs
await esbuild.build({
  bundle: true,
  entryPoints: ['index.ts'],
  outfile: 'outfile.cjs',
  format: 'cjs',
  platform: 'node',
  target: 'node14',
    ...
```

入口文件就是 `index.ts` 了。

接下来开始进入正题，我们集中分析 `index.ts `即可了。

## 开始分析 index.ts 文件干了点啥
相比于动辄几万行的库来说，index.ts 并不复杂，包括注释，只有短短的460多行。
我们先整体浏览一遍代码，大致了解下这个文件是怎么做到在短短400多行就完成了一个如此解除的脚手架。

经过3分钟的整体浏览，我们带着懵逼的情绪划到了文件的最底部，看到了这个程序的真谛，短短3行：
```ts
init().catch((e) => {
  console.error(e)
})
```
一切的一起都围绕 `init` 方法展开。

接下来，我们一步一步，庖丁解牛，揭开美人的面纱。移步 init 方法。

```ts
// index.ts
async function init() {
  ...

  try {
    // Prompts:
    // - Project name:
    //   - whether to overwrite the existing directory or not?
    //   - enter a valid package name for package.json
    // - Project language: JavaScript / TypeScript
    // - Add JSX Support?
    // - Install Vue Router for SPA development?
    // - Install Pinia for state management?
    // - Add Cypress for testing?
    // - Add Playwright for end-to-end testing?
    // - Add ESLint for code quality?
    // - Add Prettier for code formatting?
    result = await prompts(
      [
        {
          name: 'projectName',
          type: targetDir ? null : 'text',
          message: 'Project name:',
          initial: defaultProjectName,
          onState: (state) => (targetDir = String(state.value).trim() || defaultProjectName)
        },
        {
          name: 'shouldOverwrite',
          type: () => (canSkipEmptying(targetDir) || forceOverwrite ? null : 'confirm'),
          message: () => {
            const dirForPrompt =
              targetDir === '.' ? 'Current directory' : `Target directory "${targetDir}"`

            return `${dirForPrompt} is not empty. Remove existing files and continue?`
          }
        },
        ....
      ],
      {
        onCancel: () => {
          throw new Error(red('✖') + ' Operation cancelled')
        }
      }
    )
  } catch (cancelled) {
    console.log(cancelled.message)
    process.exit(1)
  }

  ...

const templateRoot = path.resolve(__dirname, 'template')
  const render = function render(templateName) {
    const templateDir = path.resolve(templateRoot, templateName)
    renderTemplate(templateDir, root)
  }
  // Render base template
  render('base')

  // Add configs.
  if (needsJsx) {
    render('config/jsx')
  }
  if (needsRouter) {
    render('config/router')
  }
  
  ...
}
```

程序有点长，但是流程非常清晰直白，堪称极简主义的典范，相比于 vue cli 的各种回调方法处理，它没有一丝一毫的拐弯抹角。
其实也就二个部分：
1. 询问你想要啥？；
2. 你想要啥我就给你啥；

### 1. 实现终端的交互逻辑，读取用户选择
分析代码总是枯燥的，但是既然是读源码，那再枯燥也得坚持。最终我们还得回到代码上，逐行解析。请看

```ts
 console.log()
  console.log(
    // 确定 Node.js 是否在终端上下文中运行的首选方法是检查 process.stdout.isTTY 属性的值是否为 true
    process.stdout.isTTY && process.stdout.getColorDepth() > 8
      ? banners.gradientBanner
      : banners.defaultBanner
  )
  console.log()
```

![image-20230829230134126](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230829230134126.png)



这段代码主要就是为了实现脚本执行的这行标题了，判断脚本是否在终端中执行，然后判断终端环境是否能支持渐变色相关的能力，支持则输出一个渐变色的炫酷的 `banner` 提示，否则输出一个默认的朴素的 `banner` 提示。

花里胡哨，但你不得不承认咋祖师爷的审美，vitepress 的全新UI风格真是绝绝子。

```ts
  const cwd = process.cwd() // 当前node.js 进程执行时的工作目录
```
也就是你在那个目录执行 `create-vue`, `cwd` 就是相应的目录了。

```ts
  /**
   * @description process.argv
   * process.argv 属性返回数组，其中包含启动 Node.js 进程时传入的命令行参数。
   * 其中第一个元素是 Node.js 的可执行文件路径，
   * 第二个元素是当前执行的 JavaScript 文件路径，之后的元素是命令行参数。
   * 其余元素将是任何其他命令行参数。
   *  process.argv.slice(2)，可去掉前两个元素，只保留命令行参数部分。
   * 
   * @description minimist
   * 是一个用于解析命令行参数的 JavaScript 函数库。它可以将命令行参数解析为一个对象，方便在代码中进行处理和使用。
   * minimist 的作用是将命令行参数解析为一个对象，其中参数名作为对象的属性，参数值作为对象的属性值。
   * 它可以处理各种类型的命令行参数，包括带有选项标志的参数、带有值的参数以及没有值的参数。
   * 
   * minimist 函数返回一个对象，其中包含解析后的命令行参数。我们可以通过访问对象的属性来获取相应的命令行参数值。
   * 假设我们在命令行中运行以下命令：
   * `node example/parse.js -x 3 -y 4 -n5 -abc --beep=boop foo bar baz`
   * 那么 minimist 将会解析这些命令行参数，并将其转换为以下对象：
   * {
      _: ['foo', 'bar', 'baz'],
      x: 3,
      y: 4,
      n: 5,
      a: true,
      b: true,
      c: true,
      beep: 'boop'
    }
   * 这样，我们就可以在代码中使用 argv.name 和 argv.age 来获取相应的参数值。
   * 除了基本的用法外，minimist 还提供了一些高级功能，例如设置默认值、解析布尔型参数等
   * 
   * const argv = minimist(args, opts={})
   * argv._ 包含所有没有关联选项的参数;
   * “--”之后的任何参数都不会被解析，并将以argv._结束
   * options有：
   * opts.string： 要始终视为字符串的字符串或字符串数组参数名称
   * opts.boolean: 布尔值、字符串或字符串数组，始终视为布尔值。如果为true，则将所有不带等号的'--'参数视为布尔值
   * 如 opts.boolean 设为 true, 则 --save 解析未 save: true
   * 
   * opts.default: 将字符串参数名映射到默认值的对象
   * 
   * opts.stopEarly: 当为true时，用第一个非选项后的所有内容填充argv._
   * 
   * opts.alias: 将字符串名称映射到字符串或字符串参数名称数组以用作别名的对象
   * 
   * opts['--']: 当为true时，用 '--' 之前的所有内容填充argv._; 用 '--' 之后的所有内容填充 argv['--']
   * e.g.
   * require('./')('one two three -- four five --six'.split(' '), { '--': true })
    {
      _: ['one', 'two', 'three'],
      '--': ['four', 'five', '--six']
    }
  * opts.unknown: 用一个命令行参数调用的函数，该参数不是在opts配置对象中定义的。如果函数返回false，则未知选项不会添加到argv。
  */

  // possible options:
  // --default
  // --typescript / --ts
  // --jsx
  // --router / --vue-router
  // --pinia
  // --with-tests / --tests (equals to `--vitest --cypress`)
  // --vitest
  // --cypress
  // --playwright
  // --eslint
  // --eslint-with-prettier (only support prettier through eslint for simplicity)
  // --force (for force overwriting)
  const argv = minimist(process.argv.slice(2), {
    alias: {
      typescript: ['ts'],
      'with-tests': ['tests'],
      router: ['vue-router']
    },
    string: ['_'],
    // all arguments are treated as booleans
    boolean: true
  })
```
- process.argv

process.argv 属性返回数组，其中包含启动 Node.js 进程时传入的命令行参数。其中第一个元素是 Node.js 的可执行文件路径，第二个元素是当前执行的 JavaScript 文件路径，之后的元素是命令行参数。process.argv.slice(2)，可去掉前两个元素，只保留命令行参数部分。

![image-20230829231511469](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230829231511469.png)

如图的示例，使用 `ts-node` 执行 `index.ts` 文件，所以 `process.argv` 的第一个参数是 `ts-node` 的可执行文件的路径，第二个参数是被执行的 ts 文件的路径，也就是 `index.ts` 的路径，如果有其他参数，则从 `process.argv` 数组的第三个元素开始。

![image-20230829232834955](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230829232834955.png)
