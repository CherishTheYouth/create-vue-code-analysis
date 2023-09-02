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
| zx                        | Bash很棒，但当涉及到编写更复杂的脚本时，许多人更喜欢更方便的编程语言。JavaScript是一个完美的选择，但是Node.js标准库在使用之前需要额外的麻烦。zx包为child_process提供了有用的包装器，转义参数并给出了合理的默认值。 |

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
render('base')

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
```



