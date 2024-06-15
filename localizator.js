// Co-created by Livio Gamassia and Celian Moutafis: https://github.com/LivioGama/localizator
// https://developers.google.com/drive/api/quickstart/nodejs
import {authenticate} from '@google-cloud/local-auth'
import fs from 'fs'
import {google} from 'googleapis'
import path from 'path'
import process from 'process'
import yargs from 'yargs'

import {hideBin} from 'yargs/helpers'
import {translateWeb, translateAndroid, translateIos} from './translations.js'

const yargsInstance = yargs(hideBin(process.argv))
const args = yargsInstance.wrap(yargsInstance.terminalWidth()).parse()

const SCOPES = ['https://www.googleapis.com/auth/drive']
const TOKEN_PATH = path.join(process.cwd(), 'token.json')
const CREDENTIALS_PATH = path.join(process.cwd(), 'client_secret.json')

const getCredentials = async () => {
  let credentials = null
  try {
    const content = fs.readFileSync(TOKEN_PATH, 'utf-8')
    credentials = JSON.parse(content)
  } catch (err) {
    const client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    })
    if (client.credentials) {
      const cs = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
      const payload = JSON.stringify({
        type: 'authorized_user',
        client_id: client.credentials.client_id || cs.installed.client_id,
        client_secret: client.credentials.client_secret || cs.installed.client_secret,
        refresh_token: client.credentials.refresh_token,
      })
      fs.writeFileSync(TOKEN_PATH, payload)
      credentials = JSON.parse(payload)
    }
  }
  return credentials
}

const getFiles = async service => {
  const res = await service.files.list({fields: 'files(id, name)'})
  const files = res.data.files
  if (files.length === 0) {
    console.log('No files found.')
    return null
  }
  return {service, files}
}

const downloadFile = async (service, driveFile, tabId) => {
  console.log(`Downloading ${driveFile.id}`)
  const res = await service.files.export({fileId: driveFile.id, mimeType: 'text/csv'})
  if (res.status === 200) {
    return res.data
  } else {
    console.log(`HTTP error: ${res.status}`)
    if (tabId) {
      console.log('Maybe --gid is wrong?')
    }
    process.exit(-1)
  }
}

const main = async () => {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.log(
      `'${CREDENTIALS_PATH}' file does not exist.\nEnable the API and save the '${CREDENTIALS_PATH}' file here.\nhttps://console.developers.google.com/flows/enableapi?apiid=drive`
    )
    process.exit(-1)
  }

  const credentials = await getCredentials()
  console.log('Authorizing...')
  const auth = google.auth.fromJSON(credentials)
  const service = google.drive({version: 'v3', auth})
  console.log('Listing files...')
  const {files} = await getFiles(service)

  let file
  if (args.id) {
    const fileId = args.id
    file = files.find(item => item.id === fileId)
    if (!file) {
      console.log(
        `File with id '${fileId}' not found in files list.\nNotice: you need to load the file at least once in your browser, so it's visible in your files list.`
      )
      process.exit(-1)
    }
  } else {
    files.forEach((item, index) => {
      console.log(`[${index}] ${item.name} - ${item.id}`)
    })
    const index = await new Promise(resolve => {
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdout.write('Select a file index: ')
      process.stdin.on('data', data => {
        const selectedIndex = parseInt(data.trim(), 10)
        if (selectedIndex >= 0 && selectedIndex < files.length) {
          resolve(selectedIndex)
        } else {
          console.log('Invalid index supplied. Try again')
          process.stdout.write('Select a file index: ')
        }
      })
    })
    file = files[index]
  }

  const tabId = args.gid || ''
  const content = await downloadFile(service, file, tabId)
  const filename = 'tmp.csv'
  fs.writeFileSync(filename, content)

  // retrieve from args a list of languages and transform them into an array
  const languages = (args.languages || 'en').split(',')
  console.log(`Languages: ${languages} (in Google Spreadsheet columns order)`)

  const platform = args.platform || 'web'
  const path = args.path || './'
  if (platform === 'ios') {
    translateIos(filename, path, languages)
  } else if (platform === 'android') {
    translateAndroid(filename, path, languages)
  } else if (platform === 'web') {
    translateWeb(filename, path, languages)
  } else {
    console.log('Invalid platform. type --help for help')
  }

  const keepCsv = args.keep_csv
  if (!keepCsv) {
    fs.unlinkSync(filename)
  }
  console.log(
    `Success! Localization files for platform ${platform} have been generated under '${path}'`
  )
}

main().catch(console.error)
