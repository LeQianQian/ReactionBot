const { Sequelize, Model, DataTypes, Op } = require("sequelize");
const sequelize = new Sequelize("sqlite::memory:");
const { Client, Collection, Events, GatewayIntentBits, Partials, Formatters, codeBlock } = require('discord.js');
const { token } = require('./config.json');
const { Messages } = require('./dbObjects');
// 创建客户端
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
// 创建消息集合
const messages = new Collection();

// 重启机器人后校对数据库数据是否和客户端一致
async function checkDatabase() {
    // 选定处理频道
    const channel = client.channels.cache.get('xxx');
    // 获取数据库所有内容
    var database = await Messages.findAll();
    // 消息处理
    for (var i = 0; i < database.length; i++) {
        // 获取单条消息
        var message = await channel.messages.fetch(database[i].messageId);
        // 创建标志位，判断是否有点赞，如果没有，upCount置为0
        var flag = false;
        // 遍历所有反应
        message.reactions.cache.forEach(res => {
            // 找到点赞的反应，把值赋给数据库变量
            if (res._emoji.name == '👍') {
                database[i].upCount = res.count;
                flag = true;
            }
        });
        if(flag==false){
            database[i].upCount = 0;
        }
    }
    // 把database数据写入messages集合中，键名为messageId
    database.forEach(b =>{
        messages.set(b.messageId, b);
        //console.log(b)
    });
    return true;
}

// 增加计数
async function upCountAdd(messageId, messageAuthor) {
    // 通过get函数从集合messages中找到符合messageId的值，赋给message
    var message = messages.get(messageId);
    // 如果message 在集合中存在
    if (message) {
        message.upCount += 1;
        return message.save();
    } else {
        // 如果不存在就创建它
        var _message = await Messages.create(
            {
                messageId: messageId,
                userId: messageAuthor.id,
                userName: messageAuthor.username,
                upCount: 1
            }
        );
        // 同时把它写入集合
        messages.set(messageId, _message);
        return _message;
    }
}
// 减少计数
async function upCountReduce(messageId) {
    // 通过get函数从集合messages中找到符合messageId的值，赋给message
    var message = messages.get(messageId);
    // 如果message 在集合中存在
    if (message) {
        message.upCount -= 1;
        return message.save();
    }
}

client.once(Events.ClientReady, async () => {
    // 等待数据库检查校对完毕
    await checkDatabase();
    // 机器人登录信息
    console.log(`Logged in as ${client.user.tag}!`);
});

// 监听用户添加反应
client.on(Events.MessageReactionAdd, async (reaction, user) => {
	if (reaction.message.partial) {
		try {
			await reaction.message.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message: ', error);
		}
	}
	if (reaction.emoji.name == "👍" && reaction.message.channelId == "xxx") { //限制频道，限制反应
		var messageId = reaction.message.id;
		var messageAuthor = reaction.message.author;
		upCountAdd(messageId, messageAuthor);//增加计数
		console.log(`${user.username} reacted with "${reaction.emoji.name}" for MessageID--"${reaction.message.id}"`);
	}
});

// 监听用户移除反应
client.on(Events.MessageReactionRemove, async (reaction, user) => {
	if (reaction.message.partial) {
		try {
			await reaction.message.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message: ', error);
		}
	}
	if (reaction.emoji.name == "👍" && reaction.message.channelId == "xxx") { //限制频道，限制反应
		var messageId = reaction.message.id;
		upCountReduce(messageId);//减少计数
		console.log(`${user.username} removed their "${reaction.emoji.name}" reaction for MessageID--"${reaction.message.id}"`);
	}
});

// 比较函数
function compare(count){
    return function(messageA,messageB){
        var a = messageA[count];
        var b = messageB[count];
        return b - a;
    }
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'get-ranks') {
        // 查看使用命令的用户的角色信息
        if (interaction.member._roles.includes('xxx')) { //限定为mod 身份组
            //查询排序列表
            var messageList = messages.sort(compare("upCount"));
            //这里的集合问题还需考虑！
            console.log(messageList.size);
            if (messageList.size > 10) {
                var submessageList = new Collection();
                var i = 1;
                messageList.forEach(b => {
                    submessageList.set(b.messageId, b);
                    i++;
                    if(i>10){
                        return;
                    }
                });
                return interaction.reply(codeBlock(submessageList.map(message => `Id: ${message.messageId}, ${message.userName}, 👍 ${message.upCount} `).join('\n')));
            } else {
                return interaction.reply(codeBlock(messageList.map(message => `Id: ${message.messageId}, ${message.userName}, 👍 ${message.upCount}`).join('\n')));
            }
        }else{
            return interaction.reply(`暂时没有权限使用，请联系管理员！`);
        }
    }
});

client.login(token);
