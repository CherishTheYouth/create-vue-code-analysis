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

| 依赖名                    | 功能                                                         |
| ------------------------- | ------------------------------------------------------------ |
| @tsconfig/node18          | node.js18配套的tsconfig                                      |
| @types/eslint             | eslint相关                                                   |
| @types/node               | node.js的类型定义                                            |
| @vue/create-eslint-config | 在Vue.js项目中设置ESLint的实用程序。                         |
| @vue/tsconfig             | 用于Vue项目的TS Configure扩展。                              |
| esbuild                   | 这是一个JavaScript打包器和压缩器。                           |
| esbuild-plugin-license    | 许可证生成工具                                               |
| husky                     | git 钩子规范工具                                             |
| kolorist                  | 给stdin/stdout的文本内容添加颜色                             |
| lint-staged               | 格式化代码                                                   |
| minimist                  | 解析参数选项， 当用户从 terminal 中输入命令指令时，帮助解析各个参数的工具 |
| npm-run-all               | 一个CLI工具，用于并行或顺序运行多个npm-script。              |
| prettier                  | 代码格式化的                                                 |
| prompts                   | 轻巧、美观、人性化的交互式提示。在 terminal 中做对话交互的。 |
| @types/prompts            | prompts 库的类型定义                                         |
| zx                        | 该库为开发者在JavaScript中编写shell脚本提供了一系例功能，使开发更方便快捷，主要在编写复杂的 script 命令是使用。 |

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

### 1. 实现终端的交互逻辑，获取用户的选择
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
        ...
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

```ts
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
```

以上两个 prompts 为一组，在目标文件夹为空时，不需要选择强制覆盖的配置，会跳过这2个 prompts 。

当不为空时，首先会询问是否强制覆盖目标目录，其中 message 字段根据用户输入的 目录名动态生成，这里特别考虑了 ‘.’ 这种目录选择方式（当前目录）。

`type` 即可以是字符串，布尔值，也可以是 Function ，当为 Function 时，拥有2个默认参数 `prev` 和 `values`, `prve` 表示前一个选项的选择的值，`values` 表示已经选择了的所有选项的值。

此处根据上一个选项的选择结果来决定下一个选项的类型。这段代码中，当用户选择不强制覆盖目标目录时，则脚手架执行终止，抛出 `Operation cancelled` 的错误提示。

```tsx
{
  name: 'packageName',
  type: () => (isValidPackageName(targetDir) ? null : 'text'),
  message: 'Package name:',
  initial: () => toValidPackageName(targetDir),
  validate: (dir) => isValidPackageName(dir) || 'Invalid package.json name'
},  
...
// 校验项目名
// 匹配一个项目名称，它可以包含可选的 @scope/ 前缀，后面跟着一个或多个小写字母、数字、-、. 或 ~ 中的任意一个字符。这个正则表达式适用于验证类似于 npm 包名的项目名称格式
function isValidPackageName(projectName) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(projectName)
}

// 将不合法的项目名修改为合法的报名
function toValidPackageName(projectName) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z0-9-~]+/g, '-')
}
```



![截屏2023-08-31 23.16.14](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/%E6%88%AA%E5%B1%8F2023-08-31%2023.16.14.png)

以上代码，对项目名进行校验，看是否符合内置的规则(类似于npm包名的格式) ，然后对不合法的字符进行校准，生成一个默认的项目名，用户可直接点击确认选择使用这个默认的项目名，或者重新输入一次项目名，如果用户再次输入不合法的项目名，则会出现提示 `Invalid package.json name`, 然后无法继续往下执行，直到用户修改为合法的 项目名。

这里的提示似乎应该是 `Invalid project name`, 功能是对项目名进行校验，却提示 `package.json`  无效，有些奇怪，但也无伤大雅了。（*PS：个人分析，这里可能是一段从别的地方拷贝过来的代码，哈哈，等看到后面的源码再看有没有相关内容！*）

![截屏2023-08-31 23.26.36](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/%E6%88%AA%E5%B1%8F2023-08-31%2023.26.36.png)

![截屏2023-08-31 23.29.34](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/%E6%88%AA%E5%B1%8F2023-08-31%2023.29.34.png)



```ts
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
          
```

以上这一组选项都是类似的，都是询问是否添加某模块，初始值为 `false` 默认不添加，`active` 和 `inactive` 分别表示2个不同的选项，`isFeatureFlagsUsed` 前面已经讲过，这里略过。

所以这一段依次表示询问用户是否需要添加 `TypeScript` 、`JSX Support`、`Vue Router`、`Pinia`、`Vitest` 。

接下来是e2e测试选项的 prompts：

```ts
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
}
```

这里是一个选择类型的 `prompts`，询问是否添加 `e2e` 测试框架，共 3 个选项：

- 不添加
- 添加 `cypress`
- 添加 `playwright`

接下里是 `eslint` 和 `prettier` :

```tsx
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
```

这2个选项为一组，其中如果选择不集成 `eslint`, 则默认也是不集成的 `prettier` 的，只有选择集成`eslint`， 才可继续选择是否集成 `prettier`.

然后是 `prompts` 部分最后一个部分了，异常捕获：

```ts
try {
  ...
} catch (cancelled) {
  console.log(cancelled.message)
  process.exit(1)
}
```

当在选择过程中按下终止快捷键（ctrl + c）时，或者在选择过程中，触发终止条件时（如上文中某选项的 `throw new Error(red('✖') + ' Operation cancelled')` ），则会进入异常捕获中，此时会打印任务执行终止的提示，并结束此进程。

到此，脚手架第一个部分——用户选择部分全都解析完成了，很好理解，就是使用一些更友好的形式（prompts）来收集用户的需求，使用的工具也很简单易懂。



接下里看一个 cli 真正的核心功能，根据用户配置生成完整的项目结构。

### 2. 根据用户选择生成合理的项目工程

先贴代码：

```ts
// `initial` won't take effect if the prompt type is null
// so we still have to assign the default values here
  const {
    projectName,
    packageName = projectName ?? defaultProjectName,
    shouldOverwrite = argv.force,
    needsJsx = argv.jsx,
    needsTypeScript = argv.typescript,
    needsRouter = argv.router,
    needsPinia = argv.pinia,
    needsVitest = argv.vitest || argv.tests,
    needsEslint = argv.eslint || argv['eslint-with-prettier'],
    needsPrettier = argv['eslint-with-prettier']
  } = result

  const { needsE2eTesting } = result
  const needsCypress = argv.cypress || argv.tests || needsE2eTesting === 'cypress'
  const needsCypressCT = needsCypress && !needsVitest
  const needsPlaywright = argv.playwright || needsE2eTesting === 'playwright'

  const root = path.join(cwd, targetDir)

  if (fs.existsSync(root) && shouldOverwrite) {
    emptyDir(root)
  } else if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }

  console.log(`\nScaffolding project in ${root}...`)

  const pkg = { name: packageName, version: '0.0.0' }
  fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2))

  // todo:
  // work around the esbuild issue that `import.meta.url` cannot be correctly transpiled
  // when bundling for node and the format is cjs
  // const templateRoot = new URL('./template', import.meta.url).pathname
  const templateRoot = path.resolve(__dirname, 'template')
  const render = function render(templateName) {
    const templateDir = path.resolve(templateRoot, templateName)
    renderTemplate(templateDir, root)
  }
  
  // Add configs.
  if (needsJsx) {
    render('config/jsx')
  }
  if (needsRouter) {
    render('config/router')
  }
  if (needsPinia) {
    render('config/pinia')
  }
  if (needsVitest) {
    render('config/vitest')
  }
  if (needsCypress) {
    render('config/cypress')
  }
  if (needsCypressCT) {
    render('config/cypress-ct')
  }
  if (needsPlaywright) {
    render('config/playwright')
  }
  if (needsTypeScript) {
    render('config/typescript')

    // Render tsconfigs
    render('tsconfig/base')
    if (needsCypress) {
      render('tsconfig/cypress')
    }
    if (needsCypressCT) {
      render('tsconfig/cypress-ct')
    }
    if (needsPlaywright) {
      render('tsconfig/playwright')
    }
    if (needsVitest) {
      render('tsconfig/vitest')
    }
  }

  // Render ESLint config
  if (needsEslint) {
    renderEslint(root, { needsTypeScript, needsCypress, needsCypressCT, needsPrettier })
  }

  // Render code template.
  // prettier-ignore
  const codeTemplate =
    (needsTypeScript ? 'typescript-' : '') +
    (needsRouter ? 'router' : 'default')
  render(`code/${codeTemplate}`)

  // Render entry file (main.js/ts).
  if (needsPinia && needsRouter) {
    render('entry/router-and-pinia')
  } else if (needsPinia) {
    render('entry/pinia')
  } else if (needsRouter) {
    render('entry/router')
  } else {
    render('entry/default')
  }

// Cleanup.

  // We try to share as many files between TypeScript and JavaScript as possible.
  // If that's not possible, we put `.ts` version alongside the `.js` one in the templates.
  // So after all the templates are rendered, we need to clean up the redundant files.
  // (Currently it's only `cypress/plugin/index.ts`, but we might add more in the future.)
  // (Or, we might completely get rid of the plugins folder as Cypress 10 supports `cypress.config.ts`)

  if (needsTypeScript) {
    // Convert the JavaScript template to the TypeScript
    // Check all the remaining `.js` files:
    //   - If the corresponding TypeScript version already exists, remove the `.js` version.
    //   - Otherwise, rename the `.js` file to `.ts`
    // Remove `jsconfig.json`, because we already have tsconfig.json
    // `jsconfig.json` is not reused, because we use solution-style `tsconfig`s, which are much more complicated.
    preOrderDirectoryTraverse(
      root,
      () => {},
      (filepath) => {
        if (filepath.endsWith('.js')) {
          const tsFilePath = filepath.replace(/\.js$/, '.ts')
          if (fs.existsSync(tsFilePath)) {
            fs.unlinkSync(filepath)
          } else {
            fs.renameSync(filepath, tsFilePath)
          }
        } else if (path.basename(filepath) === 'jsconfig.json') {
          fs.unlinkSync(filepath)
        }
      }
    )

    // Rename entry in `index.html`
    const indexHtmlPath = path.resolve(root, 'index.html')
    const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8')
    fs.writeFileSync(indexHtmlPath, indexHtmlContent.replace('src/main.js', 'src/main.ts'))
  } else {
    // Remove all the remaining `.ts` files
    preOrderDirectoryTraverse(
      root,
      () => {},
      (filepath) => {
        if (filepath.endsWith('.ts')) {
          fs.unlinkSync(filepath)
        }
      }
    )
  }

  // Instructions:
  // Supported package managers: pnpm > yarn > npm
  const userAgent = process.env.npm_config_user_agent ?? ''
  const packageManager = /pnpm/.test(userAgent) ? 'pnpm' : /yarn/.test(userAgent) ? 'yarn' : 'npm'

  // README generation
  fs.writeFileSync(
    path.resolve(root, 'README.md'),
    generateReadme({
      projectName: result.projectName ?? result.packageName ?? defaultProjectName,
      packageManager,
      needsTypeScript,
      needsVitest,
      needsCypress,
      needsPlaywright,
      needsCypressCT,
      needsEslint
    })
  )

  console.log(`\nDone. Now run:\n`)
  if (root !== cwd) {
    const cdProjectName = path.relative(cwd, root)
    console.log(
      `  ${bold(green(`cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`))}`
    )
  }
  console.log(`  ${bold(green(getCommand(packageManager, 'install')))}`)
  if (needsPrettier) {
    console.log(`  ${bold(green(getCommand(packageManager, 'format')))}`)
  }
  console.log(`  ${bold(green(getCommand(packageManager, 'dev')))}`)
  console.log()
```

第一部分是解析出用户的安装配置项：

```ts
// `initial` won't take effect if the prompt type is null
// so we still have to assign the default values here
// 此处兼顾用户从 prompts 配置读取配置和直接使用 -- 指令进行快速配置。根据前面的分析，当使用 -- 指令快速配置时，`prompts` 不生效，则从 result 中解构出来的属性都为 `undefined`, 此时，则会为其制定默认值，也即是以下代码中从 `argv` 中读取的值。
const {
  projectName,
  packageName = projectName ?? defaultProjectName,
  shouldOverwrite = argv.force,
  needsJsx = argv.jsx,
  needsTypeScript = argv.typescript,
  needsRouter = argv.router,
  needsPinia = argv.pinia,
  needsVitest = argv.vitest || argv.tests,
  needsEslint = argv.eslint || argv['eslint-with-prettier'],
  needsPrettier = argv['eslint-with-prettier']
} = result

const { needsE2eTesting } = result
const needsCypress = argv.cypress || argv.tests || needsE2eTesting === 'cypress'
const needsCypressCT = needsCypress && !needsVitest
const needsPlaywright = argv.playwright || needsE2eTesting === 'playwright'
```

此处兼顾用户从 prompts 配置读取配置和直接使用 -- 指令进行快速配置。根据前面的分析，当使用 -- 指令快速配置时，`prompts` 不生效，则从 result 中解构出来的属性都为 `undefined`, 此时，则会为其制定默认值，也即是以下代码中从 `argv` 中读取的值。

紧接着开始进入文件操作阶段了。

```ts
const root = path.join(cwd, targetDir) // 计算目标文件夹的完整文件路径

// 读取目标文件夹状态，看该文件夹是否是一个已存在文件夹，是否需要覆盖
// 文件夹存在，则清空，文件夹不存在，则创建
if (fs.existsSync(root) && shouldOverwrite) {
  emptyDir(root)
} else if (!fs.existsSync(root)) {
  fs.mkdirSync(root)
}
// 一句提示, 脚手架项目在xxx目录
console.log(`\nScaffolding project in ${root}...`)

// emptyDir
function emptyDir(dir) {
// 代码写的很严谨、健壮，即使外层调用的地方已经判断了目录是否存在，在实际操作目录中依然会重新判断一下，与外部的业务代码不产生多余的依赖关系。
  if (!fs.existsSync(dir)) {
    return
  }

  // 遍历目录，清空目录里的文件夹和文件
  postOrderDirectoryTraverse(
    dir,
    (dir) => fs.rmdirSync(dir),
    (file) => fs.unlinkSync(file)
  )
}

// postOrderDirectoryTraverse  from './utils/directoryTraverse'
// /utils/directoryTraverse.ts
// 这个方法递归的遍历给定文件夹，并对内部的 文件夹 和 文件 按照给定的回调函数进行操作。
export function postOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  // 遍历dir下的文件
  for (const filename of fs.readdirSync(dir)) {
    // 如果文件是 .git 文件，则跳过
    if (filename === '.git') {
      continue
    }
    const fullpath = path.resolve(dir, filename) // 计算文件路径
    // 如果该文件是一个文件夹类型，则递归调用此方法，继续对其内部的文件进行操作
    if (fs.lstatSync(fullpath).isDirectory()) {
      postOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      // 当然递归完后，不要忘记对该文件夹自己进行操作
      dirCallback(fullpath)
      continue
    }
    // 如果该文件不是文件夹类型，是纯文件，则直接执行对单个文件的回调操作
    fileCallback(fullpath)
  }
}
```

以上部分主要是判断目标目录的状态，清空目标目录的实现过程。

> fs.unlinkSync: 同步删除文件；
>
> fs.rmdirSync: 同步删除给定路径下的目录;

清空目标目录的实现，其核心是通过 `postOrderDirectoryTraverse` 方法来遍历目标文件夹，通过传入自定义的回调方法来决定对 `file` 和 `directory` 执行何种操作。此处对目录执行 `(dir) => fs.rmdirSync(dir)` 方法，来移除目录，对文件执行 `(file) => fs.unlinkSync(file)` 来移除。

```ts
// 定义脚手架工程的 package.json 文件的内容，这里 packageName 和 projectName是保持一致的。
const pkg = { name: packageName, version: '0.0.0' }
// 创建一个 package.json 文件，写入 pkg 变量定义的内容
fs.writeFileSync(path.resolve(root, 'package.json'), JSON.stringify(pkg, null, 2))
```

> fs.writeFileSync(file, data[, option])
>
> - file: 它是一个字符串，Buffer，URL或文件描述整数，表示必须在其中写入文件的路径。使用文件描述符将使其行为类似于fs.write()方法。
> - data: 它是将写入文件的字符串，Buffer，TypedArray或DataView。
> - options: 它是一个字符串或对象，可用于指定将影响输出的可选参数。它具有三个可选参数：
>   - **encoding:**它是一个字符串，它指定文件的编码。默认值为“ utf8”。
>   - **mode:**它是一个整数，指定文件模式。默认值为0o666。
>   - **flag:**它是一个字符串，指定在写入文件时使用的标志。默认值为“ w”。
>
> JSON.stringify(value[, replacer [, space]])
>
> - value: 将要序列化成 一个 JSON 字符串的值。
>
> - replacer: 可选, 如果该参数是一个函数，则在序列化过程中，被序列化的值的每个属性都会经过该函数的转换和处理；如果该参数是一个数组，则只有包含在这个数组中的属性名才会被序列化到最终的 JSON 字符串中；如果该参数为 null 或者未提供，则对象所有的属性都会被序列化。
>
> - space: 可选, 指定缩进用的空白字符串，用于美化输出（pretty-print）；如果参数是个数字，它代表有多少的空格；上限为 10。该值若小于 1，则意味着没有空格；如果该参数为字符串（当字符串长度超过 10 个字母，取其前 10 个字母），该字符串将被作为空格；如果该参数没有提供（或者为 null），将没有空格。

接下来正式进入模板渲染环节了。

> __dirname 可以用来动态获取当前文件所属目录的绝对路径;
>
> __filename 可以用来动态获取当前文件的绝对路径，包含当前文件 ;
>
> path.resolve() 方法是以程序为根目录，作为起点，根据参数解析出一个绝对路径；

```ts
// 计算模板所在文件加路径
const templateRoot = path.resolve(__dirname, 'template')
// 定义模板渲染 render 方法，参数为模板名
const render = function render(templateName) {
    const templateDir = path.resolve(templateRoot, templateName)
    // 核心是这个 renderTemplate 方法，第一个参数是源文件夹目录，第二个参数是目标文件夹目录
    renderTemplate(templateDir, root)
}
```

以上代码定义了一个模板渲染方法，根据模板名，生成不同的项目模块。

其核心为 `renderTemplate` 方法，下面来看此方法的代码实现：
```ts
// /utils/renderTemplate.ts
/**
 * Renders a template folder/file to the file system,
 * by recursively copying all files under the `src` directory,
 * with the following exception:
 *   - `_filename` should be renamed to `.filename`
 *   - Fields in `package.json` should be recursively merged
 * @param {string} src source filename to copy
 * @param {string} dest destination filename of the copy operation
 */
/** 翻译一下这段函数说明：
 * 通过递归复制 src 目录下的所有文件，将模板文件夹/文件 复制到 目标文件夹，
 * 但以下情况例外：
 * 1. '_filename' 会被重命名为 '.filename';
 * 2. package.json 文件中的字段会被递归合并；
 */
function renderTemplate(src, dest) {
  const stats = fs.statSync(src) // src 目录的文件状态

  // 如果当前src是文件夹，则在目标目录中递归的生成此目录的子目录和子文件，但 node_modules 忽略
  if (stats.isDirectory()) {
    // skip node_module
    if (path.basename(src) === 'node_modules') {
      return
    }

    // if it's a directory, render its subdirectories and files recursively
    fs.mkdirSync(dest, { recursive: true })
    for (const file of fs.readdirSync(src)) {
      renderTemplate(path.resolve(src, file), path.resolve(dest, file))
    }
    return
  }

  // path.basename(path[, ext]) 返回 path 的最后一部分，也即是文件名了。
  const filename = path.basename(src)

  // 如果当前src是单个文件，则直接复制到目标路径下，但有以下几类文件例外，要特殊处理。
  // package.json 做合并操作，并对内部的属性的位置做了排序；
  // extensions.json 做合并操作；
  // 以 _ 开头的文件名转化为 . 开头的文件名；
  // _gitignore 文件，将其中的配置追加到目标目录对应文件中；
  if (filename === 'package.json' && fs.existsSync(dest)) {
    // merge instead of overwriting
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'))
    const newPackage = JSON.parse(fs.readFileSync(src, 'utf8'))
    const pkg = sortDependencies(deepMerge(existing, newPackage))
    fs.writeFileSync(dest, JSON.stringify(pkg, null, 2) + '\n')
    return
  }

  if (filename === 'extensions.json' && fs.existsSync(dest)) {
    // merge instead of overwriting
    const existing = JSON.parse(fs.readFileSync(dest, 'utf8'))
    const newExtensions = JSON.parse(fs.readFileSync(src, 'utf8'))
    const extensions = deepMerge(existing, newExtensions)
    fs.writeFileSync(dest, JSON.stringify(extensions, null, 2) + '\n')
    return
  }

  if (filename.startsWith('_')) {
    // rename `_file` to `.file`
    dest = path.resolve(path.dirname(dest), filename.replace(/^_/, '.'))
  }

  if (filename === '_gitignore' && fs.existsSync(dest)) {
    // append to existing .gitignore
    const existing = fs.readFileSync(dest, 'utf8')
    const newGitignore = fs.readFileSync(src, 'utf8')
    fs.writeFileSync(dest, existing + '\n' + newGitignore)
    return
  }

  fs.copyFileSync(src, dest)
}

// /utils/deepMerge.ts
const isObject = (val) => val && typeof val === 'object'
// 合并数组时，利用Set数据类型 对数组进行去重
const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]))

/**
 * Recursively merge the content of the new object to the existing one
 * 递归的将两个对象进行合并
 * @param {Object} target the existing object
 * @param {Object} obj the new object
 */
function deepMerge(target, obj) {
  for (const key of Object.keys(obj)) {
    const oldVal = target[key]
    const newVal = obj[key]

    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
      target[key] = mergeArrayWithDedupe(oldVal, newVal)
    } else if (isObject(oldVal) && isObject(newVal)) {
      target[key] = deepMerge(oldVal, newVal)
    } else {
      target[key] = newVal
    }
  }

  return target
}

// /utils/sortDependencies
// 将四种类型的依赖进行一个排序，共4种类型：dependencies、devDependencies、peerDependencies、optionalDependencies
// 这一步没有很大的必要，不要也不影响功能，主要是为了将以上四个类型属性在package.json中的位置统一一下，按照dependencies、devDependencies、peerDependencies、optionalDependencies 这个顺序以此展示这些依赖项。
function sortDependencies(packageJson) {
  const sorted = {}

  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

  for (const depType of depTypes) {
    if (packageJson[depType]) {
      sorted[depType] = {}

      Object.keys(packageJson[depType])
        .sort()
        .forEach((name) => {
          sorted[depType][name] = packageJson[depType][name]
        })
    }
  }

  return {
    ...packageJson,
    ...sorted
  }
}
```

> 以上代码已添加了详尽的注释，学习时也可略过相关正文描述

`renderTemplate` 方法主要作用是将模板里的内容按需渲染到脚手架工程中。主要涉及到一些文件的拷贝，合并，调增等操作。以上代码已添加详细注释，这里将其中特殊处理的几个点罗列如下，阅读时着重注意即可：

- 渲染模板时，如果模板中存在 'node_modules' 文件夹需跳过；
- package.json 需要与脚手架工程中的package.json做合并操作, 并对内部的属性的位置做了排序；（按照 dependencies , devDependencies , peerDependencies, optionalDependencies 的顺序）
- extensions.json 需要与脚手架工程中的对应文件做合并操作；
- 以 _ 开头的文件名转化为 . 开头的文件名；（如_a.ts => .a.ts）;
- _gitignore 文件，需要将其中的配置追加到目标目录对应文件中；

接下来回到 `index.ts` 文件中继续分析主流程：

```ts
// Render base template
// 渲染一个最基础的基于 vite 的 vue3 项目 
render('base')

// Add configs.
if (needsJsx) {
    render('config/jsx')
}
...
// Render ESLint config
if (needsEslint) {
    renderEslint(root, { needsTypeScript, needsCypress, needsCypressCT, needsPrettier })
}

// Render code template.
// prettier-ignore
const codeTemplate =
      (needsTypeScript ? 'typescript-' : '') +
      (needsRouter ? 'router' : 'default')
render(`code/${codeTemplate}`)

// Render entry file (main.js/ts).
if (needsPinia && needsRouter) {
    render('entry/router-and-pinia')
} else if (needsPinia) {
    render('entry/pinia')
} else if (needsRouter) {
    render('entry/router')
} else {
    render('entry/default')
}
```



```ts
  // Render base template
  render('base')
```

首先渲染一个最基础的基于 `vite` 的 `vue3` 项目，除了 `renderTemplate` 方法中的一些特殊点之外， `render('base')` 中需要注意的一点是，这并不是一个完善的能跑的 vue3 工程，这里面缺少了 `main.js` 文件，这个文件会在后面的 `Render entry file ` 部分进行补充。

![截屏2023-09-02 21.43.24](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/%E6%88%AA%E5%B1%8F2023-09-02%2021.43.24.png)

 如图所示，无 `main.j(t)s` 文件.

紧接着是渲染用户选择的一些配置：

- Jsx 配置：包括 `package.json` 需要安装的依赖 和 `vite.config.js` 中的 相关配置：

```ts
// Add configs.
if (needsJsx) {
  render('config/jsx')
}
```

```ts
// package.json
{
  "dependencies": {
    "vue": "^3.3.2"
  },
  "devDependencies": {
    "@vitejs/plugin-vue-jsx": "^3.0.1", // 主要是这个 plugin-vue-jsx 插件
    "vite": "^4.3.5"
  }
}
// vite.config.js
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],// 主要是这里
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
```

- router 配置：就一个`package.json` 中需要安装的依赖

```ts
if (needsRouter) {
  render('config/router')
}
```

```json
// package.json
{
  "dependencies": {
    "vue": "^3.3.2",
    "vue-router": "^4.2.0" // 这个
  }
}
```

- pinia 配置：1. package.json 配置；2. 新增一个 `pinia` 使用 `demo`.

```ts
if (needsPinia) {
  render('config/pinia')
}
```

```ts
{
  "dependencies": {
    "pinia": "^2.0.36",
    "vue": "^3.3.2"
  }
}
```

![image-20230902215623065](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230902215623065.png)

- Vitest 配置： 1. package.json 配置；2. vitest.config.js 文件；3. 一个单测用例示例；

```ts
if (needsVitest) {
  render('config/vitest')
}
```

> 具体内容可看源码的模板文件

- Cypress/cypress-ct/playwright: 与上面操作类似，不赘述，直接看源码的模板文件；

```ts
if (needsCypress) {
  render('config/cypress')
}
if (needsCypressCT) {
  render('config/cypress-ct')
}
if (needsPlaywright) {
  render('config/playwright')
}
```

- TypeScript 配置：

```ts
if (needsTypeScript) {
  render('config/typescript')
  // Render tsconfigs
  render('tsconfig/base')
  if (needsCypress) {
    render('tsconfig/cypress')
  }
  if (needsCypressCT) {
    render('tsconfig/cypress-ct')
  }
  if (needsPlaywright) {
    render('tsconfig/playwright')
  }
  if (needsVitest) {
    render('tsconfig/vitest')
  }
}
```

`TypeScript` 的配置相对复杂一些，但根本上来说都是一些预先配置好的内容，只要按需从对应模版取正确的配置进行渲染，保证 `TypeScript` 的正常功能即可，亦不赘述。

- Eslint 配置

接下是 `eslint` 相关配置的渲染，这块是一个单独的渲染函数，跟 `TypeScript`, `Cypress`, `CypressCT` , `Prettier` 这几个模块相关。主要是一些针对行的处理逻辑，核心思路还是一样，通过文件、配置的组合处理，来生成一个完整的功能配置。

```ts
// Render ESLint config
if (needsEslint) {
  renderEslint(root, { needsTypeScript, needsCypress, needsCypressCT, needsPrettier })
}

```

- 模板配置

```ts
// Render code template.
// prettier-ignore
const codeTemplate =
      (needsTypeScript ? 'typescript-' : '') +
      (needsRouter ? 'router' : 'default')
render(`code/${codeTemplate}`)

// Render entry file (main.js/ts).
if (needsPinia && needsRouter) {
  render('entry/router-and-pinia')
} else if (needsPinia) {
  render('entry/pinia')
} else if (needsRouter) {
  render('entry/router')
} else {
  render('entry/default')
}
```

- main.j(t)s配置

```ts
// Render entry file (main.js/ts).
if (needsPinia && needsRouter) {
  render('entry/router-and-pinia')
} else if (needsPinia) {
  render('entry/pinia')
} else if (needsRouter) {
  render('entry/router')
} else {
  render('entry/default')
}
```

前面提到 base 目录中缺少 main.j(t)s 文件，这里给补上了。

- ts 和 js 的差异化处理

```ts
// directoryTraverse.ts
function preOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  // 读取目录文件（同步）
  for (const filename of fs.readdirSync(dir)) {
    // 跳过.git文件
    if (filename === '.git') {
      continue
    }
    const fullpath = path.resolve(dir, filename)
    if (fs.lstatSync(fullpath).isDirectory()) {
      // 使用给定回调函数对文件夹进行处理
      dirCallback(fullpath)
      // in case the dirCallback removes the directory entirely
      // 递归调用方法前，先判断文件夹是否存在，避免文件被删除的情况
      if (fs.existsSync(fullpath)) {
        preOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      }
      continue
    }
    fileCallback(fullpath)
  }
}

// We try to share as many files between TypeScript and JavaScript as possible.
// If that's not possible, we put `.ts` version alongside the `.js` one in the templates.
// So after all the templates are rendered, we need to clean up the redundant files.
// (Currently it's only `cypress/plugin/index.ts`, but we might add more in the future.)
// (Or, we might completely get rid of the plugins folder as Cypress 10 supports `cypress.config.ts`)
// 翻译一下：我们尝试在 TypeScript 和 JavaScript 之间复用尽可能多的文件。如果无法实现这一点，我们将同时保留“.ts”版本和“.js”版本。因此，在所有模板渲染完毕后，我们需要清理冗余文件。（目前只有'cypress/plugin/index.ts'是这种情况，但我们将来可能会添加更多。（或者，我们可能会完全摆脱插件文件夹，因为 Cypress 10 支持 'cypress.config.ts）
// 集成 ts 的情况下，对 js 文件做转换，不集成 ts 的情况下，将模板中的 ts 相关的文件都删除
if (needsTypeScript) {
    // Convert the JavaScript template to the TypeScript
    // Check all the remaining `.js` files:
    //   - If the corresponding TypeScript version already exists, remove the `.js` version.
    //   - Otherwise, rename the `.js` file to `.ts`
    // Remove `jsconfig.json`, because we already have tsconfig.json
    // `jsconfig.json` is not reused, because we use solution-style `tsconfig`s, which are much more complicated.
    // 将JS模板转化为TS模板，先扫描所有的 js 文件，如果跟其同名的 ts 文件存在，则直接删除 js 文件，否则将 js 文件重命名为 ts 文件
    // 直接删除 jsconfig.json 文件
    preOrderDirectoryTraverse(
      root,
      () => {},
      (filepath) => {
        // 文件处理回调函数：如果是 js 文件，则将其后缀变为 .ts 文件
        if (filepath.endsWith('.js')) {
          const tsFilePath = filepath.replace(/\.js$/, '.ts') // 先计算js文件对应的ts文件的文件名
          // 如果已经存在相应的 ts 文件，则删除 js 文件，否则将 js 文件重命名为 ts 文件
          if (fs.existsSync(tsFilePath)) {
            fs.unlinkSync(filepath)
          } else {
            fs.renameSync(filepath, tsFilePath)
          }
        } else if (path.basename(filepath) === 'jsconfig.json') { // 直接删除 jsconfig.json 文件
          fs.unlinkSync(filepath)
        }
      }
    )

// Rename entry in `index.html`
// 读取 index.html 文件内容
const indexHtmlPath = path.resolve(root, 'index.html')
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8')、
// 将 index.html 中的 main.js 的引入替换为 main.ts 的引入
fs.writeFileSync(indexHtmlPath, indexHtmlContent.replace('src/main.js', 'src/main.ts'))
} else {
    // Remove all the remaining `.ts` files
    // 将模板中的 ts 相关的文件都删除
    preOrderDirectoryTraverse(
      root,
      () => {},
      (filepath) => {
        if (filepath.endsWith('.ts')) {
          fs.unlinkSync(filepath)
        }
      }
    )
}
```

最后是对集成 ts 的文件处理，这里依然是递归的对目录进行扫描，针对文件夹和文件传不同的回调函数，做不同的处理。

在模板里面，大部分 js 和 ts 文件是可以复用的，只需要修改名字即可，但某些文件，差异比较大，无法复用，同时保留了 js 文件和 ts 文件2个版本。在处理的时候，对应可复用文件，这里会按照是否集成 ts 对文件名进行修改，对不可复用文件，则会根据集成选项的不同，删除 对应 js 文件或 ts 文件。

- readme.md 文件

```ts
// Instructions:
// Supported package managers: pnpm > yarn > npm
const userAgent = process.env.npm_config_user_agent ?? '' // process.env.npm_config_user_agent 获取当前执行的包管理器的名称和版本
const packageManager = /pnpm/.test(userAgent) ? 'pnpm' : /yarn/.test(userAgent) ? 'yarn' : 'npm'

// README generation
fs.writeFileSync(
    path.resolve(root, 'README.md'),
    generateReadme({
      projectName: result.projectName ?? result.packageName ?? defaultProjectName,
      packageManager,
      needsTypeScript,
      needsVitest,
      needsCypress,
      needsPlaywright,
      needsCypressCT,
      needsEslint
    })
)

// generateReadme.ts
// 针对不同的操作，根据包管理工具的不同，输出对应的命令，主要是区分 yarn 和 (p)npm 吧，毕竟 pnpm 和 npm 命令差不多
export default function getCommand(packageManager: string, scriptName: string, args?: string) {
  if (scriptName === 'install') {
    return packageManager === 'yarn' ? 'yarn' : `${packageManager} install`
  }

  if (args) {
    return packageManager === 'npm'
      ? `npm run ${scriptName} -- ${args}`
      : `${packageManager} ${scriptName} ${args}`
  } else {
    return packageManager === 'npm' ? `npm run ${scriptName}` : `${packageManager} ${scriptName}`
  }
}

// generateReadme.ts
import getCommand from './getCommand'

const sfcTypeSupportDoc = [
  '',
  '## Type Support for `.vue` Imports in TS',
  '',
  'TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.',
  '',
  "If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:",
  '',
  '1. Disable the built-in TypeScript Extension',
  "    1) Run `Extensions: Show Built-in Extensions` from VSCode's command palette",
  '    2) Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`',
  '2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.',
  ''
].join('\n')

export default function generateReadme({
  projectName,
  packageManager,
  needsTypeScript,
  needsCypress,
  needsCypressCT,
  needsPlaywright,
  needsVitest,
  needsEslint
}) {
  const commandFor = (scriptName: string, args?: string) => getCommand(packageManager, scriptName, args)
  let readme = `# ${projectName}

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).
${needsTypeScript ? sfcTypeSupportDoc : ''}
## Customize configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup
`

  let npmScriptsDescriptions = `\`\`\`sh
${commandFor('install')}
\`\`\`

### Compile and Hot-Reload for Development

\`\`\`sh
${commandFor('dev')}
\`\`\`

### ${needsTypeScript ? 'Type-Check, ' : ''}Compile and Minify for Production

\`\`\`sh
${commandFor('build')}
\`\`\`
`

  if (needsVitest) {
    npmScriptsDescriptions += `
### Run Unit Tests with [Vitest](https://vitest.dev/)

\`\`\`sh
${commandFor('test:unit')}
\`\`\`
`
  }

  if (needsCypressCT) {
    npmScriptsDescriptions += `
### Run Headed Component Tests with [Cypress Component Testing](https://on.cypress.io/component)

\`\`\`sh
${commandFor('test:unit:dev')} # or \`${commandFor('test:unit')}\` for headless testing
\`\`\`
`
  }

  if (needsCypress) {
    npmScriptsDescriptions += `
### Run End-to-End Tests with [Cypress](https://www.cypress.io/)

\`\`\`sh
${commandFor('test:e2e:dev')}
\`\`\`

This runs the end-to-end tests against the Vite development server.
It is much faster than the production build.

But it's still recommended to test the production build with \`test:e2e\` before deploying (e.g. in CI environments):

\`\`\`sh
${commandFor('build')}
${commandFor('test:e2e')}
\`\`\`
`
  }

  if (needsPlaywright) {
    npmScriptsDescriptions += `
### Run End-to-End Tests with [Playwright](https://playwright.dev)

\`\`\`sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
${commandFor('build')}

# Runs the end-to-end tests
${commandFor('test:e2e')}
# Runs the tests only on Chromium
${commandFor('test:e2e', '--project=chromium')}
# Runs the tests of a specific file
${commandFor('test:e2e', 'tests/example.spec.ts')}
# Runs the tests in debug mode
${commandFor('test:e2e', '--debug')}
\`\`\`
`
  }

  if (needsEslint) {
    npmScriptsDescriptions += `
### Lint with [ESLint](https://eslint.org/)

\`\`\`sh
${commandFor('lint')}
\`\`\`
`
  }

  readme += npmScriptsDescriptions
  return readme
}
```

生成 readme.md 的操作，主要是一些文本字符串的拼接操作，根据使用者的包管理工具的不同，生成不同的 readme.md 文档。经过前面的分析，再看这块，就觉得很简单了。

- 打印新项目运行提示

最后一部分是新项目运行提示，也就是当你的脚手架工程生成完毕后，告知你应该如何启动和运行你的脚手架工程。

```ts
console.log(`\nDone. Now run:\n`) // 打印提示
// 如果工程所在目录与当前目录不是同一个目录，则打印 cd xxx 指令
if (root !== cwd) {
  const cdProjectName = path.relative(cwd, root)
  console.log(
    `  ${bold(green(`cd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}`))}`
  )
}
// 根据包管理工具的不同，输出不同的安装以来指令
console.log(`  ${bold(green(getCommand(packageManager, 'install')))}`)
// 如果集成了 prettier, 输出格式化指令
if (needsPrettier) {
  console.log(`  ${bold(green(getCommand(packageManager, 'format')))}`)
}
// 根据包管理工具的不同，输出启动脚手架工程的指令
console.log(`  ${bold(green(getCommand(packageManager, 'dev')))}`)
console.log()
// 结束
```

也就是如下图所示的脚手架工程运行指引。

![image-20230904222751185](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230904222751185.png)

当项目名称带有空格时，需要带引号输出。

![image-20230904224601508](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230904224601508.png)

到这里，关于 `create-vue` 的全部核心流程就都分析完毕了。

接下来看最后一个部分，项目的打包。

## croate-vue 打包、快照和发布功能

### 1. build

一个工程化的项目，为了程序的可维护性等方面的需求，总是需要将不同功能的文件按照其职能进行分类管理，但是在实际使用过程中，不可能基于原始工程去直接使用，需要通过打包工具将项目打包为一个庞大的单文件。`create-vue` 打包指令如下：

```ts
"scripts": {
	"build": "zx ./scripts/build.mjs",
},
```

该指令执行了 `./scripts/build.mjs` 文件，接下来结合代码来分析一下打包过程。

`zx` 是一个执行脚本的工具，这在文初有简单介绍，此处先不展开分析。直接看 `build.mjs`

```js
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

await esbuild.build({
  bundle: true, // 是否打包
  entryPoints: ['index.ts'], // 入口
  outfile: 'outfile.cjs', // 出口
  format: 'cjs', // 输出格式 commonJS
  platform: 'node', // 平台
  target: 'node14',

  plugins: [
    // 此插件主要是解决 prompts 打包版本的问题，优化打包大小。是社区作者贡献的一段代码
  	// prompts 在 node 版本小于8.6时，使用 prompts/dist 下的包(此目录下的包经过转译，体积稍大)，在 node 版本大于 8.6 时，使用 prompts/lib 下的包
    // 参见如下提交
    // (https://github.com/vuejs/create-vue/pull/121)
  	// (https://github.com/terkelg/prompts/blob/a0c1777ae86d04e46cb42eb3af69ca74ae5d79e2/index.js#L11-L14)
    {
      name: 'alias',
      setup({ onResolve, resolve }) {
        onResolve({ filter: /^prompts$/, namespace: 'file' }, async ({ importer, resolveDir }) => {
          // we can always use non-transpiled code since we support 14.16.0+
          const result = await resolve('prompts/lib/index.js', {
            importer,
            resolveDir,
            kind: 'import-statement'
          })
          return result
        })
      }
    },
    // 生成开源项目的 LICENSE 文件，主要分为2部分，一部分是 create-vue 自己的 LICENSE，一部分是项目所使用依赖的 LICENSE
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
```

下面分2方面解析一下以上代码，1. esbuild.build `api` 讲解；2. 连个具体的 `plugin` 功能讲解；

#### (1) esbuild.build Api

这部分只要还是翻译官方文档了，因为核心关注点不在这块，属于快速科普，达到能理解的目的即可。

> [esbuild 官方文档](https://esbuild.github.io/api/#transform)

Esbuild 支持 `JavaScript` 和 `GoLang` 2种语言。其中 `JavaScript Api` 有异步和同步两种类型。建议使用异步API，因为它适用于所有环境，并且速度更快、功能更强大。同步 Api 仅在 `node` 环境下工作，但在某些情况下也是必要的。

同步API调用使用promise返回其结果。需要注意的是，由于使用了 `import`和 `await`关键字，需要在 `node`环境 中使用.mjs文件扩展名。

> 扩展资料：为什么使用了这2个关键字，在node环境中需要使用 `.mjs` 扩展名？
>
> [node.js如何处理esm模块](https://www.ruanyifeng.com/blog/2020/08/how-nodejs-use-es6-module.html)
>
> JavaScript 语言有两种格式的模块，一种是 ES6 模块，简称 ESM；另一种是 Node.js 专用的 CommonJS 模块，简称 CJS。这两种模块不兼容。
>
> ES6 模块和 CommonJS 模块有很大的差异。语法上面，CommonJS 模块使用`require()`加载和`module.exports`输出，ES6 模块使用`import`和`export`。用法上面，`require()`是同步加载，后面的代码必须等待这个命令执行完，才会执行。`import`命令则是异步加载，或者更准确地说，ES6 模块有一个独立的静态解析阶段，依赖关系的分析是在那个阶段完成的，最底层的模块第一个执行。
>
> Node.js 要求 ES6 模块采用`.mjs`后缀文件名。也就是说，只要脚本文件里面使用`import`或者`export`命令，那么就必须采用`.mjs`后缀名。Node.js 遇到`.mjs`文件，就认为它是 ES6 模块，默认启用严格模式，不必在每个模块文件顶部指定`"use strict"`。

```js
import * as esbuild from 'esbuild'

let result = await esbuild.build({
  bundle: true, // 是否打包
  entryPoints: ['index.ts'], // 入口
  outfile: 'outfile.cjs', // 出口
  format: 'cjs', // 输出格式 commonJS
  platform: 'node', // 平台
  target: 'node14',
	plugin: []
})
```

- bundle

打包文件意味着将任何导入的依赖项内联到文件本身。这个过程是递归的，因此依赖项的依赖项也将内联。默认情况下，esbuild不会打包输入文件，必须显式启用。如上示例，传 `true` 表示显式启用。

- entryPoints

入口文件，表示从那个文件开始进行打包。entryPoints 是一个数组，支持多个入口文件，多个入口文件，会生成多个输出文件。因此，如果是相对简单的应用，建议将所有文件统一导入到一个文件，再将该文件作为入口进行打包。如果导入多个入口文件，则必须指定一个 `outdir` 目录。

- outfile

设置输出文件名。该属性仅在从单个入口文件打包时有效。如果有多个入口文件，则必须指定`outdir` 目录。 

- format

打包输出的文件格式，有 `iife` 、`cjs` 、`esm` 三种形式。

- platform

默认情况下，esbuild的 `bundler` 被配置为生成用于浏览器的代码。如果您的`bundle`代码打算在`node`中运行，您应该将平台设置为`node`.

- target

为生成的JavaScript 或 CSS 代码设置目标环境。它告诉`esbuild`将对这些环境来说太新的`JavaScript`语法转换为在这些环境中能正常运行的的旧`JavaScript` 语法。

- plugin

plugin API 支持用户将代码注入到构建过程的各个部分。与其他API不同，它无法从命令行输入配置。必须编写JavaScript或Go代码才能使用插件API。

一个插件是一个包含 `name` 属性和 `setup` 方法的对象。通过一个数组传递给 `build Api`. 每次 build Api 调用都会运行一次`setup`函数。

> onResolve
>
> 使用onResolve添加的回调将在esbuild.build 每个模块的导入路径上运行。回调可以自定义 esbuild 如何进行路径解析。例如，它可以拦截导入路径并将其重定向到其他地方。它也可以将路径标记为外部路径。以下是一个示例：
>
> ```ts
> import * as esbuild from 'esbuild'
> import path from 'node:path'
> 
> let exampleOnResolvePlugin = {
>   name: 'example',
>   setup(build) {
>     // Redirect all paths starting with "images/" to "./public/images/"
>     build.onResolve({ filter: /^images\// }, args => {
>       return { path: path.join(args.resolveDir, 'public', args.path) }
>     })
> 
>     // Mark all paths starting with "http://" or "https://" as external
>     build.onResolve({ filter: /^https?:\/\// }, args => {
>       return { path: args.path, external: true }
>     })
>   },
> }
> 
> await esbuild.build({
>   entryPoints: ['app.js'],
>   bundle: true,
>   outfile: 'out.js',
>   plugins: [exampleOnResolvePlugin],
>   loader: { '.png': 'binary' },
> })
> ```
>
> 

#### (2) plugins

`esbuild` 的 `plugin` 的用法在上一部分已做出详解。这里我们来分析 `build.mjs ` 中的2个插件的具体作用。

首先是第一个插件：对 `prompts` 的打包处理。

```js
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
```

这段代码通过插件拦截(或者说捕获) `prompts` 的路径导入，并将其更改为从 `prompts/lib/index.js` 导入（通常情况下默认从根目录下的index.js导入）。

因为一直搞不明白这个插件的具体作用，所以通过手动注释该插件的方法，重新进行 `build` 操作，生成未使用此 `plugin`处理 的 `outfile.cjs` 文件，并运行此文件，执行脚手架搭建工程。执行结果显示发现并未对脚手架的功能造成任何影响。

接着，将包含`plugin` 和 不含 `plugin` 的输出文件进行比对，发现，两个文件的代码大部分相同，仅有的差别在于添加插件的 `outfile.cjs` 文件中的 `prompts` 的导入路径仅有 `prompts/lib/...`, 而未添加插件的版本，`outfile.cjs`文件中同时包含 2 份相同的`prompts`代码实现（导入路径分别为 `prompts/lib/...` 和 `prompts/dist/...`）。最初对此感到困惑，为何会多出一份，作用是什么。

![image-20230906222037326](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230906222037326.png)

后来揣测此插件仅是用来做打包体积优化的，并无其他用意，毕竟2个版本文件大小相差近一半。

| outfile.cjs           | 体积  |
| --------------------- | ----- |
| outfile-no-alias.cjs  | 233kb |
| outfile-with-alia.cjs | 143kb |

![image-20230906223730986](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230906223730986.png)

![image-20230906223802744](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230906223802744.png)

但是毕竟水平有限，不能完全确定，推测如不得到证实，始终心有不甘。后来想到，或许可以找到此文件的提交记录，看作者提交的意图是啥（毕竟咱也不认识豪群大佬，不能直接请教他）。果不其然，猜想得到证实，以下是该部分代码的提交记录：
[perf: exclude transpiled prompts code](https://github.com/vuejs/create-vue/pull/121)

![image-20230906224935055](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230906224935055.png)

以上提交来自一个社区贡献者，大意是，**既然这个包仅支持 node > 14.6 的版本，那么转译的 `prompts` 代码必然不会被用到，也就可以在打包时排除掉**。

看到这里，自然想到去扒开 `prompts` 库看看，到底咋回事。

![image-20230906225323476](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230906225323476.png)

恍然大悟，原来如此。`prompts` 为了兼容低版本的 `node` 环境，准备了 2 份库文件，其中在 `dist` 目录下的是一份转译后的版本。而在 `esbuild` 进行依赖打包时，递归的解析依赖，所以此处会将2个版本的 `prompts` 都进行打包。但在这个场景下，`create-vue` 的打包条件已经限制在 `node > 14`, 也即是说 `/dist/..` 下的版本永远不会被使用，这个包完全没有必要打进去。所以，这个插件在依赖解析时，直接从 `/lib/...` 下导入，大大减小了输出包的体积。

至此，我之前的猜想也可到印证，内心阴霾一扫而空，开心。😁

接下来是第二个插件：esbuildPluginLicense

插件GitHub地址：[esbuildPluginLicense](https://github.com/upupming/esbuild-plugin-license#)

简介：License generation tool similar to https://github.com/mjeanroy/rollup-plugin-license

用法：

```ts
export const defaultOptions: DeepRequired<Options> = {
  banner: `/*! <%= pkg.name %> v<%= pkg.version %> | <%= pkg.license %> */`,
  thirdParty: {
    includePrivate: false,
    output: {
      file: 'dependencies.txt',
      // Template function that can be defined to customize report output
      template(dependencies) {
        return dependencies.map((dependency) => `${dependency.packageJson.name}:${dependency.packageJson.version} -- ${dependency.packageJson.license}`).join('\n');
      },
    }
  }
} as const
```

这个插件主要是用来生成开源项目 License 的。

点开 croate-vue 的 License 文件，发现原来是这里生成的，牛逼啊。👍

这里的实现主要是生成 License 内容的操作，理解起来不难，这里需要注意的一点是，croate-vue 的 License 是将它所依赖的三方库的 License 都带上了，不仅仅是它自己的 License 内容。这充分体现了作者对三方库作者，对知识产权的尊重，值得深思和学习。

![image-20230906231728091](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230906231728091.png)

![image-20230906231747317](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230906231747317.png)

### 2. snapshot

接下来是快照功能，快照功能主要是将前文提到的各种配置进行排列组合，然后生成全部类型的 vue 脚手架工程，并将工程保存在 `playground` 文件夹中， （可能是为了后面做e2e测试的）。如下是官方仓库中的 `playground` 目录：

![image-20230908212010674](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230908212010674.png)

如图所示，这里`playground` 其实对应了一个仓库，名为 `create-vue-template`, 里面是各种版本的模板工程快照。

![image-20230908212220733](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230908212220733.png)

在下一个部分 `prepublish` 模块将会讲到快照发布的内容，这里先搁置，先来看这部分功能的实现。

```js
// snapshot.mjs
// 在 `zx` 脚本文件顶部添加事务声明，之后可以无需导入直接调用 zx 的各类函数。
#!/usr/bin/env zx
import 'zx/globals' // 此处显式引入是为了获得更好的 vscode 辅助编码支持，也可不导入

$.verbose = false // 关闭详细输出模式

// 检测包管理工具
if (!/pnpm/.test(process.env.npm_config_user_agent ?? ''))
  throw new Error("Please use pnpm ('pnpm run snapshot') to generate snapshots!")

const featureFlags = ['typescript', 'jsx', 'router', 'pinia', 'vitest', 'cypress', 'playwright']
const featureFlagsDenylist = [['cypress', 'playwright']]

// The following code & comments are generated by GitHub CoPilot.
function fullCombination(arr) {
  const combinations = []

  // for an array of 5 elements, there are 2^5 - 1= 31 combinations
  // (excluding the empty combination)
  // equivalent to the following:
  // [0, 0, 0, 0, 1] ... [1, 1, 1, 1, 1]
  // We can represent the combinations as a binary number
  // where each digit represents a flag
  // and the number is the index of the flag
  // e.g.
  // [0, 0, 0, 0, 1] = 0b0001
  // [1, 1, 1, 1, 1] = 0b1111

  // Note we need to exclude the empty combination in our case
  for (let i = 1; i < 1 << arr.length; i++) {
    const combination = []
    for (let j = 0; j < arr.length; j++) {
      if (i & (1 << j)) {
        combination.push(arr[j])
      }
    }
    combinations.push(combination)
  }
  return combinations
}

let flagCombinations = fullCombination(featureFlags)
flagCombinations.push(['default'])

// Filter out combinations that are not allowed
flagCombinations = flagCombinations.filter(
  (combination) =>
    !featureFlagsDenylist.some((denylist) => denylist.every((flag) => combination.includes(flag)))
)

// `--with-tests` are equivalent of `--vitest --cypress`
// Previously it means `--cypress` without `--vitest`.
// Here we generate the snapshots only for the sake of easier comparison with older templates.
// They may be removed in later releases.
const withTestsFlags = fullCombination(['typescript', 'jsx', 'router', 'pinia']).map((args) => [
  ...args,
  'with-tests'
])
withTestsFlags.push(['with-tests'])

flagCombinations.push(...withTestsFlags)

const playgroundDir = path.resolve(__dirname, '../playground/')
const bin = path.posix.relative('../playground/', '../outfile.cjs')

// 在playground目录下依次执行各种不同组合的指令，生成所有可能的模板的快照
cd(playgroundDir)
for (const flags of flagCombinations) {
  const projectName = flags.join('-')

  console.log(`Removing previously generated project ${projectName}`)
  await $`rm -rf ${projectName}`

  console.log(`Creating project ${projectName}`)
  await $`node ${[bin, projectName, ...flags.map((flag) => `--${flag}`), '--force']}`
}
```

开始之前，先介绍一下 `zx` 这个库。

通常，我们在 `bash` ,`cmd` 等终端中输入指令，执行各类命令。但是，如果我们希望执行特别复杂的脚本时，在终端中直接输入的方式总显的捉襟见肘。基于 `JavaScript` 等语言编写复杂的脚本文件是一个不错的选择.

而 `zx` 库则为使用 `JavaScript` 语言编写脚本实现了很好的封装，`zx` 围绕 `child_process` 提供了许多好用的功能，能帮助我们更方便的编写脚本。

**基本用法：**

为了在`js`文件中使用顶级 `await`，需要将文件命名为 `.mjs` 后缀类型（这个在 `esbuild Api` 介绍部分已简单介绍。）

需在在 `zx` 脚本文件顶部添加如下事务：

```js
#!/usr/bin/env zx
```

`$`, `cd`, `fetch`, 等所有的功能都可以直接使用，无需导入。或者可以像下面这样显式导入，这样可以获得更好的`VS Code` 自动代码提示支持。

```tsx
 import 'zx/globals'
```

- `$` 命令

使用 `$` 命令执行指令，返回一个 `ProcessPromise`。

```js
let name = 'foo & bar'
await $`mkdir ${name}`
```

如果需要，也可以传递一个参数数组：

```js
let flags = [
  '--oneline',
  '--decorate',
  '--color',
]
await $`git log ${flags}`
```

如果执行的程序返回退出代码(`exit 1`)，则将抛出一个ProcessOutput。

```js
try {
  await $`exit 1`
} catch (p) {
  console.log(`Exit code: ${p.exitCode}`)
  console.log(`Error: ${p.stderr}`)
}
```

- $.verbose

指定输出详细程度，默认为 `true`, 详细输出。在详细模式下，zx打印所有已执行的命令及其输出。 

- `cd()`方法

更改当前工作目录。

```ts
cd('/tmp')
await $`pwd` // => /tmp
```

- ###### stdin()

获取转化为字符串的stdin内容。

```js
let content = JSON.parse(await stdin())
```

以上是一些 `zx` 的基本用法， 下面我们来分析下 snapshot 实现的功能。

```js
#!/usr/bin/env zx
import 'zx/globals' // 此处显式引入是为了获得更好的 vscode 辅助编码支持，也可不导入
$.verbose = false // 关闭详细输出模式
```

在`JavaScript` 文件顶部添加 `#!/usr/bin/env zx`, 表示一个事务声明，添加之后可以无需导入直接调用 zx 的各类函数。

`import 'zx/globals' ` 显式导入其实不是必要的， 但是导入后可以获得更好的 vscode 支持。

`$.verbose` 属性表示命令执行输出信息详细程度，为 `true` 表示详细输出。

```js
// The following code & comments are generated by GitHub CoPilot.
function fullCombination(arr) {
  const combinations = []

  // for an array of 5 elements, there are 2^5 - 1= 31 combinations
  // (excluding the empty combination)
  // equivalent to the following:
  // [0, 0, 0, 0, 1] ... [1, 1, 1, 1, 1]
  // We can represent the combinations as a binary number
  // where each digit represents a flag
  // and the number is the index of the flag
  // e.g.
  // [0, 0, 0, 0, 1] = 0b0001
  // [1, 1, 1, 1, 1] = 0b1111

  // Note we need to exclude the empty combination in our case
  for (let i = 1; i < 1 << arr.length; i++) { // i < 32, 1-31
    const combination = []
    for (let j = 0; j < arr.length; j++) {
      if (i & (1 << j)) {
        combination.push(arr[j])
      }
    }
    combinations.push(combination)
  }
  return combinations
}
```

<< 表示左移运算，如 1<<5 表示将二进制数 `00000001` 左移5位，变为 `00100000`, 即 32.

`&`是位与运算符。它对两个操作数的每一位执行逻辑与操作，并返回一个新的数值。

这段代码实现了一个函数`fullCombination`，它接受一个数组作为参数，并返回该数组的所有非空子集的组合。

代码的核心思想是使用二进制表示法来表示组合。对于给定的数组，假设长度为n，那么总共会有2^n - 1个组合（不包括空组合）。

代码使用两个嵌套的循环来生成组合。外层循环从1到2^n - 1，表示所有可能的组合的二进制表示。内层循环遍历数组的每个元素，通过位运算来判断该元素是否应该包含在当前组合中。具体来说，代码使用位运算符`&`来检查二进制表示中的每一位是否为1，如果是，则将对应的数组元素添加到当前组合中。

最后，生成的组合存储在一个数组`combinations`中，并作为函数的返回值返回。

```js
const featureFlags = ['typescript', 'jsx', 'router', 'pinia', 'vitest', 'cypress', 'playwright']
const featureFlagsDenylist = [['cypress', 'playwright']]

let flagCombinations = fullCombination(featureFlags)
flagCombinations.push(['default'])

// Filter out combinations that are not allowed
flagCombinations = flagCombinations.filter(
  (combination) =>
    !featureFlagsDenylist.some((denylist) => denylist.every((flag) => combination.includes(flag)))
)
// `--with-tests` are equivalent of `--vitest --cypress`
// Previously it means `--cypress` without `--vitest`.
// Here we generate the snapshots only for the sake of easier comparison with older templates.
// They may be removed in later releases.
const withTestsFlags = fullCombination(['typescript', 'jsx', 'router', 'pinia']).map((args) => [
  ...args,
  'with-tests'
])
withTestsFlags.push(['with-tests'])

flagCombinations.push(...withTestsFlags)
```

这段代码调用上面的`fullCombination`方法，对上面的多种指令进行排列组合，最终结果有112种情况。

```js
const featureFlags = ['typescript', 'jsx', 'router', 'pinia', 'vitest', 'cypress', 'playwright']
const featureFlagsDenylist = [['cypress', 'playwright']]

let flagCombinations = fullCombination(featureFlags)
flagCombinations.push(['default'])
// 前一部分共 128个组合

// Filter out combinations that are not allowed
flagCombinations = flagCombinations.filter(
  (combination) =>
    !featureFlagsDenylist.some((denylist) => denylist.every((flag) => combination.includes(flag)))
)
// 过滤掉同时含有'cypress'和 'playwright'的组合 32 个，变为 96个
// `--with-tests` are equivalent of `--vitest --cypress`
// Previously it means `--cypress` without `--vitest`.
// Here we generate the snapshots only for the sake of easier comparison with older templates.
// They may be removed in later releases.
const withTestsFlags = fullCombination(['typescript', 'jsx', 'router', 'pinia']).map((args) => [
  ...args,
  'with-tests'
])
withTestsFlags.push(['with-tests'])
flagCombinations.push(...withTestsFlags)
// 96个又添加16个，共112个
```

![image-20230909234212205](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230909234212205.png)

```js
const playgroundDir = path.resolve(__dirname, '../playground/')
const bin = path.posix.relative('../playground/', '../outfile.cjs')

cd(playgroundDir)
for (const flags of flagCombinations) {
  const projectName = flags.join('-')

  console.log(`Removing previously generated project ${projectName}`)
  await $`rm -rf ${projectName}`

  console.log(`Creating project ${projectName}`)
  await $`node ${[bin, projectName, ...flags.map((flag) => `--${flag}`), '--force']}`
}
```

最后一段，首先清空`playground` 目录，移除之前的版本，然后根据前面计算出的112种组合的配置生成 112 种创建脚手架工程指令，并使用 `zx` 执行，最终得到112种快照。

![image-20230909234953872](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230909234953872.png)

### 3. prepublish

```js
#!/usr/bin/env zx
import 'zx/globals'

await $`pnpm build`
await $`pnpm snapshot`

let { version } = JSON.parse(await fs.readFile('./package.json'))

const playgroundDir = path.resolve(__dirname, '../playground/')
cd(playgroundDir)

await $`pnpm install`
await $`git add -A .`
try {
  await $`git commit -m "version ${version} snapshot"`
} catch (e) {
  if (!e.stdout.includes('nothing to commit')) {
    throw e
  }
}
// 前一部分，运行指令进行构建，快照生成，并将快照推到 playground 子仓库中
// ----------------------------------------------------------

await $`git tag -m "v${version}" v${version}`
await $`git push --follow-tags`

const projectRoot = path.resolve(__dirname, '../')
cd(projectRoot)
await $`git add playground`
await $`git commit -m 'chore: update snapshot' --allow-empty`
await $`git push --follow-tags`
// 后一部分则将整体的更改推送到主仓库，其中包含添加版本号和tag的操作
// ----------------------------------------------------------

```

这部分主要功能是依次执行打包和快照功能，然后将新的版本代码推送到仓库。

这里主要注意的一点是，**`playground` 目录是作为一个 `gitmodules` 存储在另一个仓库的**。

以上代码分为2部份，前一部分提交和推送快照子仓库的代码，后一部分则是推送主仓库的代码。

```js
[submodule "playground"]
	path = playground
	url = https://github.com/vuejs/create-vue-templates.git
```

这里是 `.gitmodules` 文件中关于子 `git` 仓库的配置。对应仓库内容如下。

![image-20230910000813062](https://cherish-1256678432.cos.ap-nanjing.myqcloud.com/typora/image-20230910000813062.png)

## 结束了

