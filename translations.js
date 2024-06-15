import * as csv from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'

const translateIos = (file, outputPath, languages) => {
  const csvData = fs.readFileSync(file, 'utf-8')
  const rows = csv.parse(csvData, {delimiter: ','})

  const directories = ['Base.lproj', ...languages.map(language => `${language}.lproj`)]

  directories.forEach(dir => {
    const dirPath = path.join(outputPath, dir)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, {recursive: true})
    }
  })

  const writeStreams = directories.reduce((streams, dir) => {
    const filePath = path.join(outputPath, dir, 'Localizable.strings')
    streams[dir] = fs.createWriteStream(filePath)
    return streams
  }, {})

  rows.slice(1).forEach(row => {
    const [key, ...values] = row

    if (key) {
      directories.forEach((dir, index) => {
        const value = values[index]
        if (value) {
          writeStreams[dir].write(`"${key}"="${escapeIos(value)}";\n`)
        }
      })
    }
  })

  Object.values(writeStreams).forEach(stream => stream.end())
}

const translateAndroid = (file, outputPath, languages) => {
  const locales = {}
  languages.forEach((language, index) => {
    locales[language] = {
      file: `values${language === 'en' ? '' : `-${language}`}/`,
      column: index + 1,
    }
  })

  Object.keys(locales).forEach(locale => {
    const csvData = fs.readFileSync(file, 'utf-8')
    const rows = csv.parse(csvData, {delimiter: ','})
    const localePath = path.join(outputPath, locales[locale].file)
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, {recursive: true})
    }
    if (!fs.existsSync(localePath)) {
      fs.mkdirSync(localePath, {recursive: true})
    }
    const filePointer = fs.createWriteStream(path.join(localePath, 'strings.xml'))
    filePointer.write('<?xml version="1.0" encoding="utf-8"?>\n')
    filePointer.write('<resources>\n')

    rows.slice(1).forEach(row => {
      const key = row[0]
      const value = row[locales[locale].column]
      const escapedValue = escapeAndroid(value)

      if (!isValidAndroidKey(key)) {
        console.log('Invalid android key provided: ' + key)
      } else {
        filePointer.write(`    <string name="${key}">${escapedValue}</string>\n`)
      }
    })

    filePointer.write('</resources>')
    filePointer.end()
  })
}

const translateWeb = (file, outputPath, languages) => {
  languages.forEach((locale, index) => {
    const csvData = fs.readFileSync(file, 'utf-8')
    const rows = csv.parse(csvData, {delimiter: ','})
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, {recursive: true})
    }
    const filePointer = fs.createWriteStream(path.join(outputPath, `${locale}.ts`))
    filePointer.write(`export const ${locale} = {\n`)

    rows.slice(1).forEach(row => {
      const key = row[0]
      const value = row[index + 1]
      const escapedValue = escapeManager(value) || 'TODO'
      filePointer.write(`  ${key}: \`${escapedValue}\`,\n`)
    })

    filePointer.write('}')
    filePointer.end()
  })
}

const escapeIos = str => str.replace(/"/g, '\\"').replace(/\\\\n/g, '\\n')

const isValidAndroidKey = str => {
  const regex = /^[a-z]+([a-z]*(_)*([0-9])*)*$/
  return regex.test(str)
}

const escapeAndroid = str => {
  let tmp = str
    .replace(/"/g, '\\"')
    .replace(/\\\\n/g, '\\n')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/%@/g, '%s')
    .replace(/&/g, '&amp;')

  if (str.includes('<') || str.includes('>')) {
    return `<![CDATA[${tmp}]]>`
  } else {
    return tmp
  }
}

const escapeManager = str => str.replace(/\\\\n/g, '\\n')

export {translateIos, translateAndroid, translateWeb}
