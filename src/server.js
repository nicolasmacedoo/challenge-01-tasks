import http from 'node:http'
import { json } from './middlewares/json.js'
import { routes } from './routes.js'
import { extractQueryParams } from './utils/extract-query-params.js'
import multer from 'multer'
import fs from 'node:fs'

// const upload = multer({ dest: 'uploads/' });

// const server = http.createServer((req, res) => {
//   if (req.method === 'POST' && req.url === '/tasks/upload') {
//     // Usa o Multer para processar o upload do arquivo
//     upload.single('file')(req, res, (err) => {
//       if (err) {
//         console.log(err)
//         res.writeHead(500, { 'Content-Type': 'text/plain' });
//         res.end('Erro ao fazer upload do arquivo');
//         return;
//       }

//       if (!req.file) {
//         res.writeHead(400, { 'Content-Type': 'text/plain' });
//         res.end('Nenhum arquivo foi enviado');
//         return;
//       }

//       // Lê o conteúdo do arquivo CSV
//       fs.readFile(req.file.path, 'utf8', (err, data) => {
//         if (err) {
//           res.writeHead(500, { 'Content-Type': 'text/plain' });
//           res.end('Erro ao ler o arquivo');
//           return;
//         }

//         // Aqui você pode processar o conteúdo do CSV
//         console.log('Conteúdo do CSV:', data);

//         // Responde ao cliente
//         res.writeHead(200, { 'Content-Type': 'text/plain' });
//         res.end('Arquivo CSV recebido e processado com sucesso');

//         // Remove o arquivo temporário
//         fs.unlink(req.file.path, () => {});
//       });
//     });
//   } else {
//     res.writeHead(404, { 'Content-Type': 'text/plain' });
//     res.end('Rota não encontrada');
//   }
// });

// const PORT = 3333;
// server.listen(PORT, () => {
//   console.log(`Servidor rodando na porta ${PORT}`);
// });

const upload = multer({ dest: 'src/uploads/' })

async function processCSV(file, res) {
  const stream = fs.createReadStream(file.path);

  const csvParse = parse({
    delimiter: ',',
    columns: true,
    skipEmptyLines: true,
  });

  const linesParse = stream.pipe(csvParse);

  for await (const line of linesParse) {
    const { title, description } = line;

    const task = {
      id: randomUUID(),
      title,
      description,
      createdAt: new Date(),
      completedAt: null,
      updatedAt: null,
    };

    // Aqui você faria a inserção no banco de dados
    console.log('Task:', task);
    // database.insert('tasks', task); // Simulação de inserção no banco
  }

  // Após processar, retornar a resposta ao cliente
  res.writeHead(201).end('Arquivo CSV recebido e processado com sucesso');
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req
  console.log(req.rawHeaders)
  
  // await json(req, res)
  
  // if (method === 'POST' && url === '/tasks/upload') {
  //   const middleware = upload.single('file');

  //   middleware(req, res, async (err) => {
  //     if (err) {
  //       console.log('Erro no upload:', err);
  //       return res.writeHead(500).end(err.message);
  //     }

  //     const { file } = req;

  //     if (!file) {
  //       return res.writeHead(400).end('Nenhum arquivo foi enviado');
  //     }

  //     console.log('Arquivo recebido:', file);

  //     try {
  //       await processCSV(file, res);
  //     } catch (error) {
  //       console.log('Erro ao processar CSV:', error);
  //       res.writeHead(500).end('Erro ao processar o arquivo CSV');
  //     }

  //     // Remover o arquivo temporário após processar
  //     fs.unlink(file.path, (err) => {
  //       if (err) {
  //         console.error('Erro ao remover o arquivo temporário:', err);
  //       }
  //     });
  //   });
  //   return;
  // }

  const route = routes.find(route => {
    return route.method === method && route.path.test(url)
  })

  // if (route) {
  //   const routeParams = req.url.match(route.path)

  //   const { query, ...params } = routeParams.groups

  //   req.params = params
  //   req.query = query ? extractQueryParams(query) : null

  //   return route.handler(req, res)
  // }
  if (route) {
    const routeParams = req.url.match(route.path)

    const { query, ...params } = routeParams.groups

    req.params = params
    req.query = query ? extractQueryParams(query) : null

    if (Array.isArray(route.handler)) {
      for (const handler of route.handler) {
        await handler(req, res)
      }
    } else {
      await route.handler(req, res)
    }

    return
  }

  return res.writeHead(404).end()
})

server.listen(3333)


//se a meta ja esta completa nao deixar editar o titulo