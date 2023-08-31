# create-vue脚手架是怎么实现的？

## 先把源码clone下来

目录结构如下：

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
      typescript: ['ts', 'TS'],
      'with-tests': ['tests'],
      router: ['vue-router']
    },
    string: ['_'], // 布尔值、字符串或字符串数组，始终视为布尔值。如果为true，则将所有不带等号的'--'参数视为布尔值
    // all arguments are treated as booleans
    boolean: true
  })
  console.log('argv:', argv)
```
- process.argv

> process.argv 属性返回数组，其中包含启动 Node.js 进程时传入的命令行参数。其中第一个元素是 Node.js 的可执行文件路径，第二个元素是当前执行的 JavaScript 文件路径，之后的元素是命令行参数。process.argv.slice(2)，可去掉前两个元素，只保留命令行参数部分。

![image-20230829231511469](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230829231511469.png)

如图的示例，使用 `ts-node` 执行 `index.ts` 文件，所以 `process.argv` 的第一个参数是 `ts-node` 的可执行文件的路径，第二个参数是被执行的 ts 文件的路径，也就是 `index.ts` 的路径，如果有其他参数，则从 `process.argv` 数组的第三个元素开始。

![image-20230829232834955](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230829232834955.png)

- minimist

> [minimist]([minimist - npm (npmjs.com)](https://www.npmjs.com/package/minimist))
>
> 是一个用于解析命令行参数的 JavaScript 函数库。它可以将命令行参数解析为一个对象，方便在代码中进行处理和使用。
>
> minimist 的作用是将命令行参数解析为一个对象，其中参数名作为对象的属性，参数值作为对象的属性值。它可以处理各种类型的命令行参数，包括带有选项标志的参数、带有值的参数以及没有值的参数。
>
> minimist 函数返回一个对象，其中包含解析后的命令行参数。我们可以通过访问对象的属性来获取相应的命令行参数值。
>
> 假设我们在命令行中运行以下命令：
>
> ```bash
> node example/parse.js -x 3 -y 4 -n 5 -abc --beep=boop foo bar baz
> ```
>
> 那么 minimist 将会解析这些命令行参数，并将其转换为以下对象：
>
> ```ts
> {
>    _: ['foo', 'bar', 'baz'],
>    x: 3,
>    y: 4,
>    n: 5,
>    a: true,
>    b: true,
>    c: true,
>    beep: 'boop'
> }
> ```
>
> 这样，我们就可以在代码中使用 argv.x和 argv.y来获取相应的参数值。
>
> 除了基本的用法外，minimist 还提供了一些高级功能，例如设置默认值、解析布尔型参数等.
>
> 如：
>
> ```ts
> const argv = minimist(args, opts={})
> ```
>
> argv._ 包含所有没有关联选项的参数;
>
> '--' 之后的任何参数都不会被解析，并将以`argv._` 结束。
>
> options有：
>
> - opts.string： 要始终视为字符串的字符串或字符串数组参数名称；
>
> - opts.boolean: 布尔值、字符串或字符串数组，始终视为布尔值。如果为true，则将所有不带等号的'--'参数视为布尔值。如 opts.boolean 设为 true, 则 --save 解析为 save: true；
>
> - opts.default: 将字符串参数名映射到默认值的对象；
>
> - opts.stopEarly: 当为true时，用第一个非选项后的所有内容填充argv._；
>
> - opts.alias: 将字符串名称映射到字符串或字符串参数名称数组，以用作别名的对象；
>
> - opts['--']: 当为true时，用 '--' 之前的所有内容填充argv._; 用 '--' 之后的所有内容填充 argv['--']，如：
>
>   ```ts
>   minimist(('one two three -- four five --six'.split(' '), { '--': true }))
>   
>   // 结果
>   {
>     _: ['one', 'two', 'three'],
>     '--': ['four', 'five', '--six']
>   }
>   ```
>
> - opts.unknown: 用一个命令行参数调用的函数，该参数不是在opts配置对象中定义的。如果函数返回false，则未知选项不会添加到argv。

接下来举例测试说明以上的`possible options:`选项得出的结果：

- --default

  ```bash
  > ts-node index.ts up-web-vue --default
  
  // result:
  argv: { _: [ 'up-web-vue' ], default: true }
  ```

![image-20230830194343904](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230830194343904.png)

- --typescript / --ts

  这个别名的配置，官方的解释有点不太直观，通过测试发现，它是这个意思。

  ```
  alias: {
    typescript: ['ts', 'TS'],
    'with-tests': ['tests'],
    router: ['vue-router']
  },
  ```

  已 `typescript: ['ts', 'TS']` 为例，输入 `typescript`, `ts`, `TS` 任意一个, 将同时生成 以这 3 个字段为 `key`  的属性，如：

  ```bash
  > ts-node index.ts up-web-vue --ts
  result:
  argv: 
  {
  	_: [ 'up-web-vue' ], 
  	typescript: true,
  	ts: true,
  	TS: true
  }
  ```

  ![image-20230830200226086](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230830200226086.png)

以上是2个典型的例子，根据 `minimist` 的配置，当 `options.boolean` 为 `true` 时，所有 `--youroption` 后面不带等号的，都视为`youroption`为布尔值，即: `youroption: true`, 所以，以上选型的结果依次为：

```ts
// --default
  // --typescript / --ts  // { typescript: true, ts: true, TS: true }
  // --jsx // { jsx: true }
  // --router / --vue-router // { router: true, vue-router: true }
  // --pinia // { pinia: true }
  // --with-tests / --tests // { 'with-tests': true, tests: true }
  // --vitest // { vitest: true }
  // --cypress // { cypress: true }
  // --playwright // { playwright: true }
  // --eslint // { eslint: true }
  // --eslint-with-prettier { 'eslint-with-prettier': true }
  // --force { force: true }
```

以上这一部分主要是在输入 `cli` 指令时的一些选项的实现。

接下来是提示功能。提示功能会引导用户根据自己的需求选择不同的项目配置。

如图所示，这是 `create-vue` 的提示模块：

![截屏2023-08-30 23.14.59](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/%E6%88%AA%E5%B1%8F2023-08-30%2023.14.59.png)

```tsx
// if any of the feature flags is set, we would skip the feature prompts
// 翻译一下：如果在上面讲述的部分，已经使用终端指令确定了安装选项，那么下文中相关的模块的提示项就会被跳过。
// 如果在 create-vue project-name 后附加了任何以下的选项，则此状态为true，如：create-vue project-name --ts
// ?? 是 空值合并操作符，当左侧的操作数为 null 或者 undefined 时，返回其右侧操作数，否则返回左侧操作数
  const isFeatureFlagsUsed =
    typeof (
      argv.default ??
      argv.ts ??
      argv.jsx ??
      argv.router ??
      argv.pinia ??
      argv.tests ??
      argv.vitest ??
      argv.cypress ??
      argv.playwright ??
      argv.eslint
    ) === 'boolean'

  let targetDir = argv._[0]
  const defaultProjectName = !targetDir ? 'vue-project' : targetDir

  const forceOverwrite = argv.force

  let result: {
    projectName?: string
    shouldOverwrite?: boolean
    packageName?: string
    needsTypeScript?: boolean
    needsJsx?: boolean
    needsRouter?: boolean
    needsPinia?: boolean
    needsVitest?: boolean
    needsE2eTesting?: false | 'cypress' | 'playwright'
    needsEslint?: boolean
    needsPrettier?: boolean
  } = {}

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
        {
          name: 'overwriteChecker',
          type: (prev, values) => {
            if (values.shouldOverwrite === false) {
              throw new Error(red('✖') + ' Operation cancelled')
            }
            return null
          }
        },
        {
          name: 'packageName',
          type: () => (isValidPackageName(targetDir) ? null : 'text'),
          message: 'Package name:',
          initial: () => toValidPackageName(targetDir),
          validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name'
        },
        {
          name: 'needsTypeScript',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add TypeScript?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsJsx',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add JSX Support?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsRouter',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add Vue Router for Single Page Application development?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsPinia',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add Pinia for state management?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsVitest',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add Vitest for Unit Testing?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsE2eTesting',
          type: () => (isFeatureFlagsUsed ? null : 'select'),
          message: 'Add an End-to-End Testing Solution?',
          initial: 0,
          choices: (prev, answers) => [
            { title: 'No', value: false },
            {
              title: 'Cypress',
              description: answers.needsVitest
                ? undefined
                : 'also supports unit testing with Cypress Component Testing',
              value: 'cypress'
            },
            {
              title: 'Playwright',
              value: 'playwright'
            }
          ]
        },
        {
          name: 'needsEslint',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add ESLint for code quality?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsPrettier',
          type: (prev, values) => {
            if (isFeatureFlagsUsed || !values.needsEslint) {
              return null
            }
            return 'toggle'
          },
          message: 'Add Prettier for code formatting?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        }
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
```

先看第一段：

```ts
// if any of the feature flags is set, we would skip the feature prompts
// 翻译一下：如果在上面讲述的部分，已经使用终端指令确定了安装选项，那么下文中相关的提示项就会被跳过。
// 如果在 create-vue project-name 后附加了任何以下的选项，则此状态为true，如：create-vue project-name --ts
// ?? 是 空值合并操作符，当左侧的操作数为 null 或者 undefined 时，返回其右侧操作数，否则返回左侧操作数
  const isFeatureFlagsUsed =
    typeof (
      argv.default ??
      argv.ts ??
      argv.jsx ??
      argv.router ??
      argv.pinia ??
      argv.tests ??
      argv.vitest ??
      argv.cypress ??
      argv.playwright ??
      argv.eslint
    ) === 'boolean'
  
  // 以下是此字段控制的部分逻辑, 可以看到，当 isFeatureFlagsUsed 为 true 时，prompts 的type值为 null.此时此提示会跳过
  result = await prompts(
      [
          ....
      	{
          name: 'needsTypeScript',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add TypeScript?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        {
          name: 'needsJsx',
          type: () => (isFeatureFlagsUsed ? null : 'toggle'),
          message: 'Add JSX Support?',
          initial: false,
          active: 'Yes',
          inactive: 'No'
        },
        ...
      ])
```

如果在 create-vue project-name 后附加了任何以下的选项，则此状态为true，如：`create-vue project-name --ts`.

只要输入任意一个选项，则以下的所有提示选项都将跳过，直接执行 cli。以下是测试结果：

![image-20230831192059089](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230831192059089.png)

然后在是这一部分：

```ts
  let targetDir = argv._[0]
  const defaultProjectName = !targetDir ? 'vue-project' : targetDir
  const forceOverwrite = argv.force
```

根据以上对  `argv` 的解析，`argv._ ` 是一个数组，其中的值是我们输入的目标文件夹名称， 如下示例：

```bash
> ts-node index.ts up-web-vue
```

得到的 `argv._` 的值为: `['up-web-vue']`.

![image-20230831193020240](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230831193020240.png)

所以，`targetDir` 即为你希望脚手架为你生成的项目的文件夹名称，`defaultProjectName` 则是未指定文件夹名称时的默认名称。

`argv.force` 值即为 `ts-node index.ts up-web-vue --force` 时 `force` 的值，是强制覆盖选项的快捷指令，如果使用此选项，则后面则不会弹出询问是否强制覆盖的选项。

```ts
...
{
  name: 'shouldOverwrite',
      // forceOverwrite 为 true 时跳过
  type: () => (canSkipEmptying(targetDir) || forceOverwrite ? null : 'confirm'),
  message: () => {
    const dirForPrompt =
      targetDir === '.' ? 'Current directory' : `Target directory "${targetDir}"`

    return `${dirForPrompt} is not empty. Remove existing files and continue?`
  }
},
....
// 判断 dir 文件夹是否是空文件夹
function canSkipEmptying(dir: string) {
  // dir目录不存在，则当然是空目录
  if (!fs.existsSync(dir)) {
    return true
  }

  // 读取dir内的文件
  const files = fs.readdirSync(dir)
  // 无文件，当然是空目录
  if (files.length === 0) {
    return true
  }
  // 仅有.git目录，则同样视为一个空目录
  if (files.length === 1 && files[0] === '.git') {
    return true
  }

  return false
}
```

当然，如果目标目录是空母录，自然也会跳过此提示。`canSkipEmptying()` 方法即用来判断是否是空目录。

```ts
  let result: {
    projectName?: string
    shouldOverwrite?: boolean
    packageName?: string
    needsTypeScript?: boolean
    needsJsx?: boolean
    needsRouter?: boolean
    needsPinia?: boolean
    needsVitest?: boolean
    needsE2eTesting?: false | 'cypress' | 'playwright'
    needsEslint?: boolean
    needsPrettier?: boolean
  } = {}
  // 定义一个result对象，prompts 提示的结果保存在此对象中。
```

以上定义一个 `result` ，从其类型的定义不难看出，该对象用来保存 prompts 提示结束后用户选择的结果。

接下来介绍生成项目之前的 prompts 提示部分。首先，先大致了解下 `prompts `库的用法：
>[prompts]([prompts - npm (npmjs.com)](https://www.npmjs.com/package/prompts))
>
>prompts 是一个用于创建交互式命令行提示的 JavaScript 库。它可以方便地与用户进行命令行交互，接收用户输入的值，并根据用户的选择执行相应的操作。在 prompts 中，问题对象（prompt object）是用于定义交互式提示的配置信息。它包含了一些属性，用于描述问题的类型、提示信息、默认值等。
>
>下面是 `prompt object` 的常用属性及其作用：
>
>- type：指定问题的类型，可以是 'text'、'number'、'confirm'、'select'、'multiselect'、‘null’ 等。不同的类型会影响用户交互的方式和输入值的类型。当为 `null` 时会跳过，当前对话。
>- name：指定问题的名称，用于标识用户输入的值。在返回的结果对象中，每个问题的名称都会作为属性名，对应用户的输入值。
>- message：向用户展示的提示信息。可以是一个字符串，也可以是一个函数，用于动态生成提示信息。
>- initial：指定问题的默认值。用户可以直接按下回车键接受默认值，或者输入新的值覆盖默认值。
>- validate：用于验证用户输入值的函数。它接受用户输入的值作为参数，并返回一个布尔值或一个字符串。如果返回布尔值 false，表示输入值无效；如果返回字符串，则表示输入值无效的错误提示信息。
>- format：用于格式化用户输入值的函数。它接受用户输入的值作为参数，并返回一个格式化后的值。可以用于对输入值进行预处理或转换。
>- choices：用于指定选择型问题的选项。它可以是一个字符串数组，也可以是一个对象数组。每个选项可以包含 title 和 value 属性，分别用于展示选项的文本和对应的值。
>- onRender：在问题被渲染到终端之前触发的回调函数。它接受一个参数 prompt，可以用于修改问题对象的属性或执行其他操作。例如，你可以在 onRender 回调中动态修改提示信息，根据不同的条件显示不同的信息。
>- onState：在用户输入值发生变化时触发的回调函数。它接受两个参数 state 和 prompt，分别表示当前的状态对象和问题对象。
>- onSubmit：在用户完成所有问题的回答并提交之后触发的回调函数。它接受一个参数 result，表示用户的回答结果。你可以在 onSubmit 回调中根据用户的回答执行相应的操作，例如保存数据、发送请求等。

接下来结合代码来分析，每个提示项的作用分别是啥。

```ts
{
  name: 'projectName',
  type: targetDir ? null : 'text',
  message: 'Project name:',
  initial: defaultProjectName,
  onState: (state) => (targetDir = String(state.value).trim() || defaultProjectName)
},
```

项目名称，这里如果在运行 cli 时**未输入**项目名称，则会展示此选项，默认选项为 `defaultProjectName`, 在用户确认操作后，将输入值作为生成目录的文件夹名。

如果运行 cli 时已输入项目名称，则此提示会跳过。







































