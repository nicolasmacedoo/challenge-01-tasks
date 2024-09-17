import { randomUUID } from 'node:crypto'
import { Database } from "./database.js"
import { buildRoutePath } from './utils/build-route-path.js'
import { parse } from 'csv-parse'
import multer from 'multer'
import fs from "node:fs";
import { json } from './middlewares/json.js'

const database = new Database()
const upload = multer({ dest: 'src/uploads/' })

export const routes = [
  {
    method: 'GET',
    path: buildRoutePath('/tasks'),
    handler: (req, res) => {
      const quer = req.query

      console.log('QUER', quer)

      const tasks = database.select('tasks', quer ? quer : null)

      return res.end(JSON.stringify(tasks))
    }
  }, 
  {
    method: 'POST',
    path: buildRoutePath('/tasks/upload'),
    handler: async (req, res) => {
      // const middleware = upload.single('file')

      upload.single('file')(req, res, async (err) => {
        if (err) {
          console.log(err)
          return res.writeHead(500).end(
            JSON.stringify({ message: err.message })
          )
        }

        const { file } = req

        console.log('FILE', file)

        if (!file) {
          return res.writeHead(400).end('Nenhum arquivo foi enviado')
        }

        const stream = fs.createReadStream(file.path)

        const csvParse = parse({
          delimiter: ',',
          columns: true,
          skipEmptyLines: true,
        })

        // const tasks = []

        // stream.pipe(csvParse)
        //   .on('data', (data) => {
        //     const { title, description } = data
        //     const task = {
        //       id: randomUUID(),
        //       title,
        //       description,
        //       createdAt: new Date().toISOString(),
        //       completedAt: null,
        //       updatedAt: null
        //     }
        //     database.insert('tasks', task)
        //     tasks.push(task)
        //   })
        //   .on('end', () => {
        //     res.writeHead(201, { 'Content-Type': 'application/json' })
        //     res.end(JSON.stringify({ message: 'Tasks uploaded successfully', tasks }))
        //   })
        //   .on('error', (error) => {
        //     res.writeHead(500).end(error.message)
        //   })

        const linesParse = stream.pipe(csvParse)

        for await (const line of linesParse) {
          const { title, description } = line

          const task = {
            id: randomUUID(),
            title,
            description,
            createdAt: new Date(),
            completedAt: null,
            updatedAt: null,
          }

          database.insert('tasks', task)
        }

        // Remover o arquivo temporário após processar
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error('Erro ao remover o arquivo temporário:', err);
          }
        });

        res.writeHead(201).end('Arquivo CSV recebido e processado com sucesso')
      })
    }
  },
  {
    method: 'POST',
    path: buildRoutePath('/tasks'),
    handler: async (req, res) => {
      await json(req, res)
        
      const { title, description } = req.body

      if (!title) {
        return res.writeHead(400).end(
          JSON.stringify({ message: 'title is required!' }  
        ))
      }

      if (!description) {
        return res.writeHead(400).end(
          JSON.stringify({ message: 'description is required! '}
        ))
      }

      const task = {
        id: randomUUID(),
        title, 
        description, 
        createdAt: new Date(),
        completedAt: null,
        updatedAt: null,
      }

      const data = database.insert('tasks', task)

      return res.writeHead(201).end(JSON.stringify(data))
    }
  }, 
  {
      method: 'PATCH',
      path: buildRoutePath('/tasks/:id'),
      handler: (req, res) => {
        const { id } = req.params

        const [task] = database.select('tasks', { id })

        if (!task) {
          return res.writeHead(404).end(
            JSON.stringify({ message: 'task not found! '})
          )
        }

        const isTaskCompleted = !!task.completedAt
        const completedAt = isTaskCompleted ? null : new Date()

        database.update('tasks', id, { completedAt })

        res.writeHead(204).end()
      }
  },
  {
    method: 'PUT',
    path: buildRoutePath('/tasks/:id'),
    handler: async (req, res) => {
      await json(req, res)

      const { id } = req.params
      const data = req.body

      // if(!data.title && !data.description) {
      //   return res.writeHead(400).end(
      //     JSON.stringify({ message: 'title or description are required!' })
      //   )
      // }

      const [task] = database.select('tasks', { id })

      if (!task) {
        return res.writeHead(404).end(
          JSON.stringify({ message: 'task not found!' })
        )
      }

      database.update('tasks', id, data)

      // database.update('tasks', id, {
      //   title: title ?? task.title,
      //   description: description ?? task.description,
      //   updatedAt: new Date()
      // })

      res.writeHead(204).end()
    }
},
  {
    method: 'DELETE',
    path: buildRoutePath('/tasks/:id'),
    handler: (req, res) => {
      const { id } = req.params

      const [task] = database.select('tasks', { id })

      if (!task) {
        return res.writeHead(404).end(
          JSON.stringify({ message: 'task not found!' })
        )
      }

      database.delete('tasks', id)

      res.writeHead(204).end()
    }
  }
]

/** !! (Double Negation): The double exclamation mark is a common JavaScript idiom used to convert a value to a boolean. The first ! negates the value, converting it to its boolean opposite. The second ! negates it again, converting it back to its original boolean representation. Essentially, this ensures that task.completedAt is converted to true if it is truthy (i.e., not null, undefined, 0, NaN, "", or false) and false if it is falsy. */