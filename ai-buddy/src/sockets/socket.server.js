const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const agent = require('../agent/agent');



async function initSocketServer(httpServer) {

    const io = new Server(httpServer, {})

    io.use((socket, next) => {

        const cookies = socket.handshake.headers?.cookie;

        const { token } = cookies ? cookie.parse(cookies) : {};

        if (!token) {
            return next(new Error('Token not provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            socket.user = decoded;
            socket.token = token;

            next()

        } catch (err) {
            next(new Error('Invalid token'));
        }

    })

    io.on('connection', (socket) => {

        console.log(socket.user, socket.token)


        socket.on('message', async (data) => {
            try {
                const agentResponse = await agent.invoke({
                    messages: [
                        {
                            role: "user",
                            content: data
                        }
                    ]
                }, {
                    metadata: {
                        token: socket.token
                    }
                })

                const lastMessage = agentResponse?.messages?.at(-1)?.content

                if (lastMessage) {
                    socket.emit('message', lastMessage)
                } else {
                    socket.emit('message', "I couldn't generate a response.")
                }
            } catch (err) {
                if (err?.status === 429) {
                    socket.emit('message', "AI quota exceeded. Please try again later.")
                } else {
                    socket.emit('message', "AI error occurred. Please try again.")
                }
                console.error('AI Error', err)
            }
        })

    })

}


module.exports = { initSocketServer };