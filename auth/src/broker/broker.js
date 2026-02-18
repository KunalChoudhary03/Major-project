const amqplib = require('amqplib')

let channel,connection;

//Connects Server to RabbitMQ and creates a channel for communication.
async function connect(){
    if(connection) return connection;
    try{
  connection = await amqplib.connect(process.env.RABBIT_URL);
  console.log("Connected to RabbitMQ");
  channel = await connection.createChannel();
    }catch(err){
        console.error("Error connecting to RabbitMQ:", err);
    }
}
// assert`Queue` is used to create a queue if it doesn't exist already. It ensures that the queue is available for sending messages. The `durable: true` option means that the queue will survive a broker restart, ensuring that messages are not lost.
async function publishToQueue(QueueName,data = {}){
    if(!channel || !connection) await connect();
    await channel.assertQueue(QueueName,{durable:true});
    channel.sendToQueue(QueueName,Buffer.from(JSON.stringify(data)))
    console.log('Message sent to queue ', QueueName, data);
    
}

//This function is used to subscribe to a queue and consume messages from it.
async function subscribeToQueue(QueueName,callback){
    if(!channel || !connection) await connect();
    await channel.assertQueue(QueueName,{
        durable:true
    })
    channel.consume(QueueName, async(msg)=>{
        if(msg !== null){
        const data = JSON.parse(msg.content.toString());
        await callback(data);
        channel.ack(msg); 
     }
    })
}


module.exports = {
    connect,
    channel,
    connection
    ,publishToQueue,
    subscribeToQueue
}