import * as fs from 'node:fs'
import * as path from 'node:path'

import deepMerge from './deepMerge'
import sortDependencies from './sortDependencies'

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
  // src 目录的文件状态
  const stats = fs.statSync(src)

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

  /**
   * 如果当前src是单个文件，则直接复制到目标路径下，但有以下几类文件例外，要特殊处理。
   * package.json 做合并操作, 并对内部的属性的位置做了排序；
   * extensions.json 做合并操作；
   * 以 _ 开头的文件名转化为 . 开头的文件名；
   * _gitignore 文件，将其中的配置追加到目标目录对应文件中；
  */
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

export default renderTemplate
