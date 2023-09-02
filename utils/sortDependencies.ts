
// 将四种类型的依赖进行一个排序，共4种类型：dependencies、devDependencies、peerDependencies、optionalDependencies
// 这一步没有很大的必要，不要也不影响功能，主要是为了将以上四个类型属性在package.json中的位置统一一下，
// 按照dependencies、devDependencies、peerDependencies、optionalDependencies 这个顺序以此展示这些依赖项。
export default function sortDependencies(packageJson) {
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
