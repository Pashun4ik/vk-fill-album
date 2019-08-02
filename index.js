const fs = require('fs')
const {promisify} = require('util')
const path = require('path')

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const readfile = promisify(fs.readFile)
const readdir = promisify(fs.readdir)

const request = require('request-promise-native')

const {VK} = require('vk-io')

const config = require('./config')

const notEnteredConfigValues = Object
    .entries(config)
    .reduce((acc, [key, value]) => acc.concat(value ? [] : key), [])

if(notEnteredConfigValues.length) {
    console.log('Введите следующие переменные в конфиге:', notEnteredConfigValues.join(', '))
    process.exit()
}

const dir = path.resolve(__dirname, config.imagesDir)

const vk = new VK({
    token: config.accessToken
})

vk.api.photos
    .getUploadServer({
        album_id: config.albumId
    })
    .then(async ({album_id, upload_url, user_id}) => {
        const images = (await readdir(dir))
            .sort((a, b) =>
                fs.statSync(path.resolve(dir, b)).mtime.getTime() - 
                fs.statSync(path.resolve(dir, a)).mtime.getTime())
        
        for(let image of images) {
            const formData = {
                file: fs.createReadStream(path.resolve(dir,  image))
            }
            
            const {aid, hash, server, photos_list} = await request.post({
                url: upload_url,
                formData,
                json: true
            })
             
            await vk.api.photos
                .save({
                    album_id,
                    photos_list,
                    hash,
                    server
                })
                .then(([x]) => x)
                .then(({id}) => console.log({id}))

            await sleep(300)
        }
    })