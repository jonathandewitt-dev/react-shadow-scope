import express from 'express'
import path from 'path'

const app = express()
const port = 3001
const rootDir = path.resolve(__dirname, '..')

app.use(express.static(rootDir))

app.get('/', (req, res) => res.sendFile(rootDir + '/fixtures/demo/demo.html'))

app.listen(port, () => console.log(`Thunder-State demo listening on port ${port}!`))
