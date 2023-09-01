import * as fs from 'node:fs'
import * as path from 'node:path'

export function preOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  for (const filename of fs.readdirSync(dir)) {
    if (filename === '.git') {
      continue
    }
    const fullpath = path.resolve(dir, filename)
    if (fs.lstatSync(fullpath).isDirectory()) {
      dirCallback(fullpath)
      // in case the dirCallback removes the directory entirely
      if (fs.existsSync(fullpath)) {
        preOrderDirectoryTraverse(fullpath, dirCallback, fileCallback)
      }
      continue
    }
    fileCallback(fullpath)
  }
}

// 这个方法递归的遍历给定文件夹，并对内部的 文件夹 和 文件 按照给定的回调函数进行操作。
export function postOrderDirectoryTraverse(dir, dirCallback, fileCallback) {
  // 遍历dir下的文件
  for (const filename of fs.readdirSync(dir)) {
    // 如果文件是 .git 文件，则跳过
    if (filename === '.git') {
      continue
    }
    // 计算文件路径
    const fullpath = path.resolve(dir, filename)
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
