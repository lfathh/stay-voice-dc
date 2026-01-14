const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, VoiceConnectionStatus, enterState } = require("@discordjs/voice");

const client = new Client({ 
    checkUpdate: false,
    patchVoice: true // Important for selfbots
});

const config = require(`${process.cwd()}/config.json`);

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await joinVC(client, config);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.member.id === client.user.id && !newState.channelId) {
        console.log('Bot was disconnected from voice, reconnecting...');
        await joinVC(client, config);
    }
});

client.login(config.Token);

async function joinVC(client, config) {
    try {
        const guild = client.guilds.cache.get(config.Guild);
        if (!guild) return console.error(`Guild not found: ${config.Guild}`);
        
        const voiceChannel = guild.channels.cache.get(config.Channel);
        if (!voiceChannel) return console.error(`Channel not found: ${config.Channel}`);
        
        console.log(`Joining: ${voiceChannel.name} in ${guild.name}`);
        
        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('The connection has entered the Ready state - ready to play audio!');
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    enterState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    enterState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
                // Seems to be reconnecting to a new channel
            } catch (error) {
                // Seems to be a real disconnect which should not be recovered from
                console.log('Disconnected, attempting to reconnect...');
                connection.destroy();
                setTimeout(() => joinVC(client, config), 5000);
            }
        });

        connection.on('error', console.error);
    } catch (error) {
        console.error('Error in joinVC:', error);
    }
}

