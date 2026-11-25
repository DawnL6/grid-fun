import Fastify from 'fastify';
const app=Fastify({logger:true});
app.get('/health',async()=>({status:'ok',service:'grid-fun'}));
app.listen({port:Number(process.env.PORT || 3000),host:process.env.HOST || '127.0.0.1'}).catch(e=>{app.log.error(e);process.exit(1)});
