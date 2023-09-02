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

export default deepMerge
