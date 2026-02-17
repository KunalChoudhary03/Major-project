const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const agent = require('../agent/agent');



async function initSocketServer(httpServer) {

    // Use default path (/socket.io/) and permissive CORS so tools like Postman can connect
    const io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
            allowedHeaders: ['Authorization'],
            credentials: true,
        },
    })

    // Accept JWT from cookie, Authorization header, handshake.auth, or query ?token=
    io.use((socket, next) => {
        const hdrs = socket.handshake.headers || {}
        const cookiesStr = hdrs.cookie
        const parsedCookies = cookiesStr ? cookie.parse(cookiesStr) : {}
        const cookieToken = parsedCookies.token

        const authHeader = hdrs.authorization || hdrs.Authorization
        const headerToken = authHeader && authHeader.startsWith('Bearer ')
            ? authHeader.slice('Bearer '.length).trim()
            : null

        const authToken = socket.handshake.auth?.token
        const queryToken = socket.handshake.query?.token

        const token = cookieToken || headerToken || authToken || queryToken

        if (!token) {
            return next(new Error('Token not provided'))
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            socket.user = decoded
            socket.token = token
            return next()
        } catch (err) {
            return next(new Error('Invalid token'))
        }
    })

    io.on('connection', (socket) => {

        console.log('socket connected user:', socket.user)


        socket.on('message', async (data) => {
            try {
                console.log('Received message from client:', data)
                const agentResponse = await agent.invoke({
                    messages: [
                        { role: 'user', content: data }
                    ]
                }, {
                    configurable: { token: socket.token }
                })

                console.log('agentResponse', agentResponse)

                const lastMessage = agentResponse.messages[agentResponse.messages.length - 1]


                socket.emit('agent:response', lastMessage.content)
            } catch (err) {
                console.error('Agent handling error:', err)
                socket.emit('assistant:error', { message: err?.message || 'Something went wrong.' })
            }
        })

    })

}


module.exports = { initSocketServer };